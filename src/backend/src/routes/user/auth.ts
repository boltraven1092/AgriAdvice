import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";

import { config } from "../../config/env";
import { findUserByEmail, findUserById, createUser } from "../../services/userStore";
import { requireAuth } from "../../middleware/auth";

const authPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

function issueToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, config.jwtSecret, { expiresIn: "7d" });
}

export const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const payload = authPayloadSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await createUser(payload.email, passwordHash);
    const token = issueToken(user.id, user.email);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          preferredLanguage: user.preferredLanguage,
        },
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const payload = authPayloadSchema.parse(req.body);
    const user = await findUserByEmail(payload.email);

    if (!user) {
      const error = new Error("Invalid email or password") as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      const error = new Error("Invalid email or password") as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const token = issueToken(user.id, user.email);
    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          preferredLanguage: user.preferredLanguage,
        },
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
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

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});
