import { useEffect, useState } from "react";
import type { LanguageCode } from "../config/languages";
import { LanguageGrid } from "./LanguageGrid";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { getLanguageByCode } from "../config/languages";

type LanguageSettingsModalProps = {
  isOpen: boolean;
  initialLanguage: LanguageCode;
  onClose: () => void;
};

export function LanguageSettingsModal({ isOpen, initialLanguage, onClose }: LanguageSettingsModalProps) {
  const { persistLanguagePreference, setLanguage, t } = useLanguage();
  const { showToast } = useToast();
  const [draftLanguage, setDraftLanguage] = useState<LanguageCode>(initialLanguage);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftLanguage(initialLanguage);
    }
  }, [initialLanguage, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSave() {
    const previous = initialLanguage;
    const next = draftLanguage;

    setIsSaving(true);
    try {
      await persistLanguagePreference(next);
      showToast(t("toast.languageUpdated", { language: getLanguageByCode(next).englishName }), "success");
      onClose();
    } catch {
      setLanguage(previous);
      showToast(t("toast.languageUpdateFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t("settings.modal.title")}>
      <div className="modal-card">
        <h3>{t("settings.modal.title")}</h3>
        <LanguageGrid selectedLanguage={draftLanguage} onSelect={setDraftLanguage} />
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t("settings.modal.cancel")}
          </button>
          <button type="button" className="primary-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : t("settings.modal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
