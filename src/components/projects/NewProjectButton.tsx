"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PenLine, Upload, Palette, X, Plus, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";

const OPTIONS = [
  {
    mode: "generate_logo",
    icon: PenLine,
    title: "Create a logo",
    detail:
      "Start from the brand name and what it stands for. We draw the mark, then build the whole system around it.",
  },
  {
    mode: "import_logo",
    icon: Upload,
    title: "Import an existing logo",
    detail:
      "Upload the logo you already use. We derive the palette, typography, and usage rules from it.",
  },
  {
    mode: "guide_only",
    icon: Palette,
    title: "Brand guide from scratch",
    detail:
      "No logo yet, and none needed. Get the colour, type, and voice system from the brief alone.",
  },
] as const;

export function NewProjectButton({ label = "New project" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Choose how to start"
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 animate-fade backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-2xl rounded-t-2xl border border-line bg-white p-6 shadow-pop animate-rise sm:rounded-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-eyebrow mb-2">Start a brand</p>
                <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
                  How do you want to begin?
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-bone-deep hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              {OPTIONS.map(({ mode, icon: Icon, title, detail }) => (
                <Link
                  key={mode}
                  href={`/projects/new?mode=${mode}`}
                  className="group flex items-start gap-4 rounded-xl border border-line bg-bone/40 p-4 text-left transition-all hover:border-ink hover:bg-white"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-bone transition-colors group-hover:bg-acid group-hover:text-white">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {title}
                      <ArrowRight
                        size={14}
                        className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                      {detail}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
