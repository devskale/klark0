import { getAppSetting, saveAppSetting } from "@/lib/db/settings";

/**
 * Initialize default KI settings for a team if they don't exist
 */
export async function initializeDefaultKiSettings(teamId: number) {
  try {
    const existingSettings = await getAppSetting(teamId, "kiEinstellungen");

    if (!existingSettings) {
      const defaultSettings = {
        kiFramework: "gemini",
        baseUrl: "",
        bearer: "",
        encryptionKey: "",
        workModel: "gemini-pro",
        elaborateModel: "gemini-pro",
        classifierModel: "gemini-pro",
      };

      await saveAppSetting(teamId, "kiEinstellungen", defaultSettings);
      console.log(`Initialized default KI settings for team ${teamId}`);
      return defaultSettings;
    }

    return existingSettings;
  } catch (error) {
    console.error("Error initializing default KI settings:", error);
    throw error;
  }
}

/**
 * Get KI settings for a team, initializing defaults if needed
 */
export async function getKiSettings(teamId: number) {
  try {
    let settings = await getAppSetting(teamId, "kiEinstellungen");

    if (!settings) {
      settings = await initializeDefaultKiSettings(teamId);
    }

    return settings;
  } catch (error) {
    console.error("Error getting KI settings:", error);
    throw error;
  }
}
