"use client";

// Links of the app menu, shared by the desktop sidebar and the mobile bottom bar
import { IconBell, IconBuildingStore, IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { useDemo, useProducts } from "@/lib/store";

export const NAV = [
  { href: "/app", label: "Panel", short: "Panel", icon: IconLayoutDashboard },
  {
    href: "/app/productos",
    label: "Mis productos",
    short: "Productos",
    icon: IconPackage,
  },
  { href: "/app/alertas", label: "Alertas", short: "Alertas", icon: IconBell },
  {
    href: "/app/tiendas",
    label: "Tiendas",
    short: "Tiendas",
    icon: IconBuildingStore,
  },
];

// "/app" only matches itself; other links also match their sub-pages
export const isActive = (path: string, href: string) =>
  href === "/app" ? path === "/app" : path.startsWith(href);

// Number of alerts that are on and not reached yet
export function useActiveAlertCount() {
  const products = useProducts();
  const alerts = useDemo((s) => s.alerts);
  return products.filter((p) => alerts[p.id] && p.alert !== "alcanzado").length;
}
