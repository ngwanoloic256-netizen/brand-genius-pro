"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  AlertCircle,
  FileWarning,
} from "lucide-react";
import { Button } from "../ui/Button";
import { SvgFrame } from "../SvgFrame";
import type { BrandDirection, CreationMode } from "@/lib/types";
import { NEUTRAL_PERSONALITY, type Personality } from "@/lib/ai/art-direction";
import { PersonalitySliders } from "./PersonalitySliders";

const STEPS = ["Brief", "Logo", "Direction", "Création"] as const;

const STAGES = [
  "Analyse de la marque",
  "Création de la palette",
  "Choix des polices",
  "Dessin du logo",
  "Création des mockups et du kit réseaux sociaux",
] as const;

interface WizardProps {
  mode: CreationMode;
}

export function BrandWizard({ mode }: WizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upgradeHref, setUpgradeHref] = useState<string | null>(null);

  // Step 1 — the brief
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [audience, setAudience] = useState("");
  const [personality, setPersonality] = useState<Personality>(NEUTRAL_PERSONALITY);
  const [personalityOn, setPersonalityOn] = useState(false);

  // Step 2 — imported logo
  const [importedLogo, setImportedLogo] = useState<string | null>(null);
  const [importName, setImportName] = useState<string | null>(null);

  // Step 3 — directions
  const [directions, setDirections] = useState<BrandDirection[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);

  // Step 4 — generation
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);

  const briefValid =
    name.trim().length > 0 &&
    industry.trim().length > 0 &&
    keywords.trim().length >= 3;

  const needsLogoStep = mode !== "guide_only";

  function brief() {
    return {
      name: name.trim(),
      industry: industry.trim(),
      keywords: keywords.trim(),
      audience: audience.trim() || undefined,
      importedLogo: importedLogo ?? undefined,
    };
  }

  /** Only sent when the user actually moved the sliders. */
  function statedPersonality() {
    return personalityOn ? personality : undefined;
  }

  async function loadDirections() {
    setLoadingDirections(true);
    setError(null);
    try {
      const res = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...brief(), personality: statedPersonality() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les directions.");
      setDirections(data.directions);
      setChosen(data.directions[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoadingDirections(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setStage(0);
    setError(null);

    // The pipeline runs server-side in one request, so the stage list is a
    // progress indicator rather than live telemetry. It advances on a timer
    // and only settles once the real response lands.
    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      2200,
    );

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...brief(),
          mode,
          artDirectionId: chosen ?? undefined,
          personality: statedPersonality(),
          mockupCount: 8,
        }),
      });
      const data = await res.json();
      if (res.status === 402 && data.upgrade) setUpgradeHref(data.upgrade);
      if (!res.ok) throw new Error(data.error ?? "La création a échoué.");

      clearInterval(timer);
      setStage(STAGES.length - 1);
      router.push(`/projects/${data.projectId}`);
    } catch (err) {
      clearInterval(timer);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "La création a échoué.");
    }
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (!briefValid) {
        setError("Renseignez le nom, le secteur et ce que défend la marque.");
        return;
      }
      setStep(needsLogoStep ? 1 : 2);
      if (!needsLogoStep) void loadDirections();
      return;
    }
    if (step === 1) {
      if (mode === "import_logo" && !importedLogo) {
        setError("Envoyez un logo SVG, ou revenez en arrière pour en faire créer un.");
        return;
      }
      setStep(2);
      void loadDirections();
      return;
    }
    if (step === 2) {
      setStep(3);
      void generate();
    }
  }

  function back() {
    setError(null);
    if (step === 2 && !needsLogoStep) setStep(0);
    else setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Stepper current={step} />

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-signal/30 bg-signal/5 p-3.5 text-sm text-signal-deep"
        >
          <AlertCircle size={17} className="mt-px shrink-0" />
          <span>
            {error}
            {upgradeHref && (
              <>
                {" "}
                <a href={upgradeHref} className="font-semibold underline">
                  Voir les offres
                </a>
              </>
            )}
          </span>
        </div>
      )}

      <div className="mt-8">
        {step === 0 && (
          <BriefStep
            name={name}
            setName={setName}
            industry={industry}
            setIndustry={setIndustry}
            keywords={keywords}
            setKeywords={setKeywords}
            audience={audience}
            setAudience={setAudience}
            personality={personality}
            setPersonality={setPersonality}
            personalityOn={personalityOn}
            setPersonalityOn={setPersonalityOn}
          />
        )}

        {step === 1 && (
          <LogoStep
            mode={mode}
            importedLogo={importedLogo}
            importName={importName}
            onImport={(svg, filename) => {
              setImportedLogo(svg);
              setImportName(filename);
              setError(null);
            }}
            onError={setError}
          />
        )}

        {step === 2 && (
          <DirectionStep
            directions={directions}
            loading={loadingDirections}
            chosen={chosen}
            onChoose={setChosen}
            onRetry={loadDirections}
          />
        )}

        {step === 3 && <GeneratingStep stage={stage} running={generating} />}
      </div>

      {step < 3 && (
        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft size={16} /> Retour
          </Button>
          <Button
            onClick={next}
            size="lg"
            disabled={
              (step === 0 && !briefValid) ||
              (step === 2 && (loadingDirections || !chosen))
            }
          >
            {step === 2 ? "Créer la charte graphique" : "Continuer"}
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progression">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                  done
                    ? "bg-ink text-bone"
                    : active
                      ? "bg-acid text-white"
                      : "bg-bone-deep text-ink-muted"
                }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`hidden truncate text-[13px] font-semibold sm:block ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`h-px flex-1 ${done ? "bg-ink" : "bg-line"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-ink-muted/70 focus:border-ink";

function BriefStep(props: {
  name: string;
  setName: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  audience: string;
  setAudience: (v: string) => void;
  personality: Personality;
  setPersonality: (v: Personality) => void;
  personalityOn: boolean;
  setPersonalityOn: (v: boolean) => void;
}) {
  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        Parlez-nous de la marque
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        Plus la description est précise, plus le résultat est personnel. Écrivez comme si vous briefiez un graphiste.
      </p>

      <div className="mt-7 grid gap-5">
        <Field label="Nom de la marque">
          <input
            className={INPUT}
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            placeholder="Saveurs de Douala"
            maxLength={80}
            autoFocus
          />
        </Field>

        <Field label="Secteur">
          <input
            className={INPUT}
            value={props.industry}
            onChange={(e) => props.setIndustry(e.target.value)}
            placeholder="Pâtisserie artisanale"
            maxLength={120}
          />
        </Field>

        <Field
          label="Ce que défend la marque"
          hint="Valeurs, personnalité et ce qui la rend unique. Quelques phrases suffisent."
        >
          <textarea
            className={`${INPUT} min-h-28 resize-y leading-relaxed`}
            value={props.keywords}
            onChange={(e) => props.setKeywords(e.target.value)}
            placeholder="Fait maison, ingrédients locaux, gourmandise généreuse, un rendez-vous de quartier plutôt qu’une chaîne"
            maxLength={600}
          />
        </Field>

        <Field label="Public visé" hint="Facultatif, mais cela affine le ton de la marque.">
          <input
            className={INPUT}
            value={props.audience}
            onChange={(e) => props.setAudience(e.target.value)}
            placeholder="Les familles et les jeunes actifs de Douala qui aiment se faire plaisir"
            maxLength={200}
          />
        </Field>

        <PersonalitySliders
          value={props.personality}
          onChange={props.setPersonality}
          enabled={props.personalityOn}
          onToggle={props.setPersonalityOn}
        />
      </div>
    </div>
  );
}

function LogoStep({
  mode,
  importedLogo,
  importName,
  onImport,
  onError,
}: {
  mode: CreationMode;
  importedLogo: string | null;
  importName: string | null;
  onImport: (svg: string, filename: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 400_000) {
      onError("Ce fichier dépasse 400 Ko. Exportez un SVG simplifié et réessayez.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".svg")) {
      onError("Envoyez un fichier SVG. Une image PNG ou JPG ne peut pas être déclinée en versions vectorielles.");
      return;
    }
    const text = await file.text();
    if (!/<svg[\s>]/i.test(text)) {
      onError("Ce fichier ne contient pas de SVG valide.");
      return;
    }
    onImport(text, file.name);
  }

  if (mode === "generate_logo") {
    return (
      <div className="animate-rise">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          Nous dessinons le logo
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          Le logo est créé en vectoriel, puis décliné en cinq versions (couleur, monochrome, inversé, icône seule et horizontal) pour couvrir tous les usages.
        </p>
        <div className="mt-7 rounded-xl border border-line bg-white p-5">
          <p className="text-eyebrow mb-3">Ce que vous obtenez</p>
          <ul className="grid gap-2.5 text-sm text-ink-muted sm:grid-cols-2">
            {[
              "SVG redimensionnable, fond transparent",
              "Exports PNG et PDF",
              "Règles de zone de protection et de taille minimale",
              "Ce qu’il faut faire et éviter",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-positive" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        Envoyez votre logo
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        SVG uniquement : tout le système part du vectoriel, y compris les mockups et la version inversée.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-7 flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-12 transition-colors hover:border-ink hover:bg-bone/60"
      >
        {importedLogo ? (
          <>
            <SvgFrame
              svg={importedLogo}
              className="grid h-24 place-items-center [&>svg]:max-h-24 [&>svg]:max-w-40"
            />
            <span className="text-sm font-semibold">{importName}</span>
            <span className="text-xs text-ink-muted">Cliquez pour remplacer</span>
          </>
        ) : (
          <>
            <span className="grid size-11 place-items-center rounded-full bg-bone-deep text-ink-muted">
              <Upload size={19} />
            </span>
            <span className="text-sm font-semibold">Choisir un fichier SVG</span>
            <span className="text-xs text-ink-muted">Jusqu’à 400 Ko</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <FileWarning size={14} className="mt-px shrink-0" />
        Les scripts, styles et liens externes du fichier sont retirés avant tout affichage.
      </p>
    </div>
  );
}

function DirectionStep({
  directions,
  loading,
  chosen,
  onChoose,
  onRetry,
}: {
  directions: BrandDirection[] | null;
  loading: boolean;
  chosen: string | null;
  onChoose: (id: string) => void;
  onRetry: () => void;
}) {
  if (loading || !directions) {
    return (
      <div className="animate-rise">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          Recherche de directions
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="shimmer h-56 rounded-xl border border-line bg-bone-deep"
            />
          ))}
        </div>
        {!loading && !directions && (
          <Button variant="secondary" className="mt-5" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        Choisissez une direction
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        Chaque aperçu est réel : le même logo avec une autre ambiance de couleurs. Vous pourrez refaire n’importe quelle section ensuite.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {directions.map((direction) => {
          const selected = chosen === direction.id;
          return (
            <button
              key={direction.id}
              type="button"
              onClick={() => onChoose(direction.id)}
              aria-pressed={selected}
              className={`overflow-hidden rounded-xl border-2 bg-white text-left transition-all ${
                selected
                  ? "border-ink shadow-lift"
                  : "border-line hover:border-ink-faint"
              }`}
            >
              <div className="grid h-32 place-items-center bg-bone-deep">
                <SvgFrame
                  svg={direction.logo.svg}
                  className="[&>svg]:max-h-16 [&>svg]:w-auto"
                />
              </div>

              <div className="flex h-6">
                {direction.palette.map((swatch) => (
                  <span
                    key={swatch.name + swatch.hex}
                    className="flex-1"
                    style={{ background: swatch.hex }}
                  />
                ))}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold">{direction.name}</h3>
                  {selected && (
                    <span className="grid size-5 place-items-center rounded-full bg-ink text-bone">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  {direction.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GeneratingStep({
  stage,
  running,
}: {
  stage: number;
  running: boolean;
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : `${d}.`)),
      420,
    );
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="animate-rise py-8">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        Création de l’identité{dots}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        Cela prend en général moins d’une minute. Laissez l’onglet ouvert.
      </p>

      <ol className="mt-8 grid gap-2.5">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                active
                  ? "border-ink bg-white"
                  : done
                    ? "border-line bg-white"
                    : "border-line bg-bone/50"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full ${
                  done
                    ? "bg-positive text-white"
                    : active
                      ? "bg-ink text-bone"
                      : "bg-bone-deep text-ink-muted"
                }`}
              >
                {done ? (
                  <Check size={12} strokeWidth={3} />
                ) : active ? (
                  <Loader2 size={12} className="animate-spin-slow" />
                ) : (
                  <span className="text-[10px] font-bold">{i + 1}</span>
                )}
              </span>
              <span
                className={`text-sm font-medium ${
                  done || active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
