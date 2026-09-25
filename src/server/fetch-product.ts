import "server-only";
import { checkPublicUrl, parseProductPage, storeName, type ProductInfo } from "@/lib/product-page";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export type FetchResult =
  | { ok: true; url: string; store: string; info: ProductInfo }
  | { ok: false; error: string };

// Downloads the HTML. Redirects are followed by hand so every hop gets the SSRF check
async function download(start: URL): Promise<{ html: string; finalUrl: string } | { error: string }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          // Be honest about who we are: a bot reading the page once
          "User-Agent": "Mozilla/5.0 (compatible; NadirBot/1.0; monitor de precios)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9",
        },
      });
    } catch (e) {
      const timeout = e instanceof Error && e.name === "TimeoutError";
      return { error: timeout ? "La tienda ha tardado demasiado en responder." : "No hemos podido conectar con la tienda." };
    }

    // Redirect: check the new address before following it
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { error: "La tienda ha respondido con una redirección vacía." };
      // A broken Location header would make new URL() throw
      let target: string;
      try {
        target = new URL(loc, url).toString();
      } catch {
        return { error: "La tienda ha respondido con una redirección no válida." };
      }
      const next = checkPublicUrl(target);
      if (!next.ok) return { error: next.reason };
      url = next.url;
      continue;
    }
    // These usually mean the store is blocking bots
    if (res.status === 403 || res.status === 429 || res.status === 503) {
      return { error: "Esta tienda no permite leer sus páginas automáticamente." };
    }
    if (!res.ok) return { error: `La tienda ha respondido con un error (${res.status}).` };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return { error: "La dirección no es una página web." };

    const reader = res.body?.getReader();
    if (!reader) return { error: "La página está vacía." };
    const bytes = await readLimited(reader);
    return { html: decodeHtml(bytes, contentType), finalUrl: url.toString() };
  }
  return { error: "Demasiadas redirecciones." };
}

// Reads the body but stops after MAX_BYTES so we never download huge pages
async function readLimited(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});

  // Join all the chunks into one array
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}

// Some older stores use ISO-8859-1 instead of UTF-8, so use the charset from the header
function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // Unknown charset, fall back to UTF-8
    return new TextDecoder().decode(bytes);
  }
}

// Reads a product page and returns its name, image, price and store
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
