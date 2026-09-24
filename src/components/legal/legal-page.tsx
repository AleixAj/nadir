import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

/** Simple layout for the legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex h-[60px] max-w-[760px] items-center px-4 desk:px-8">
          <Link href="/" aria-label="Nadir, inicio" className="text-text">
            <Logo size={24} text={17} />
          </Link>
        </div>
      </header>
      <main className="enter mx-auto max-w-[760px] px-4 py-10 desk:px-8 desk:py-14">
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 mb-8 text-sm text-text-3">Última actualización: {updated}</p>
        {/* Styles for the plain HTML inside (headings, lists, links) */}
        <div className="flex flex-col gap-6 text-[15px] leading-[1.7] text-text-2 [&_a]:text-brand-text [&_a]:underline [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_p]:m-0 [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
