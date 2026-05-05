import DOMPurify from "dompurify";

// Browser-only DOMPurify is fine; we sanitize before send and on display.
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html; // SSR pass-through; server route also sanitizes inputs at trust boundaries
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function applyPlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in data ? data[k] : `{{${k}}}`));
}