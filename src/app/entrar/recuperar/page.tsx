import { turnstileSiteKey } from "@/lib/auth";
import { RecuperarForm } from "./recuperar-form";

// Rendered on every request so the captcha key comes from the live environment
export const dynamic = "force-dynamic";

export default function RecuperarPage() {
  return <RecuperarForm turnstileKey={turnstileSiteKey()} />;
}
