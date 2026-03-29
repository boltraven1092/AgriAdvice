import { Request, Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config/env";
import { requestConsultationByAudio, requestConsultationByText } from "../services/aiPipelineClient";
import { ApiEnvelope, ConsultationData } from "../types/api";
import { consultationAudioHintSchema, consultationTextSchema } from "../validators/consultation";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxAudioFileSizeBytes,
    files: 1,
  },
  fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const unsupportedTypeError = new Error(
        `Unsupported audio format '${file.mimetype}'. Allowed: ${allowedMimeTypes.join(", ")}`
      ) as Error & { statusCode?: number };
      unsupportedTypeError.statusCode = 400;
      cb(unsupportedTypeError);
      return;
    }

    cb(null, true);
  },
});

const routeSchema = z.object({
  inputType: z.enum(["text", "audio"]),
});

export const consultationRouter = Router();

consultationRouter.post("/consultation", upload.single("audio"), async (req, res, next) => {
  const start = Date.now();

  try {
    const parsedRoute = routeSchema.parse({
      inputType: req.body?.inputType,
    });

    let data: ConsultationData;

    if (parsedRoute.inputType === "text") {
      const parsedText = consultationTextSchema.parse({
        inputType: req.body?.inputType,
        textQuery: req.body?.textQuery,
      });

      data = await requestConsultationByText(parsedText.textQuery);
    } else {
      consultationAudioHintSchema.parse({
        inputType: req.body?.inputType,
      });

      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        const missingAudioError = new Error("audio file is required when inputType is 'audio'") as Error & {
          statusCode?: number;
        };
        missingAudioError.statusCode = 400;
        throw missingAudioError;
      }

      const base64Audio = req.file.buffer.toString("base64");
      data = await requestConsultationByAudio(base64Audio);
    }

    const response: ApiEnvelope<ConsultationData> = {
      success: true,
      data,
      error: null,
    };

    res.status(200).json(response);
    req.log.info(
      {
        event: "CONSULTATION_COMPLETED",
        inputType: parsedRoute.inputType,
        latencyMs: Date.now() - start,
      },
      "Consultation request completed"
    );
  } catch (error) {
    req.log.error(
      {
        event: "CONSULTATION_FAILED",
        latencyMs: Date.now() - start,
      },
      "Consultation request failed"
    );
    next(error);
  }
});
