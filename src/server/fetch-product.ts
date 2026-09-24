import "server-only";
import { checkPublicUrl, parseProductPage, storeName, type ProductInfo } from "@/lib/product-page";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export type FetchResult =
  | { ok: true; url: string; store: string; info: ProductInfo }
  | { ok: false; error: string };

/** Descarga el HTML siguiendo redirecciones a mano, para validar cada salto. */
async function download(start: URL): Promise<{ html: string; finalUrl: string } | { error: string }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          // Nos identificamos como lo que somos: un bot que lee la página una vez
          "User-Agent": "Mozilla/5.0 (compatible; NadirBot/1.0; monitor de precios)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9",
        },
      });
    } catch (e) {
      const timeout = e instanceof Error && e.name === "TimeoutError";
      return { error: timeout ? "La tienda ha tardado demasiado en responder." : "No hemos podido conectar con la tienda." };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { error: "La tienda ha respondido con una redirección vacía." };
      const next = checkPublicUrl(new URL(loc, url).toString());
      if (!next.ok) return { error: next.reason };
      url = next.url;
      continue;
    }
    if (res.status === 403 || res.status === 429 || res.status === 503) {
      return { error: "Esta tienda no permite leer sus páginas automáticamente." };
    }
    if (!res.ok) return { error: `La tienda ha respondido con un error (${res.status}).` };
    if (!(res.headers.get("content-type") ?? "").includes("html")) return { error: "La dirección no es una página web." };

    // Lee como mucho MAX_BYTES para no descargar páginas enormes
    const reader = res.body?.getReader();
    if (!reader) return { error: "La página está vacía." };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    // Algunas tiendas antiguas usan ISO-8859-1 en vez de UTF-8
    const charset = /charset=([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1] ?? "utf-8";
    let html: string;
    try {
      html = new TextDecoder(charset).decode(bytes);
    } catch {
      html = new TextDecoder().decode(bytes);
    }
    return { html, finalUrl: url.toString() };
  }
  return { error: "Demasiadas redirecciones." };
}

/** Lee la página de un producto y devuelve su nombre, foto, precio y tienda. */
export async function fetchProduct(input: string): Promise<FetchResult> {
  const check = checkPublicUrl(input);
  if (!check.ok) return { ok: false, error: check.reason };

  const page = await download(check.url);
  if ("error" in page) return { ok: false, error: page.error };

  const info = parseProductPage(page.html, page.finalUrl);
  if (!info) {
    return { ok: false, error: "No encontramos el nombre y el precio en esta página. ¿Es la página de un producto concreto?" };
  }
  return { ok: true, url: check.url.toString(), store: storeName(page.finalUrl), info };
}
