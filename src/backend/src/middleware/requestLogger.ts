import pinoHttp from "pino-http";
import { logger } from "../config/logger";

export const requestLogger = pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
  customSuccessMessage(req, res, responseTime) {
    return `${req.method} ${req.url} completed with ${res.statusCode} in ${responseTime}ms`;
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  },
});
