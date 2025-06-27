import { db } from "./drizzle";
import { appSettings } from "./schema";
import { eq, and } from "drizzle-orm";

export type FileSystemSettings = {
  type: "webdav" | "local";
  host?: string;
  username?: string;
  password?: string;
  basePath?: string;
  port?: number;
  ssl?: boolean;
};

export type AISettings = {
  geminiApiKey?: string;
  openaiApiKey?: string;
  defaultModel?: string;
};

export type WorkerSettings = {
  maxConcurrentJobs?: number;
  timeoutMs?: number;
  retryAttempts?: number;
};

export type DocumentParserSettings = {
  parserUrl?: string;
  ocr?: boolean;
  marker?: boolean;
  llamaparse?: boolean;
  docling?: boolean;
  pdfplumber?: boolean;
  molmo?: boolean;
  ocrforced?: boolean;
};

/**
 * Get filesystem configuration from database
 * Falls back to local filesystem if not configured
 */
export async function getFileSystemSettings(
  teamId: number
): Promise<FileSystemSettings> {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.teamId, teamId),
          eq(appSettings.settingKey, "fileSystem")
        )
      )
      .limit(1);

    if (settings.length === 0) {
      // Return default local config if none found
      return {
        type: "local",
        basePath: "/",
      };
    }

    return settings[0].value as FileSystemSettings;
  } catch (error) {
    console.error("Failed to get filesystem settings:", error);
    // Fallback to local filesystem
    return {
      type: "local",
      basePath: "/",
    };
  }
}

/**
 * Save filesystem configuration to database
 */
export async function saveFileSystemSettings(
  teamId: number,
  config: FileSystemSettings
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      teamId,
      settingKey: "fileSystem",
      value: config,
    })
    .onConflictDoUpdate({
      target: [appSettings.teamId, appSettings.settingKey],
      set: {
        value: config,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get AI service settings
 */
export async function getAISettings(
  teamId: number
): Promise<AISettings | null> {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.teamId, teamId),
          eq(appSettings.settingKey, "aiServices")
        )
      )
      .limit(1);

    return settings.length > 0 ? (settings[0].value as AISettings) : null;
  } catch (error) {
    console.error("Failed to get AI settings:", error);
    return null;
  }
}

/**
 * Get worker system settings
 */
export async function getWorkerSettings(
  teamId: number
): Promise<WorkerSettings | null> {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.teamId, teamId),
          eq(appSettings.settingKey, "workerSystem")
        )
      )
      .limit(1);

    return settings.length > 0 ? (settings[0].value as WorkerSettings) : null;
  } catch (error) {
    console.error("Failed to get worker settings:", error);
    return null;
  }
}

/**
 * Get document parser settings
 */
export async function getDocumentParserSettings(
  teamId: number
): Promise<DocumentParserSettings | null> {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.teamId, teamId),
          eq(appSettings.settingKey, "markdownKonversion")
        )
      )
      .limit(1);

    return settings.length > 0
      ? (settings[0].value as DocumentParserSettings)
      : null;
  } catch (error) {
    console.error("Failed to get document parser settings:", error);
    return null;
  }
}

/**
 * Generic function to get any app setting
 */
export async function getAppSetting<T>(
  teamId: number,
  settingKey: string
): Promise<T | null> {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(
        and(
          eq(appSettings.teamId, teamId),
          eq(appSettings.settingKey, settingKey)
        )
      )
      .limit(1);

    return settings.length > 0 ? (settings[0].value as T) : null;
  } catch (error) {
    console.error(`Failed to get app setting ${settingKey}:`, error);
    return null;
  }
}

/**
 * Generic function to save any app setting
 */
export async function saveAppSetting<T>(
  teamId: number,
  settingKey: string,
  value: T
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      teamId,
      settingKey,
      value: value as any,
    })
    .onConflictDoUpdate({
      target: [appSettings.teamId, appSettings.settingKey],
      set: {
        value: value as any,
        updatedAt: new Date(),
      },
    });
}
