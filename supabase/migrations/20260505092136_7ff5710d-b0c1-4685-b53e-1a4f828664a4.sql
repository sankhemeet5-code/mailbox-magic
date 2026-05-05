
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','running','completed');
CREATE TYPE public.email_status AS ENUM ('draft','pending','sent','failed');
CREATE TYPE public.email_log_event AS ENUM ('queued','sent','failed','retried');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (mirror of auth.users for app data; role stored separately)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (NEVER on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

-- SMTP accounts
CREATE TABLE public.smtp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails
CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status public.email_status NOT NULL DEFAULT 'draft',
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_emails_org ON public.emails(org_id);
CREATE INDEX idx_emails_status ON public.emails(status);
CREATE INDEX idx_emails_campaign ON public.emails(campaign_id);

-- Email logs
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  event public.email_log_event NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipient lists
CREATE TABLE public.recipient_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipient_lists ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Organizations policies
CREATE POLICY "orgs_member_select" ON public.organizations FOR SELECT TO authenticated USING (id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs_admin_all" ON public.organizations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- User roles policies
CREATE POLICY "roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SMTP: admin only
CREATE POLICY "smtp_admin_all" ON public.smtp_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "smtp_org_select" ON public.smtp_accounts FOR SELECT TO authenticated USING (org_id = public.current_org_id());

-- Templates: org-scoped
CREATE POLICY "templates_org_select" ON public.templates FOR SELECT TO authenticated USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "templates_insert" ON public.templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND org_id = public.current_org_id());
CREATE POLICY "templates_update" ON public.templates FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "templates_delete" ON public.templates FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Campaigns
CREATE POLICY "campaigns_org_select" ON public.campaigns FOR SELECT TO authenticated USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND org_id = public.current_org_id());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Emails
CREATE POLICY "emails_org_select" ON public.emails FOR SELECT TO authenticated USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "emails_insert" ON public.emails FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND org_id = public.current_org_id());
CREATE POLICY "emails_update" ON public.emails FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "emails_delete" ON public.emails FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Email logs
CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_logs.email_id AND (e.org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin')))
);

-- Recipient lists
CREATE POLICY "recipients_org_select" ON public.recipient_lists FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = recipient_lists.campaign_id AND (c.org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "recipients_insert" ON public.recipient_lists FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = recipient_lists.campaign_id AND c.user_id = auth.uid())
);
CREATE POLICY "recipients_delete" ON public.recipient_lists FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = recipient_lists.campaign_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- Auto-create profile, default org, and 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first;

  INSERT INTO public.organizations (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email,'@',1) || '''s Org'))
    RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, email, org_id) VALUES (NEW.id, NEW.email, new_org_id);

  -- First user becomes admin, others are users
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
