import { INDIAN_LANGUAGES, type LanguageCode } from "../config/languages";

type LanguageGridProps = {
  selectedLanguage: LanguageCode | null;
  onSelect: (language: LanguageCode) => void;
};

export function LanguageGrid({ selectedLanguage, onSelect }: LanguageGridProps) {
  return (
    <div className="language-grid" role="listbox" aria-label="Language options">
      {INDIAN_LANGUAGES.map((language) => {
        const active = selectedLanguage === language.code;
        return (
          <button
            key={language.code}
            type="button"
            className={`language-card ${active ? "active" : ""}`}
            onClick={() => onSelect(language.code)}
            aria-selected={active}
          >
            <strong>{language.englishName}</strong>
            <span>{language.nativeName}</span>
          </button>
        );
      })}
    </div>
  );
}
