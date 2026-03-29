import type { LanguageCode } from "../config/languages";
import { enMessages } from "./en";
import { asMessages } from "./as";
import { bnMessages } from "./bn";
import { brxMessages } from "./brx";
import { doiMessages } from "./doi";
import { guMessages } from "./gu";
import { hiMessages } from "./hi";
import { knMessages } from "./kn";
import { ksMessages } from "./ks";
import { kokMessages } from "./kok";
import { maiMessages } from "./mai";
import { mlMessages } from "./ml";
import { mniMessages } from "./mni";
import { mrMessages } from "./mr";
import { neMessages } from "./ne";
import { orMessages } from "./or";
import { paMessages } from "./pa";
import { saMessages } from "./sa";
import { satMessages } from "./sat";
import { sdMessages } from "./sd";
import { taMessages } from "./ta";
import { teMessages } from "./te";
import { urMessages } from "./ur";

export const translations = {
  en: enMessages,
  as: asMessages,
  bn: bnMessages,
  brx: brxMessages,
  doi: doiMessages,
  gu: guMessages,
  hi: hiMessages,
  kn: knMessages,
  ks: ksMessages,
  kok: kokMessages,
  mai: maiMessages,
  ml: mlMessages,
  mni: mniMessages,
  mr: mrMessages,
  ne: neMessages,
  or: orMessages,
  pa: paMessages,
  sa: saMessages,
  sat: satMessages,
  sd: sdMessages,
  ta: taMessages,
  te: teMessages,
  ur: urMessages,
} as const;

export type TranslationLanguageCode = keyof typeof translations;

export function getMessages(language: LanguageCode | "en") {
  return translations[language] ?? enMessages;
}
