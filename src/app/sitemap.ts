import type { MetadataRoute } from "next";

const BASE = "https://nadir.aleixaj.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/entrar", "/privacidad", "/condiciones"].map((path) => ({
    url: BASE + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
