"use client";

import { useState } from "react";
import { FileDown, Loader2, RefreshCw, Check, Package } from "lucide-react";
import { Button } from "../ui/Button";
import { exportBrandGuidePdf } from "@/lib/export/pdf";
import { downloadBrandKit } from "@/lib/export/bundle";
import type { BrandGuide } from "@/lib/types";

type State = "idle" | "working" | "done" | "error";

export function ExportBar({
  guide,
  projectId,
}: {
  guide: BrandGuide;
  projectId: string;
}) {
  const [kit, setKit] = useState<State>("idle");
  const [pdf, setPdf] = useState<State>("idle");
  const [step, setStep] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  const busy = kit === "working" || pdf === "working";

  async function run(
    set: (state: State) => void,
    task: () => Promise<void>,
    fallbackMessage: string,
  ) {
    set("working");
    setMessage(null);
    try {
      await task();
      set("done");
      setTimeout(() => set("idle"), 2400);
    } catch (err) {
      set("error");
      setMessage(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setStep("");
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {message && (
        <span role="alert" className="text-[13px] text-signal-deep">
          {message}
        </span>
      )}

      {/*
        The whole kit is the primary action. Everything in it was already
        downloadable, but only one file per click — the finished identity took
        a dozen buttons to leave with.
      */}
      <Button
        size="sm"
        onClick={() =>
          run(
            setKit,
            () => downloadBrandKit(guide, (p) => setStep(p.step)),
            "Could not build the brand kit.",
          )
        }
        disabled={busy}
      >
        {kit === "working" ? (
          <>
            <Loader2 size={15} className="animate-spin-slow" />
            {step || "Building"}
          </>
        ) : kit === "done" ? (
          <>
            <Check size={15} /> Downloaded
          </>
        ) : (
          <>
            <Package size={15} /> Download everything
          </>
        )}
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          run(setPdf, () => exportBrandGuidePdf(guide), "Could not build the PDF.")
        }
        disabled={busy}
      >
        {pdf === "working" ? (
          <>
            <Loader2 size={15} className="animate-spin-slow" /> Building PDF
          </>
        ) : pdf === "done" ? (
          <>
            <Check size={15} /> Downloaded
          </>
        ) : (
          <>
            <FileDown size={15} /> PDF only
          </>
        )}
      </Button>

      <RegenerateButton projectId={projectId} section="mockups" label="Regenerate mockups" />
    </div>
  );
}

export function RegenerateButton({
  projectId,
  section,
  label,
}: {
  projectId: string;
  section: "palette" | "typography" | "logo" | "mockups";
  label: string;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, section }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not regenerate.");
      window.location.reload();
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Could not regenerate.");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span role="alert" className="text-[13px] text-signal-deep">
          {error}
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={regenerate} disabled={working}>
        <RefreshCw
          size={14}
          className={working ? "animate-spin-slow" : undefined}
        />
        {label}
      </Button>
    </span>
  );
}
