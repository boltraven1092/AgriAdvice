import { z } from "zod";

export const consultationTextSchema = z.object({
  inputType: z.literal("text"),
  textQuery: z
    .string({ required_error: "textQuery is required" })
    .trim()
    .min(2, "textQuery must be at least 2 characters")
    .max(4000, "textQuery must be less than 4000 characters"),
});

export const consultationAudioHintSchema = z.object({
  inputType: z.literal("audio"),
});

export type ConsultationTextInput = z.infer<typeof consultationTextSchema>;
