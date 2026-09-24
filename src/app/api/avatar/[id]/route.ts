import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userAvatar } from "@/db/schema";

// Serves the profile photo a user uploaded
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(userAvatar).where(eq(userAvatar.userId, id));
  if (!row) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(row.data, "base64"), {
    headers: {
      "Content-Type": row.contentType,
      // The URL has "?v=" with the upload time, so it can be cached for a long time
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
