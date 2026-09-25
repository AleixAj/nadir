// HTML for the emails Nadir sends. Emails need inline styles and simple tables,
// because most email apps ignore <style> tags and modern CSS.

// Read when the email is built: on Cloudflare the env vars only exist during a request
const site = () => process.env.BETTER_AUTH_URL ?? "https://nadir.aleixaj.com";
// Images always come from the live site: email apps can't load them from localhost
const ASSETS = "https://nadir.aleixaj.com";

// Colours: white page, and the logo bar and card in the web's dark theme (see globals.css)
const C = {
  page: "#ffffff",
  bar: "#0f0d0c",
  surface: "#1a1716",
  border: "#2c2724",
  text: "#f5f5f4",
  text2: "#b8b1ab",
  text3: "#948c86",
  footer: "#78716c",
  brand: "#ea580c",
  brandSolid: "#c2410c",
  brandText: "#fb9a5b",
  down: "#4ade80",
};

// Escapes text that comes from users or stores (names, product titles)
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Shared frame on a white page: dark block with the logo bar (orange line under it)
// and the content, and a small footer below
function layout(preheader: string, body: string) {
  const SITE = site();
  const font = "Inter,Segoe UI,-apple-system,Helvetica,Arial,sans-serif";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${font}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};padding:36px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:14px;border-collapse:separate;overflow:hidden">
        <tr><td bgcolor="${C.bar}" style="background:${C.bar};padding:18px 32px;border-bottom:3px solid ${C.brand};border-radius:13px 13px 0 0">
          <img src="${ASSETS}/logo-64.png" width="30" height="30" alt="Nadir" style="vertical-align:middle;border-radius:7px;border:0">
          <span style="vertical-align:middle;font-size:18px;font-weight:700;letter-spacing:-0.02em;margin-left:9px;color:${C.text}">nadir</span>
        </td></tr>
        <tr><td bgcolor="${C.surface}" style="background:${C.surface};padding:32px;border-radius:0 0 13px 13px;color:${C.text}">${body}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 4px;font-size:12px;line-height:1.5;color:${C.footer}">
      Nadir · compra en el punto más bajo · <a href="${SITE}" style="color:${C.brandSolid};text-decoration:none">${SITE.replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function button(url: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.brandSolid}" style="border-radius:9px;background:${C.brandSolid};background-image:linear-gradient(180deg,${C.brand},${C.brandSolid})">
<a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:9px">${label}</a>
</td></tr></table>`;
}

const h1 = (t: string) => `<h1 style="margin:0 0 12px;font-size:23px;line-height:1.3;letter-spacing:-0.02em;color:${C.text}">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${C.text2}">${t}</p>`;
const small = (t: string) => `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${C.text3}">${t}</p>`;
const strong = (t: string) => `<strong style="color:${C.text}">${t}</strong>`;

export function verifyEmailTemplate(name: string, url: string) {
  return {
    subject: "Confirma tu email para entrar en Nadir",
    html: layout(
      "Confirma tu email para activar tu cuenta.",
      h1(`Hola, ${esc(name)}`) +
        p("Para terminar de crear tu cuenta en Nadir, confirma que este email es tuyo.") +
        button(url, "Confirmar mi email") +
        small("El enlace caduca en 1 hora. Si no has creado una cuenta en Nadir, ignora este email."),
    ),
    text: `Hola, ${name}\n\nPara terminar de crear tu cuenta en Nadir, confirma tu email en este enlace (caduca en 1 hora):\n${url}\n\nSi no has creado una cuenta, ignora este email.`,
  };
}

export function resetPasswordTemplate(name: string, url: string) {
  return {
    subject: "Cambia tu contraseña de Nadir",
    html: layout(
      "Enlace para elegir una contraseña nueva.",
      h1(`Hola, ${esc(name)}`) +
        p("Has pedido cambiar la contraseña de tu cuenta de Nadir. Pulsa el botón para elegir una nueva.") +
        button(url, "Elegir una contraseña nueva") +
        small("El enlace caduca en 1 hora. Si no lo has pedido tú, ignora este email: tu contraseña no cambiará."),
    ),
    text: `Hola, ${name}\n\nPara elegir una contraseña nueva para Nadir, entra en este enlace (caduca en 1 hora):\n${url}\n\nSi no lo has pedido tú, ignora este email.`,
  };
}

const euros = (cents: number) => (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function priceAlertTemplate(a: { productName: string; store: string; priceCents: number; targetCents: number; productId: string }) {
  const url = `${site()}/app/productos/${a.productId}`;
  const price = euros(a.priceCents);
  const target = euros(a.targetCents);
  return {
    subject: `${a.productName} ha bajado a ${price}`,
    html: layout(
      `Ya está por debajo de tu objetivo de ${target}.`,
      `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${C.down}">Tu precio objetivo se ha cumplido</p>` +
        h1(`${esc(a.productName)} ha bajado a ${price}`) +
        p(`Ahora cuesta ${strong(price)} en ${esc(a.store)}, por debajo del objetivo que marcaste (${target}).`) +
        button(url, "Ver el producto") +
        small("Recibes este email porque tienes activados los avisos por email en Nadir. Puedes desactivarlos en Ajustes."),
    ),
    text: `${a.productName} ha bajado a ${price} en ${a.store}, por debajo de tu objetivo de ${target}.\n\nVer el producto: ${url}\n\nPuedes desactivar los avisos por email en Ajustes.`,
  };
}
