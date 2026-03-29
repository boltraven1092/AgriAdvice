import { Router } from "express";

import { requireAuth } from "../../middleware/auth";
import { listConsultationsByUser } from "../../services/consultationStore";

export const userConsultationsRouter = Router();

userConsultationsRouter.get("/consultations", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error("Authentication required") as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const consultations = await listConsultationsByUser(userId);
    res.status(200).json({
      success: true,
      data: consultations,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});
