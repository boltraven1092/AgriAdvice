import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";
import { config } from "../config/env";
import { SUPPORTED_LANGUAGE_CODES } from "../config/languages";

const preferenceSchema = z.object({
  preferredLanguage: z.enum(SUPPORTED_LANGUAGE_CODES),
});

export type UserPreference = z.infer<typeof preferenceSchema>;

const defaultPreference: UserPreference = {
  preferredLanguage: "hi",
};

let cache: UserPreference | null = null;

async function persist(preference: UserPreference): Promise<void> {
  const targetDir = path.dirname(config.preferencesStorePath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(config.preferencesStorePath, JSON.stringify(preference, null, 2), "utf8");
}

async function load(): Promise<UserPreference> {
  if (cache) {
    return cache;
  }

  try {
    const raw = await readFile(config.preferencesStorePath, "utf8");
    const parsed = preferenceSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      cache = defaultPreference;
      await persist(defaultPreference);
      return cache;
    }

    cache = parsed.data;
    return cache;
  } catch {
    cache = defaultPreference;
    await persist(defaultPreference);
    return cache;
  }
}

export async function getPreference(): Promise<UserPreference> {
  return load();
}

export async function updatePreference(nextPreference: UserPreference): Promise<UserPreference> {
  cache = nextPreference;
  await persist(nextPreference);
  return cache;
}

export { preferenceSchema };
