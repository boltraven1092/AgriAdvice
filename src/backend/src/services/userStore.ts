import { randomUUID } from "node:crypto";

import { readJsonFile, writeJsonFile } from "./fileStore";
import { config } from "../config/env";
import type { SupportedLanguageCode } from "../config/languages";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  preferredLanguage: SupportedLanguageCode;
  createdAt: string;
};

type UserStoreShape = {
  users: UserRecord[];
};

const fallbackStore: UserStoreShape = { users: [] };

async function loadStore(): Promise<UserStoreShape> {
  return readJsonFile<UserStoreShape>(config.usersStorePath, fallbackStore);
}

async function saveStore(payload: UserStoreShape): Promise<void> {
  await writeJsonFile(config.usersStorePath, payload);
}

export async function createUser(email: string, passwordHash: string): Promise<UserRecord> {
  const store = await loadStore();
  const normalizedEmail = email.toLowerCase().trim();

  const exists = store.users.some((user) => user.email === normalizedEmail);
  if (exists) {
    const error = new Error("User already exists") as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  const createdUser: UserRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash,
    preferredLanguage: "hi",
    createdAt: new Date().toISOString(),
  };

  store.users.push(createdUser);
  await saveStore(store);
  return createdUser;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const store = await loadStore();
  const normalizedEmail = email.toLowerCase().trim();
  return store.users.find((user) => user.email === normalizedEmail);
}

export async function findUserById(userId: string): Promise<UserRecord | undefined> {
  const store = await loadStore();
  return store.users.find((user) => user.id === userId);
}

export async function updateUserLanguage(userId: string, language: SupportedLanguageCode): Promise<UserRecord> {
  const store = await loadStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    const error = new Error("User not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  user.preferredLanguage = language;
  await saveStore(store);
  return user;
}
