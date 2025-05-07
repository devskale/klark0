"use client";

import { useActionState, useState, useEffect } from "react"; // Added useState and useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
// TODO: Create and import a new action for file system settings
// import { updateFileSystemSettings } from "@/app/(dashboard)/dashboard/einstellungen/actions";

// Define a more specific state for file system settings
type FileSystemType = "local" | "klark0fs" | "oci" | "sftp" | "webdav" | "";

type FileSystemSettings = {
  type: FileSystemType;
  path?: string; // For local, sftp, webdav
  bucketName?: string; // For OCI
  region?: string; // For OCI
  accessKeyId?: string; // For OCI, Klark0FS (if applicable)
  secretAccessKey?: string; // For OCI, Klark0FS (if applicable)
  host?: string; // For SFTP, WebDAV
  port?: number; // For SFTP
  username?: string; // For SFTP, WebDAV
  password?: string; // For SFTP, WebDAV
  klark0fsApiKey?: string; // For Klark0FS
};

type ActionState = {
  error?: string;
  success?: string;
  settings?: FileSystemSettings;
};

// Placeholder for the actual server action
async function updateFileSystemSettings(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  console.log("Form submitted", Object.fromEntries(formData.entries()));
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // TODO: Implement actual logic to save settings
  // For now, just return a success message and the submitted data
  const settings: Partial<FileSystemSettings> = {};
  settings.type = formData.get("fileSystemSetting") as FileSystemType;
  if (settings.type === "local")
    settings.path = formData.get("localPath") as string;
  if (settings.type === "oci") {
    settings.bucketName = formData.get("ociBucketName") as string;
    settings.region = formData.get("ociRegion") as string;
    settings.accessKeyId = formData.get("ociAccessKeyId") as string;
    settings.secretAccessKey = formData.get("ociSecretAccessKey") as string;
  }
  if (settings.type === "sftp") {
    settings.host = formData.get("sftpHost") as string;
    settings.port = parseInt(formData.get("sftpPort") as string, 10);
    settings.username = formData.get("sftpUsername") as string;
    settings.password = formData.get("sftpPassword") as string;
    settings.path = formData.get("sftpPath") as string;
  }
  if (settings.type === "webdav") {
    settings.host = formData.get("webdavHost") as string;
    settings.username = formData.get("webdavUsername") as string;
    settings.password = formData.get("webdavPassword") as string;
    settings.path = formData.get("webdavPath") as string;
  }
  if (settings.type === "klark0fs") {
    settings.klark0fsApiKey = formData.get("klark0fsApiKey") as string;
  }

  return {
    success: "Dateisystem Einstellungen erfolgreich gespeichert!",
    settings: settings as FileSystemSettings,
  };
  // return { error: "Fehler beim Speichern der Einstellungen." };
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateFileSystemSettings, // Using the new placeholder action
    { settings: { type: "local" } } // Initial state with default type
  );
  const [selectedFileSystem, setSelectedFileSystem] = useState<FileSystemType>(
    state.settings?.type || "local"
  );

  // Effect to update selectedFileSystem when form state changes (e.g. after submit or initial load)
  useEffect(() => {
    if (state.settings?.type) {
      setSelectedFileSystem(state.settings.type);
    }
  }, [state.settings?.type]);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Allgemeine Einstellungen
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Dateisystem</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <div>
              <Label htmlFor="fileSystemSetting">Dateisystem Typ</Label>
              <Select
                name="fileSystemSetting"
                value={selectedFileSystem}
                onValueChange={(value) =>
                  setSelectedFileSystem(value as FileSystemType)
                }>
                <SelectTrigger id="fileSystemSetting">
                  <SelectValue placeholder="Wählen Sie einen Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Lokal</SelectItem>
                  <SelectItem value="klark0fs">Klark0FS</SelectItem>
                  <SelectItem value="oci">OCI Bucket</SelectItem>
                  <SelectItem value="sftp">SFTP/SSH</SelectItem>
                  <SelectItem value="webdav">WebDAV</SelectItem>
                </SelectContent>
              </Select>
              {/* TODO: Add error display if needed, similar to how it might have been with RadioGroup errors */}
            </div>

            {/* Dynamically rendered input fields based on selectedFileSystem */}
            {selectedFileSystem === "local" && (
              <div className="space-y-2 pt-4">
                <Label htmlFor="localPath">Lokaler Pfad</Label>
                <Input
                  id="localPath"
                  name="localPath"
                  placeholder="/pfad/zum/ordner"
                  defaultValue={state.settings?.path || ""}
                />
              </div>
            )}

            {selectedFileSystem === "klark0fs" && (
              <div className="space-y-2 pt-4">
                <Label htmlFor="klark0fsApiKey">Klark0 FS API Key</Label>
                <Input
                  id="klark0fsApiKey"
                  name="klark0fsApiKey"
                  type="password"
                  placeholder="Ihr API Key"
                  defaultValue={state.settings?.klark0fsApiKey || ""}
                />
              </div>
            )}

            {selectedFileSystem === "oci" && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="ociBucketName">Bucket Name</Label>
                  <Input
                    id="ociBucketName"
                    name="ociBucketName"
                    placeholder="Ihr Bucket Name"
                    defaultValue={state.settings?.bucketName || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="ociRegion">Region</Label>
                  <Input
                    id="ociRegion"
                    name="ociRegion"
                    placeholder="z.B. eu-frankfurt-1"
                    defaultValue={state.settings?.region || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="ociAccessKeyId">Access Key ID</Label>
                  <Input
                    id="ociAccessKeyId"
                    name="ociAccessKeyId"
                    placeholder="Ihr Access Key ID"
                    defaultValue={state.settings?.accessKeyId || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="ociSecretAccessKey">Secret Access Key</Label>
                  <Input
                    id="ociSecretAccessKey"
                    name="ociSecretAccessKey"
                    type="password"
                    placeholder="Ihr Secret Access Key"
                    defaultValue={state.settings?.secretAccessKey || ""}
                  />
                </div>
              </div>
            )}

            {selectedFileSystem === "sftp" && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="sftpHost">Host</Label>
                  <Input
                    id="sftpHost"
                    name="sftpHost"
                    placeholder="sftp.example.com"
                    defaultValue={state.settings?.host || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="sftpPort">Port</Label>
                  <Input
                    id="sftpPort"
                    name="sftpPort"
                    type="number"
                    placeholder="22"
                    defaultValue={state.settings?.port || 22}
                  />
                </div>
                <div>
                  <Label htmlFor="sftpUsername">Benutzername</Label>
                  <Input
                    id="sftpUsername"
                    name="sftpUsername"
                    placeholder="Ihr Benutzername"
                    defaultValue={state.settings?.username || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="sftpPassword">Passwort</Label>
                  <Input
                    id="sftpPassword"
                    name="sftpPassword"
                    type="password"
                    placeholder="Ihr Passwort"
                    defaultValue={state.settings?.password || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="sftpPath">Pfad (optional)</Label>
                  <Input
                    id="sftpPath"
                    name="sftpPath"
                    placeholder="/remote/pfad"
                    defaultValue={state.settings?.path || ""}
                  />
                </div>
              </div>
            )}

            {selectedFileSystem === "webdav" && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="webdavHost">Host URL</Label>
                  <Input
                    id="webdavHost"
                    name="webdavHost"
                    placeholder="https://webdav.example.com/remote.php/dav/files/username"
                    defaultValue={state.settings?.host || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="webdavUsername">Benutzername</Label>
                  <Input
                    id="webdavUsername"
                    name="webdavUsername"
                    placeholder="Ihr Benutzername"
                    defaultValue={state.settings?.username || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="webdavPassword">Passwort</Label>
                  <Input
                    id="webdavPassword"
                    name="webdavPassword"
                    type="password"
                    placeholder="Ihr Passwort"
                    defaultValue={state.settings?.password || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="webdavPath">
                    Pfad auf Server (optional, oft Teil der Host URL)
                  </Label>
                  <Input
                    id="webdavPath"
                    name="webdavPath"
                    placeholder="/optionaler/pfad"
                    defaultValue={state.settings?.path || ""}
                  />
                </div>
              </div>
            )}
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Änderungen speichern"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
