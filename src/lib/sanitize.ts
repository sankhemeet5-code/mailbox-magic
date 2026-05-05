/**
 * sanitizeHtml — strip dangerous tags/attributes from user-supplied HTML.
 * applyPlaceholders — replace {{key}} tokens with row values.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "hr",
  "div",
  "span",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "img",
  "pre",
  "code",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
  "*": new Set(["class", "style"]),
};

const URL_ATTRS = new Set(["href", "src"]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(attr: string, value: string): boolean {
  if (!URL_ATTRS.has(attr)) return true;
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("#")
  );
}

/**
 * Very small sanitizer: walks the HTML string via regex, keeps allowed tags
 * and attributes, drops everything else (scripts, event handlers, etc.).
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return "";

  // Remove script/style tags and their content entirely
  let html = raw.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed[\s\S]*?<\/embed>/gi, "");
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "");

  // Remove event handler attributes
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Process tags
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName) => {
    const tag = tagName.toLowerCase();

    // Closing tag
    if (match.startsWith("</")) {
      return ALLOWED_TAGS.has(tag) ? match : "";
    }

    // Self-closing or opening tag
    if (!ALLOWED_TAGS.has(tag)) return "";

    // Filter attributes
    const allowedForTag = ALLOWED_ATTRS[tag] || new Set();
    const globalAllowed = ALLOWED_ATTRS["*"] || new Set();

    return match.replace(
      /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
      (attrMatch, attrName, doubleVal, singleVal) => {
        const attr = attrName.toLowerCase();
        const value = doubleVal ?? singleVal ?? "";

        if (!allowedForTag.has(attr) && !globalAllowed.has(attr)) return "";
        if (!isSafeUrl(attr, value)) return "";

        return attrMatch;
      },
    );
  });

  return html;
}

/**
 * Replace {{key}} placeholders in a string with values from the data object.
 * Keys are case-insensitive — {{Name}} and {{name}} both match data["name"].
 */
export function applyPlaceholders(template: string, data: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const lk = key.toLowerCase();
    // Try exact match first, then case-insensitive
    if (data[key] !== undefined) return escapeHtml(data[key]);
    const ciKey = Object.keys(data).find((k) => k.toLowerCase() === lk);
    if (ciKey && data[ciKey] !== undefined) return escapeHtml(data[ciKey]);
    return `{{${key}}}`;
  });
}
