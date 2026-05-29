import { useState, useCallback } from "react";

export type CatalogueSettings = {
  openingMode: "fixed" | "random";
  pinnedArtworkId: number | null;
  customCurrencies: string[];
  collectionOwner: string;
  userEmail: string;
  passwordHash: string;
  usePassword: boolean;
};

const STORAGE_KEY = "catalogue-settings";

const defaults: CatalogueSettings = {
  openingMode: "random",
  pinnedArtworkId: null,
  customCurrencies: [],
  collectionOwner: "",
  userEmail: "",
  passwordHash: "",
  usePassword: false,
};

function readSettings(): CatalogueSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CatalogueSettings>;
    return {
      openingMode: parsed.openingMode === "fixed" ? "fixed" : "random",
      pinnedArtworkId:
        typeof parsed.pinnedArtworkId === "number"
          ? parsed.pinnedArtworkId
          : null,
      customCurrencies: Array.isArray(parsed.customCurrencies)
        ? parsed.customCurrencies.filter(
            (c): c is string => typeof c === "string"
          )
        : [],
      collectionOwner:
        typeof parsed.collectionOwner === "string"
          ? parsed.collectionOwner
          : "",
      userEmail:
        typeof parsed.userEmail === "string" ? parsed.userEmail : "",
      passwordHash:
        typeof parsed.passwordHash === "string" ? parsed.passwordHash : "",
      usePassword:
        typeof parsed.usePassword === "boolean" ? parsed.usePassword : false,
    };
  } catch {
    return defaults;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<CatalogueSettings>(readSettings);

  const saveSettings = useCallback((next: CatalogueSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
  }, []);

  return { settings, saveSettings };
}
