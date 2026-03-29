import pino from "pino";
import { config } from "./env";

export const logger = pino({
  level: config.isProduction ? "info" : "debug",
  redact: {
    // Never log raw binary/audio payloads or authorization tokens.
    paths: [
      "req.headers.authorization",
      "req.body.audio_base64",
      "req.body.audio",
      "response.data.audio.content",
    ],
    remove: true,
  },
  transport: config.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});
