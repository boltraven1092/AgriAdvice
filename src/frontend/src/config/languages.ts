export type LanguageCode =
  | "en"
  | "as"
  | "bn"
  | "brx"
  | "doi"
  | "gu"
  | "hi"
  | "kn"
  | "ks"
  | "kok"
  | "mai"
  | "ml"
  | "mni"
  | "mr"
  | "ne"
  | "or"
  | "pa"
  | "sa"
  | "sat"
  | "sd"
  | "ta"
  | "te"
  | "ur";

export type LanguageOption = {
  code: LanguageCode;
  englishName: string;
  nativeName: string;
  isRtl: boolean;
};

export const RTL_LANGUAGES: LanguageCode[] = ["ur", "sd", "ks"];

export const INDIAN_LANGUAGES: LanguageOption[] = [
  { code: "en", englishName: "English", nativeName: "English", isRtl: false },
  { code: "as", englishName: "Assamese", nativeName: "অসমীয়া", isRtl: false },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা", isRtl: false },
  { code: "brx", englishName: "Bodo", nativeName: "बर'", isRtl: false },
  { code: "doi", englishName: "Dogri", nativeName: "डोगरी", isRtl: false },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી", isRtl: false },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी", isRtl: false },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ", isRtl: false },
  { code: "ks", englishName: "Kashmiri", nativeName: "کٲشُر", isRtl: true },
  { code: "kok", englishName: "Konkani", nativeName: "कोंकणी", isRtl: false },
  { code: "mai", englishName: "Maithili", nativeName: "मैथिली", isRtl: false },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം", isRtl: false },
  { code: "mni", englishName: "Manipuri", nativeName: "ꯃꯤꯇꯩꯂꯣꯟ", isRtl: false },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी", isRtl: false },
  { code: "ne", englishName: "Nepali", nativeName: "नेपाली", isRtl: false },
  { code: "or", englishName: "Odia", nativeName: "ଓଡ଼ିଆ", isRtl: false },
  { code: "pa", englishName: "Punjabi", nativeName: "ਪੰਜਾਬੀ", isRtl: false },
  { code: "sa", englishName: "Sanskrit", nativeName: "संस्कृतम्", isRtl: false },
  { code: "sat", englishName: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", isRtl: false },
  { code: "sd", englishName: "Sindhi", nativeName: "سنڌي", isRtl: true },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்", isRtl: false },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు", isRtl: false },
  { code: "ur", englishName: "Urdu", nativeName: "اردو", isRtl: true },
];

export function getLanguageByCode(code: LanguageCode): LanguageOption {
  return INDIAN_LANGUAGES.find((language) => language.code === code) ?? INDIAN_LANGUAGES[5];
}
