import { Router } from "express";
import { preferenceSchema } from "../../services/preferencesStore";
import { requireAuth } from "../../middleware/auth";
import { findUserById, updateUserLanguage } from "../../services/userStore";

export const userPreferencesRouter = Router();

userPreferencesRouter.get("/preferences", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error("Authentication required") as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const user = await findUserById(userId);
    if (!user) {
      const error = new Error("User not found") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const preference = { preferredLanguage: user.preferredLanguage };
    res.status(200).json({
      success: true,
      data: preference,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

userPreferencesRouter.patch("/preferences", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error("Authentication required") as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const parsed = preferenceSchema.parse(req.body);
    const user = await updateUserLanguage(userId, parsed.preferredLanguage);
    const updatedPreference = { preferredLanguage: user.preferredLanguage };
    res.status(200).json({
      success: true,
      data: updatedPreference,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});
