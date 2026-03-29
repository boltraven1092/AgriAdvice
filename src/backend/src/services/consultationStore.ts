import { randomUUID } from "node:crypto";

import { config } from "../config/env";
import { readJsonFile, writeJsonFile } from "./fileStore";

type ConsultationRecord = {
  id: string;
  userId: string;
  createdAt: string;
  inputType: "text" | "audio";
  textQuery?: string;
  detectedLanguage?: string;
  originalTranscript?: string;
  translatedResponse?: string;
};

type ConsultationStoreShape = {
  consultations: ConsultationRecord[];
};

const fallbackStore: ConsultationStoreShape = { consultations: [] };

async function loadStore(): Promise<ConsultationStoreShape> {
  return readJsonFile<ConsultationStoreShape>(config.consultationsStorePath, fallbackStore);
}

async function saveStore(payload: ConsultationStoreShape): Promise<void> {
  await writeJsonFile(config.consultationsStorePath, payload);
}

export async function createConsultationRecord(record: Omit<ConsultationRecord, "id" | "createdAt">): Promise<void> {
  const store = await loadStore();
  store.consultations.unshift({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...record,
  });
  store.consultations = store.consultations.slice(0, 2000);
  await saveStore(store);
}

export async function listConsultationsByUser(userId: string): Promise<ConsultationRecord[]> {
  const store = await loadStore();
  return store.consultations.filter((consultation) => consultation.userId === userId).slice(0, 50);
}
