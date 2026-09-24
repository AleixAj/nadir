"use client";

import { useRef, useState, type ReactNode } from "react";
import { IconLoader2, IconPhoto, IconTrash } from "@tabler/icons-react";
import { Avatar } from "@/components/app/shell";
import { Button, Card, enter } from "@/components/ui";
import { PRODUCT_LIMIT, type AccountUser } from "@/lib/account-types";
import { authClient } from "@/lib/auth-client";
import { AVATAR_ACCEPT, AVATAR_MAX_FILE_MB, resizeAvatar } from "@/lib/avatar";
import { useDemo } from "@/lib/store";

const inputCls = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-text transition-colors focus:border-brand";

// Profile of a real account: photo, name and email
export function AccountProfile({ account, productCount, signOut }: { account: AccountUser; productCount: number; signOut: ReactNode }) {
  const updateName = useDemo((s) => s.updateName);
  const uploadAvatar = useDemo((s) => s.uploadAvatar);
  const removeAvatar = useDemo((s) => s.removeAvatar);
  const showToast = useDemo((s) => s.showToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be picked again later
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
      showToast("La imagen tiene que ser JPG, PNG o WebP.", "error");
      return;
    }
    if (file.size > AVATAR_MAX_FILE_MB * 1024 * 1024) {
      showToast(`La imagen no puede pesar más de ${AVATAR_MAX_FILE_MB} MB.`, "error");
      return;
    }
    setSavingPhoto(true);
    try {
      await uploadAvatar(await resizeAvatar(file));
    } catch {
      showToast("No hemos podido leer la imagen.", "error");
    }
    setSavingPhoto(false);
  };

  const onRemovePhoto = async () => {
    setSavingPhoto(true);
    await removeAvatar();
    setSavingPhoto(false);
  };

  const onSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    await updateName(name);
    setSavingName(false);
  };

  const nameChanged = name.trim() !== "" && name.trim() !== account.name;
  const loginMethod = account.provider === "google" ? "Entras con Google" : "Entras con email y contraseña";

  return (
    <Card {...enter(1)}>
      <div className="border-b border-border p-4">
        <h2 className="m-0 text-sm font-semibold">Perfil</h2>
      </div>

      {/* Photo */}
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="relative">
          <Avatar name={account.name} image={account.image} size={64} />
          {savingPhoto && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
              <IconLoader2 size={20} className="animate-spin text-white" aria-hidden />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={savingPhoto} onClick={() => fileRef.current?.click()}>
              <IconPhoto size={15} aria-hidden />
              Cambiar foto
            </Button>
            {account.image && (
              <Button variant="ghost" disabled={savingPhoto} onClick={onRemovePhoto}>
                <IconTrash size={15} aria-hidden />
                Quitar
              </Button>
            )}
          </div>
          <span className="text-xs text-text-3">JPG, PNG o WebP, hasta {AVATAR_MAX_FILE_MB} MB. Se recorta en cuadrado.</span>
        </div>
        <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} onChange={onPickFile} className="hidden" />
      </div>

      {/* Name and email */}
      <form onSubmit={onSaveName} className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 border-t border-border p-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
          Nombre
          <span className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputCls + " min-w-0 flex-1"} />
            <Button type="submit" disabled={!nameChanged || savingName}>
              {savingName ? "Guardando…" : "Guardar"}
            </Button>
          </span>
        </label>
        <div className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
          Email
          <span className="flex h-9 items-center truncate text-[13px] font-normal text-text-3">
            {account.email} · {loginMethod}
          </span>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[10px] border-t border-border bg-surface-2 px-4 py-3">
        <span className="text-xs text-text-3">
          Plan gratuito · {productCount} de {PRODUCT_LIMIT} productos
        </span>
        {signOut}
      </div>
    </Card>
  );
}

// Change password (only for accounts created with email)
export function PasswordCard() {
  const showToast = useDemo((s) => s.showToast);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      // Log out any other device that was using the old password
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (error) {
      const wrongPassword = error.code === "INVALID_PASSWORD";
      showToast(wrongPassword ? "La contraseña actual no es correcta." : "No se ha podido cambiar la contraseña.", "error");
      return;
    }
    setCurrent("");
    setNext("");
    showToast("Contraseña cambiada");
  };

  return (
    <Card {...enter(2)}>
      <div className="border-b border-border p-4">
        <h2 className="m-0 text-sm font-semibold">Contraseña</h2>
      </div>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
            Contraseña actual
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-2">
            Nueva contraseña
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={inputCls}
            />
          </label>
        </div>
        <div className="flex justify-end rounded-b-[10px] border-t border-border bg-surface-2 px-4 py-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
