"use client";

// Asks for confirmation before unfollowing a product, then removes it.
// Used from the product page menu and from the "Mis productos" list.
import { useState } from "react";
import type { Product } from "@/lib/demo-data";
import { useDemo } from "@/lib/store";
import { ConfirmDialog } from "./confirm-dialog";

export function UnfollowDialog({
  product,
  onClose,
  onDone,
}: {
  // Product to unfollow, or null when the dialog is closed
  product: Product | null;
  onClose: () => void;
  // Called after it was removed (e.g. to leave the product page)
  onDone?: () => void;
}) {
  const deleteProduct = useDemo((s) => s.deleteProduct);
  const [busy, setBusy] = useState(false);
  // Keep the last name so the text doesn't go blank during the closing animation
  const [name, setName] = useState("");
  if (product && product.name !== name) setName(product.name);

  const onConfirm = async () => {
    if (!product) return;
    setBusy(true);
    const ok = await deleteProduct(product.id);
    setBusy(false);
    if (!ok) return;
    onClose();
    onDone?.();
  };

  return (
    <ConfirmDialog
      open={!!product}
      title="¿Dejar de seguir este producto?"
      description={
        <>
          Dejarás de seguir <strong className="font-semibold text-text">{name}</strong>. Se borrarán su histórico de precios y su
          alerta, y no se puede deshacer.
        </>
      }
      confirmLabel="Dejar de seguir"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
