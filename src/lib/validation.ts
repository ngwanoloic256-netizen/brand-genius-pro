import { z } from "zod";

/**
 * Request validation for every endpoint that accepts user input.
 *
 * Bounds are deliberately tight: these payloads become prompts sent to a paid
 * model, so oversized input is both a cost and an injection surface.
 */

export const BriefSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(80),
  industry: z.string().trim().min(1, "Sector is required").max(120),
  keywords: z
    .string()
    .trim()
    .min(3, "Describe what the brand stands for")
    .max(600),
  audience: z.string().trim().max(200).optional(),
  /**
   * An imported logo, as an SVG string. Capped well under the storage bucket's
   * own 5 MB limit — a logo that large is not a logo.
   */
  importedLogo: z.string().max(400_000).optional(),
});

export type BriefInput = z.infer<typeof BriefSchema>;

const PersonalitySchema = z.object({
  seriousPlayful: z.number().min(0).max(1),
  classicModern: z.number().min(0).max(1),
  massPremium: z.number().min(0).max(1),
  quietLoud: z.number().min(0).max(1),
});

export const DirectionsSchema = BriefSchema.extend({
  personality: PersonalitySchema.optional(),
});

export const GenerateSchema = BriefSchema.extend({
  personality: PersonalitySchema.optional(),
  artDirectionId: z.string().max(40).optional(),
  mode: z
    .enum(["generate_logo", "import_logo", "guide_only"])
    .default("generate_logo"),
  mockupCount: z.number().int().min(4).max(12).default(8),
});

export const RegenerateSchema = z.object({
  projectId: z.string().min(1).max(64),
  section: z.enum(["palette", "typography", "logo", "mockups"]),
});

/** Turns a ZodError into a single readable sentence for the UI. */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}
