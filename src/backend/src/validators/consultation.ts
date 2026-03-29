import { z } from "zod";
import { SUPPORTED_LANGUAGE_CODES } from "../config/languages";

export const consultationTextSchema = z.object({
  inputType: z.literal("text"),
  preferredLanguage: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
  textQuery: z
    .string({ required_error: "textQuery is required" })
    .trim()
    .min(2, "textQuery must be at least 2 characters")
    .max(4000, "textQuery must be less than 4000 characters"),
});

export const consultationAudioHintSchema = z.object({
  inputType: z.literal("audio"),
  preferredLanguage: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
});

export type ConsultationTextInput = z.infer<typeof consultationTextSchema>;
