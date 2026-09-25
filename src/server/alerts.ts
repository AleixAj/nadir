import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alertEvent, product, user, userSettings } from "@/db/schema";
import { sendEmail } from "./email";
import { priceAlertTemplate } from "./email-templates";

// Saves a price alert and, if the user has email alerts on, emails it.
export async function createAlert(productId: string, priceCents: number, targetCents: number) {
  const [row] = await db
    .select({
      name: product.name,
      store: product.store,
      email: user.email,
      // Email alerts are on unless the user turned them off in Settings
      emailOn: userSettings.emailAlerts,
    })
    .from(product)
    .innerJoin(user, eq(user.id, product.userId))
    .leftJoin(userSettings, eq(userSettings.userId, product.userId))
    .where(eq(product.id, productId));
  if (!row) return;

  let sent = false;
  if (row.emailOn !== false) {
    const email = priceAlertTemplate({ productName: row.name, store: row.store, priceCents, targetCents, productId });
    sent = await sendEmail({ to: row.email, ...email });
  }
  // "channels" shows in the alert history where it was sent
  await db.insert(alertEvent).values({ productId, priceCents, targetCents, channels: sent ? "email" : "" });
}
