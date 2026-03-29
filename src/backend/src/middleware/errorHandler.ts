import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { ApiEnvelope } from "../types/api";

export function notFoundHandler(_req: Request, res: Response): void {
  const response: ApiEnvelope<null> = {
    success: false,
    data: null,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  };
  res.status(404).json(response);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  req.log.error({ err }, "Unhandled request error");

  if (err instanceof ZodError) {
    const response: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.flatten(),
      },
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof multer.MulterError) {
    const response: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: {
        code: "UPLOAD_ERROR",
        message: err.message,
      },
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof Error) {
    const knownStatus = (err as Error & { statusCode?: number }).statusCode;
    const knownCode = (err as Error & { errorCode?: string }).errorCode;
    const statusCode = typeof knownStatus === "number" ? knownStatus : 500;
    const response: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: {
        code: knownCode || (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
        message: err.message,
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  const fallback: ApiEnvelope<null> = {
    success: false,
    data: null,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unknown error occurred",
    },
  };
  res.status(500).json(fallback);
}
