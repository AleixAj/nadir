// Prepares a profile photo in the browser before uploading it:
// crops it to a square from the center and shrinks it to 256x256.

export const AVATAR_MAX_FILE_MB = 5;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export async function resizeAvatar(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - side) / 2;
  const y = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, x, y, side, side, 0, 0, size, size);
  bitmap.close();

  // WebP is smaller, but some browsers (older Safari) can't create it, so fall back to JPEG
  const webp = canvas.toDataURL("image/webp", 0.85);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", 0.85);
}
