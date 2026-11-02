/**
 * HTML for the transactional emails, in the site's look: paper background, the round logo badge,
 * a white card with a mono eyebrow and a Bricolage heading, moss buttons and a moss footer band.
 * Email clients ignore most CSS, so this is table layout with inline styles; the web fonts load
 * where a client allows it and fall back to system fonts everywhere else.
 * Every value that comes from a customer or the database goes through `esc`.
 */

const c = {
  paper: "#fbf6ec",
  white: "#ffffff",
  ink: "#1f2a14",
  muted: "#5b6650",
  moss: "#4e6424",
  mint: "#d5efe3",
  oat: "#f3ead7",
  line: "#e6e0d0",
  dots: ["#a11a79", "#d6a20e", "#3cae8b", "#9c88ea"],
};

const font = {
  display: "'Bricolage Grotesque', 'Trebuchet MS', Arial, sans-serif",
  body: "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', Courier, monospace",
};

export type EmailLang = "en" | "id";

export type EmailFooter = {
  storeName: string;
  address: string;
  phone: string;
  email: string;
};

const chrome = {
  en: { menu: "Menu", story: "Our story", location: "Location", whatsapp: "WhatsApp" },
  id: { menu: "Menu", story: "Cerita kami", location: "Lokasi", whatsapp: "WhatsApp" },
};

export function esc(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/* Blocks: each returns the HTML for one stacked row inside the card.  */
/* ------------------------------------------------------------------ */

export function paragraph(text: string, { muted = false } = {}) {
  return `<p style="margin:0 0 16px;font-family:${font.body};font-size:16px;line-height:24px;color:${muted ? c.muted : c.ink};">${esc(text)}</p>`;
}

/**
 * The moss button, centered in the card. Built as a table cell so Outlook keeps the fill; the link
 * is a block with a fixed line height, so the label sits in the middle whichever font loads.
 */
export function button(label: string, href: string) {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 24px;">
  <tr><td align="center" bgcolor="${c.moss}" style="border-radius:12px;background:${c.moss};">
    <a href="${esc(href)}" style="display:block;padding:0 32px;font-family:${font.display};font-size:15px;line-height:50px;font-weight:600;letter-spacing:0.5px;text-align:center;color:${c.white};text-decoration:none;text-transform:uppercase;border-radius:12px;mso-line-height-rule:exactly;">${esc(label)}</a>
  </td></tr>
</table>`;
}

/** Mint box for the one thing to copy: a VA number or payment code, with the amount under it. */
export function highlight(label: string, value: string, rows: [string, string][] = []) {
  const extra = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding-top:8px;font-family:${font.body};font-size:14px;line-height:20px;color:${c.muted};">${esc(k)}</td><td align="right" style="padding-top:8px;font-family:${font.body};font-size:14px;line-height:20px;font-weight:700;color:${c.ink};">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr><td bgcolor="${c.mint}" style="background:${c.mint};border-radius:12px;padding:18px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td colspan="2" style="font-family:${font.mono};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(label)}</td></tr>
      <tr><td colspan="2" class="code" style="padding-top:4px;white-space:nowrap;font-family:${font.mono};font-size:24px;line-height:32px;font-weight:700;letter-spacing:1px;color:${c.ink};">${esc(value)}</td></tr>
      ${extra}
    </table>
  </td></tr>
</table>`;
}

export type EmailItem = { qty: number; name: string; detail?: string; price: string };

/** Line items, then the totals; the last total is the bold one. */
export function itemsTable(items: EmailItem[], totals: [string, string][]) {
  const rows = items
    .map(
      (item) => `<tr>
  <td valign="top" style="padding:12px 0;border-bottom:1px solid ${c.line};font-family:${font.body};font-size:15px;line-height:22px;color:${c.ink};">
    <strong style="font-weight:700;">${esc(item.qty)} × ${esc(item.name)}</strong>${item.detail ? `<br><span style="font-size:13px;line-height:20px;color:${c.muted};">${esc(item.detail)}</span>` : ""}
  </td>
  <td valign="top" align="right" style="padding:12px 0 12px 16px;border-bottom:1px solid ${c.line};white-space:nowrap;font-family:${font.body};font-size:15px;line-height:22px;font-weight:600;color:${c.ink};">${esc(item.price)}</td>
</tr>`,
    )
    .join("");
  const sums = totals
    .map(([label, value], i) => {
      const last = i === totals.length - 1;
      const style = last
        ? `padding-top:12px;font-family:${font.display};font-size:18px;line-height:24px;font-weight:700;color:${c.ink};`
        : `padding-top:10px;font-family:${font.body};font-size:14px;line-height:20px;color:${c.muted};`;
      return `<tr><td style="${style}">${esc(label)}</td><td align="right" style="${style}white-space:nowrap;">${esc(value)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  ${rows}
  ${sums}
</table>`;
}

/** Oat box with a small label: where the order goes, or anything else worth keeping in view. */
export function infoBox(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr><td bgcolor="${c.oat}" style="background:${c.oat};border-radius:12px;padding:16px 20px;">
    <p style="margin:0 0 4px;font-family:${font.mono};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(label)}</p>
    <p style="margin:0;font-family:${font.body};font-size:15px;line-height:22px;color:${c.ink};">${esc(value)}</p>
  </td></tr>
</table>`;
}

/** A link written out in full, for clients that strip buttons. */
export function fallbackLink(lead: string, href: string) {
  return `<p style="margin:0;font-family:${font.body};font-size:13px;line-height:20px;color:${c.muted};">${esc(lead)}<br><a href="${esc(href)}" style="color:${c.moss};word-break:break-all;">${esc(href)}</a></p>`;
}

/* ------------------------------------------------------------------ */
/* The page around the blocks.                                          */
/* ------------------------------------------------------------------ */

export function renderEmail({
  lang,
  baseUrl,
  preheader,
  eyebrow,
  title,
  body,
  footer,
  reason,
  unsubscribe,
}: {
  lang: EmailLang;
  /** Absolute site URL ending in "/", for the logo and footer links. */
  baseUrl: string;
  /** The grey preview line inboxes show after the subject. */
  preheader: string;
  eyebrow: string;
  title: string;
  /** Blocks from the helpers above, already HTML. */
  body: string;
  footer: EmailFooter;
  /** Small print under the footer: why this email arrived. */
  reason: string;
  /** Newsletter mail only: the one-click way off the list, under the small print. */
  unsubscribe?: { label: string; href: string };
}) {
  const t = chrome[lang];
  const url = (path: string) => new URL(path, baseUrl).toString();
  const wa = `https://wa.me/${footer.phone.replace(/\D/g, "")}`;
  const dots = c.dots
    .map((color) => `<td style="padding:0 4px;"><div style="width:8px;height:8px;border-radius:4px;background:${color};font-size:0;line-height:0;">&nbsp;</div></td>`)
    .join("");
  const footLink = (label: string, href: string) =>
    `<a href="${esc(href)}" style="color:${c.white};text-decoration:underline;">${esc(label)}</a>`;

  return `<!doctype html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Mono:wght@600;700&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0; padding:0; background:${c.paper}; }
  a { color:${c.moss}; }
  @media (max-width: 600px) {
    .card { padding:28px 22px !important; }
    .title { font-size:26px !important; line-height:30px !important; }
    .foot { padding:24px 22px !important; }
    .code { font-size:19px !important; letter-spacing:0.5px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${c.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.paper}" style="background:${c.paper};">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:12px;">
        <a href="${esc(url("/"))}"><img src="${esc(url("/images/email/logo-badge.png"))}" width="72" height="72" alt="Droolbites" style="display:block;width:72px;height:72px;border:0;"></a>
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${dots}</tr></table>
      </td></tr>
      <tr><td class="card" bgcolor="${c.white}" style="background:${c.white};border-radius:20px;padding:36px 36px 28px;">
        <p style="margin:0 0 10px;font-family:${font.mono};font-size:12px;line-height:18px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(eyebrow)}</p>
        <h1 class="title" style="margin:0 0 20px;font-family:${font.display};font-size:30px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${c.ink};">${esc(title)}</h1>
        ${body}
      </td></tr>
      <tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
      <tr><td class="foot" bgcolor="${c.moss}" style="background:${c.moss};border-radius:20px;padding:28px 36px;">
        <p style="margin:0 0 6px;font-family:${font.display};font-size:20px;line-height:24px;font-weight:700;color:${c.white};">${esc(footer.storeName)}</p>
        <p style="margin:0 0 14px;font-family:${font.body};font-size:14px;line-height:21px;color:${c.mint};">${esc(footer.address)}<br>${esc(t.whatsapp)} <a href="${esc(wa)}" style="color:${c.mint};">${esc(footer.phone)}</a> · <a href="mailto:${esc(footer.email)}" style="color:${c.mint};">${esc(footer.email)}</a></p>
        <p style="margin:0;font-family:${font.mono};font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.5px;color:${c.white};">${footLink(t.menu, url("/menu"))} &nbsp;·&nbsp; ${footLink(t.story, url("/our-story"))} &nbsp;·&nbsp; ${footLink(t.location, url("/location"))}</p>
      </td></tr>
      <tr><td align="center" style="padding:18px 16px 0;font-family:${font.body};font-size:12px;line-height:18px;color:${c.muted};">${esc(reason)}${unsubscribe ? `<br><a href="${esc(unsubscribe.href)}" style="color:${c.muted};text-decoration:underline;">${esc(unsubscribe.label)}</a>` : ""}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
