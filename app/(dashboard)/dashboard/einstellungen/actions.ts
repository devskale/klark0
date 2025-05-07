"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

// Define a schema for file system settings for validation
const FileSystemSettingsSchema = z.object({
  type: z.enum(["local", "klark0fs", "oci", "sftp", "webdav"]),
  path: z.string().optional(), // For local, sftp, webdav
  bucketName: z.string().optional(), // For OCI
  region: z.string().optional(), // For OCI
  accessKeyId: z.string().optional(), // For OCI, Klark0FS (if applicable)
  secretAccessKey: z.string().optional(), // For OCI, Klark0FS (if applicable)
  host: z.string().optional(), // For SFTP, WebDAV
  port: z.coerce.number().optional(), // For SFTP
  username: z.string().optional(), // For SFTP, WebDAV
  password: z.string().optional(), // For SFTP, WebDAV
  klark0fsApiKey: z.string().optional(), // For Klark0FS
});

export type FileSystemType = z.infer<typeof FileSystemSettingsSchema>["type"];
export type FileSystemSettings = z.infer<typeof FileSystemSettingsSchema>;

export type ActionState = {
  error?: string;
  errors?: Record<string, string[] | undefined>; // For field-specific errors
  success?: string;
  settings?: FileSystemSettings;
};

export async function updateFileSystemSettings(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  console.log("Server Action: updateFileSystemSettings called");
  const rawFormData = Object.fromEntries(formData.entries());
  console.log("Raw form data:", rawFormData);

  const validatedFields = FileSystemSettingsSchema.safeParse({
    type: rawFormData.fileSystemSetting,
    path:
      rawFormData.localPath || rawFormData.sftpPath || rawFormData.webdavPath,
    bucketName: rawFormData.ociBucketName,
    region: rawFormData.ociRegion,
    accessKeyId: rawFormData.ociAccessKeyId,
    secretAccessKey: rawFormData.ociSecretAccessKey,
    host: rawFormData.sftpHost || rawFormData.webdavHost,
    port: rawFormData.sftpPort ? Number(rawFormData.sftpPort) : undefined,
    username: rawFormData.sftpUsername || rawFormData.webdavUsername,
    password: rawFormData.sftpPassword || rawFormData.webdavPassword,
    klark0fsApiKey: rawFormData.klark0fsApiKey,
  });

  if (!validatedFields.success) {
    console.error(
      "Validation errors:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      error: "Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const settings = validatedFields.data;
  console.log("Validated settings:", settings);

  // TODO: Implement actual logic to save settings to a database or configuration file.
  // For example, you might call an API or update a database record.
  // For now, we'll just simulate a save operation.

  try {
    // Simulate saving to a database or external service
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Settings supposedly saved:", settings);

    // Revalidate the path to ensure the UI reflects the changes if needed
    revalidatePath("/dashboard/einstellungen");

    return {
      success: "Dateisystem Einstellungen erfolgreich gespeichert!",
      settings: settings,
    };
  } catch (e) {
    console.error("Error saving settings:", e);
    return {
      error: "Ein Fehler ist beim Speichern der Einstellungen aufgetreten.",
    };
  }
}
