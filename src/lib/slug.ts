/**
 * URL slug from a display name: "Matcha Tiramisu" → "matcha-tiramisu".
 * Accents are dropped, anything outside a-z0-9 becomes one hyphen, and the
 * result is cut to `maxLength` without a trailing hyphen.
 */
export function slugify(name: string, { maxLength = 100, fallback = "product" } = {}) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
  return slug || fallback;
}
