import { describe, expect, it } from "vitest";
import { cleanName } from "../names";

describe("cleanName", () => {
  it("keeps normal names", () => {
    expect(cleanName("  Aleix   Auqué ")).toBe("Aleix Auqué");
    expect(cleanName("María José O'Neill")).toBe("María José O'Neill");
  });
  it("removes links and domains", () => {
    expect(cleanName("Gana dinero en https://spam.example/x")).toBe("Gana dinero en");
    expect(cleanName("visita www.spam.com ya")).toBe("visita ya");
    expect(cleanName("oferta spam-site.xyz")).toBe("oferta");
  });
  it("removes HTML characters and limits the length", () => {
    expect(cleanName('<b>"Hola"</b>')).toBe("bHola/b");
    expect(cleanName("a".repeat(100))).toHaveLength(60);
  });
  it("never returns an empty name", () => {
    expect(cleanName("https://spam.com")).toBe("Usuario");
  });
});
