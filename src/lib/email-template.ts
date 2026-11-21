/**
 * Every email the store sends, in the site's look: paper background, the round logo badge, a white
 * card with a mono eyebrow and a Bricolage heading, one moss button and a small moss footer.
 *
 * One shape for all of them, so they read as one system:
 *   eyebrow (what it's about: "Order DB-0012")  ·  title (what happened)  ·  intro ("Hi Rafi, …")
 *   ·  the blocks for this moment  ·  one button  ·  anything after it (a summary, a note)
 *   ·  footer (store, address, contact)  ·  why this email arrived.
 * `renderEmail` builds the HTML and the plain-text part from the same blocks.
 *
 * Email clients ignore most CSS, so this is table layout with inline styles; the web fonts load
 * where a client allows it and fall back to web-safe fonts everywhere else.
 * Every value that comes from a customer or the database goes through `esc`.
 */

/** DESIGN.md color tokens. */
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

export function esc(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped, with line breaks kept. */
const escLines = (value: string) => esc(value).replace(/\n/g, "<br>");

/* ------------------------------------------------------------------ */
/* Blocks                                                               */
/* ------------------------------------------------------------------ */

export type Row = [string, string];
export type EmailItem = { qty: number; name: string; detail?: string; price: string };
/** A label / value fact. `href` makes the value a link; `text` is what the plain-text part shows instead. */
export type Fact = { label: string; value: string; href?: string; text?: string };

export type Block =
  /** A sentence. `muted` for the small print that follows the main point. */
  | { kind: "p"; text: string; muted?: boolean }
  /** Mint box: the one thing to act on (a VA number, the amount, the refund), rows under it. */
  | { kind: "key"; label: string; value: string; rows?: Row[]; note?: string }
  /** Oat box of label / value facts: where it goes, where to pick it up, who ordered. */
  | { kind: "facts"; facts: Fact[] }
  /** A short numbered list (how to pay). */
  | { kind: "steps"; steps: string[] }
  /** Order summary: items, then the totals; the last total is the bold one. */
  | { kind: "summary"; items: EmailItem[]; totals: Row[] }
  /** An underlined text link (the receipt), for a second destination that isn't the main action. */
  | { kind: "link"; label: string; href: string };

const gap = "margin:0 0 24px;";

function blockHtml(block: Block): string {
  switch (block.kind) {
    case "p":
      return block.muted
        ? `<p style="margin:0 0 16px;font-family:${font.body};font-size:14px;line-height:21px;color:${c.muted};">${esc(block.text)}</p>`
        : `<p style="margin:0 0 16px;font-family:${font.body};font-size:16px;line-height:24px;color:${c.ink};">${esc(block.text)}</p>`;

    case "key": {
      const rows = (block.rows ?? [])
        .map(
          ([k, v], i) =>
            `<tr><td valign="top" style="padding-top:${i === 0 ? 14 : 6}px;font-family:${font.body};font-size:14px;line-height:20px;color:${c.muted};">${esc(k)}</td><td valign="top" align="right" style="padding:${i === 0 ? 14 : 6}px 0 0 12px;white-space:nowrap;font-family:${font.body};font-size:14px;line-height:20px;font-weight:700;color:${c.ink};">${esc(v)}</td></tr>`,
        )
        .join("");
      const note = block.note
        ? `<tr><td colspan="2" style="padding-top:8px;font-family:${font.body};font-size:13px;line-height:19px;color:${c.muted};">${esc(block.note)}</td></tr>`
        : "";
      // No nowrap on the value: a long VA number may break between its groups on a narrow phone
      // rather than push the card wider than the screen.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${gap}">
  <tr><td bgcolor="${c.mint}" style="background:${c.mint};border-radius:12px;padding:18px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td colspan="2" style="font-family:${font.mono};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(block.label)}</td></tr>
      <tr><td colspan="2" class="key" style="padding-top:4px;font-family:${font.mono};font-size:22px;line-height:30px;font-weight:700;letter-spacing:0.5px;color:${c.ink};">${esc(block.value)}</td></tr>
      ${rows}${note}
    </table>
  </td></tr>
</table>`;
    }

    case "facts": {
      const facts = block.facts
        .map((f, i) => {
          const value = f.href
            ? `<a href="${esc(f.href)}" style="color:${c.moss};font-weight:600;text-decoration:underline;">${escLines(f.value)}</a>`
            : escLines(f.value);
          return `<tr><td style="padding-top:${i === 0 ? 0 : 14}px;">
      <p style="margin:0 0 2px;font-family:${font.mono};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(f.label)}</p>
      <p style="margin:0;font-family:${font.body};font-size:15px;line-height:22px;color:${c.ink};overflow-wrap:anywhere;word-break:break-word;">${value}</p>
    </td></tr>`;
        })
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${gap}">
  <tr><td bgcolor="${c.oat}" style="background:${c.oat};border-radius:12px;padding:16px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${facts}</table>
  </td></tr>
</table>`;
    }

    case "steps": {
      const rows = block.steps
        .map(
          (step, i) =>
            `<tr><td valign="top" width="24" style="padding-top:${i === 0 ? 0 : 6}px;font-family:${font.mono};font-size:13px;line-height:21px;font-weight:600;color:${c.moss};">${i + 1}.</td><td valign="top" style="padding-top:${i === 0 ? 0 : 6}px;font-family:${font.body};font-size:14px;line-height:21px;color:${c.ink};">${esc(step)}</td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${gap}">${rows}</table>`;
    }

    case "summary": {
      const items = block.items
        .map(
          (item, i) => `<tr>
  <td valign="top" style="padding:${i === 0 ? 14 : 10}px 0 0;font-family:${font.body};font-size:15px;line-height:22px;color:${c.ink};">${esc(item.qty)} × ${esc(item.name)}${item.detail ? `<br><span style="font-size:13px;line-height:18px;color:${c.muted};">${esc(item.detail)}</span>` : ""}</td>
  <td valign="top" align="right" style="padding:${i === 0 ? 14 : 10}px 0 0 16px;white-space:nowrap;font-family:${font.body};font-size:15px;line-height:22px;color:${c.ink};">${esc(item.price)}</td>
</tr>`,
        )
        .join("");
      const totals = block.totals
        .map(([label, value], i) => {
          const first = i === 0;
          const last = i === block.totals.length - 1;
          const border = first ? `border-top:1px solid ${c.line};` : "";
          const pad = first ? 14 : last ? 10 : 6;
          const style = last
            ? `font-family:${font.display};font-size:17px;line-height:24px;font-weight:700;color:${c.ink};`
            : `font-family:${font.body};font-size:14px;line-height:20px;color:${c.muted};`;
          return `<tr><td style="${border}padding-top:${pad}px;${style}">${esc(label)}</td><td align="right" style="${border}padding:${pad}px 0 0 16px;white-space:nowrap;${style}">${esc(value)}</td></tr>`;
        })
        .join("");
      const spacer = `<tr><td colspan="2" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${gap}border-top:1px solid ${c.line};">
  ${items}
  ${spacer}
  ${totals}
</table>`;
    }

    case "link":
      return `<p style="margin:0 0 24px;font-family:${font.display};font-size:15px;line-height:22px;font-weight:600;"><a href="${esc(block.href)}" style="color:${c.moss};text-decoration:underline;">${esc(block.label)}</a></p>`;
  }
}

function blockText(block: Block): string {
  switch (block.kind) {
    case "p":
      return block.text;
    case "key":
      return [`${block.label}: ${block.value}`, ...(block.rows ?? []).map(([k, v]) => `${k}: ${v}`), ...(block.note ? [block.note] : [])].join("\n");
    case "facts":
      return block.facts.map((f) => `${f.label}: ${(f.text ?? f.value).replace(/\n/g, ", ")}`).join("\n");
    case "steps":
      return block.steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
    case "summary":
      return [
        ...block.items.map((i) => `${i.qty} × ${i.name}${i.detail ? ` (${i.detail})` : ""}  ${i.price}`),
        "",
        ...block.totals.map(([k, v]) => `${k}: ${v}`),
      ].join("\n");
    case "link":
      return `${block.label}: ${block.href}`;
  }
}

/**
 * The moss button (DESIGN.md: 12px radius, Bricolage 600 15px, 0.5px tracking, uppercase label).
 * Left-aligned with the text; full width on phones (480px and narrower). A table cell so Outlook keeps the fill; the
 * link is a padded block (50px tall on one line), so a long label that wraps on a narrow phone
 * stays a compact two-line button.
 */
function buttonHtml(label: string, href: string) {
  return `<table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td align="center" bgcolor="${c.moss}" style="border-radius:12px;background:${c.moss};">
    <a href="${esc(href)}" style="display:block;padding:14px 28px;font-family:${font.display};font-size:15px;line-height:22px;font-weight:600;letter-spacing:0.5px;text-align:center;color:${c.white};text-decoration:none;text-transform:uppercase;border-radius:12px;mso-line-height-rule:exactly;">${esc(label)}</a>
  </td></tr>
</table>`;
}

/** "VIEW ORDER" → "View order", for the plain-text part. */
const sentenceCase = (label: string) => label.charAt(0) + label.slice(1).toLowerCase();

/* ------------------------------------------------------------------ */
/* The page around the blocks, and the plain-text part.                */
/* ------------------------------------------------------------------ */

/** A finished email: what sendMail needs besides the address. */
export type Mail = { subject: string; text: string; html: string };

export type EmailContent = {
  lang: EmailLang;
  /** Absolute site URL ending in "/", for the logo. */
  baseUrl: string;
  /** The grey preview line inboxes show after the subject. */
  preheader: string;
  /** What it's about, sentence case ("Order DB-0012"); shown uppercase. */
  eyebrow: string;
  /** What happened. */
  title: string;
  /** The first sentence: greeting and what happened, or what to do now. */
  intro: string;
  /** What the reader needs for this moment, above the button. */
  blocks?: Block[];
  /** The one button. */
  action: { label: string; href: string };
  /** Under the button: the order summary, the receipt link, the small print about a link. */
  after?: Block[];
  footer: EmailFooter;
  /** Small print under the footer: why this email arrived. */
  reason: string;
  /** Newsletter mail only: the one-click way off the list, under the small print. */
  unsubscribe?: { label: string; href: string };
};

const whatsappLabel = "WhatsApp";

export function renderEmail(m: EmailContent): { html: string; text: string } {
  return { html: emailHtml(m), text: emailText(m) };
}

function emailText(m: EmailContent) {
  const f = m.footer;
  return [
    m.eyebrow,
    m.title,
    "",
    m.intro,
    ...(m.blocks ?? []).flatMap((b) => ["", blockText(b)]),
    "",
    `${sentenceCase(m.action.label)}: ${m.action.href}`,
    ...(m.after ?? []).flatMap((b) => ["", blockText(b)]),
    "",
    "--",
    f.storeName,
    f.address,
    `${whatsappLabel} ${f.phone} · ${f.email}`,
    "",
    m.reason,
    ...(m.unsubscribe ? [`${m.unsubscribe.label}: ${m.unsubscribe.href}`] : []),
  ].join("\n");
}

function emailHtml(m: EmailContent) {
  const url = (path: string) => new URL(path, m.baseUrl).toString();
  const f = m.footer;
  const wa = `https://wa.me/${f.phone.replace(/\D/g, "")}`;
  const dots = c.dots
    .map((color) => `<td style="padding:0 4px;"><div style="width:8px;height:8px;border-radius:4px;background:${color};font-size:0;line-height:0;">&nbsp;</div></td>`)
    .join("");
  const body = [...(m.blocks ?? []).map(blockHtml), buttonHtml(m.action.label, m.action.href), ...(m.after ?? []).map(blockHtml)].join("\n");

  return `<!doctype html>
<html lang="${m.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(m.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Mono:wght@600;700&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0; padding:0; background:${c.paper}; }
  a { color:${c.moss}; }
  @media (max-width: 600px) {
    .card { padding:28px 20px 4px !important; }
    .title { font-size:26px !important; line-height:30px !important; }
    .foot { padding:20px !important; }
    .key { font-size:19px !important; line-height:27px !important; }
  }
  @media (max-width: 480px) {
    .btn { width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${c.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(m.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.paper}" style="background:${c.paper};">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td align="center" style="padding-bottom:12px;">
        <a href="${esc(url("/"))}"><img src="${esc(url("/images/email/logo-badge.png"))}" width="72" height="72" alt="Droolbites" style="display:block;width:72px;height:72px;border:0;"></a>
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${dots}</tr></table>
      </td></tr>
      <tr><td class="card" bgcolor="${c.white}" style="background:${c.white};border-radius:20px;padding:36px 36px 12px;">
        <p style="margin:0 0 10px;font-family:${font.mono};font-size:12px;line-height:18px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${c.moss};">${esc(m.eyebrow)}</p>
        <h1 class="title" style="margin:0 0 16px;font-family:${font.display};font-size:30px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${c.ink};">${esc(m.title)}</h1>
        <p style="margin:0 0 16px;font-family:${font.body};font-size:16px;line-height:24px;color:${c.ink};">${esc(m.intro)}</p>
        ${body}
      </td></tr>
      <tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
      <tr><td class="foot" bgcolor="${c.moss}" style="background:${c.moss};border-radius:20px;padding:24px 36px;">
        <p style="margin:0 0 4px;font-family:${font.display};font-size:18px;line-height:24px;font-weight:700;color:${c.white};">${esc(f.storeName)}</p>
        <p style="margin:0;font-family:${font.body};font-size:13px;line-height:20px;color:${c.mint};">${esc(f.address)}<br>${whatsappLabel} <a href="${esc(wa)}" style="color:${c.mint};">${esc(f.phone)}</a> · <a href="mailto:${esc(f.email)}" style="color:${c.mint};">${esc(f.email)}</a></p>
      </td></tr>
      <tr><td align="center" style="padding:16px 16px 0;font-family:${font.body};font-size:12px;line-height:18px;color:${c.muted};">${esc(m.reason)}${m.unsubscribe ? `<br><a href="${esc(m.unsubscribe.href)}" style="color:${c.muted};text-decoration:underline;">${esc(m.unsubscribe.label)}</a>` : ""}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
