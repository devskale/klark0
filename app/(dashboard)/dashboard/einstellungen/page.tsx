"use client";

import { useActionState, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
// TODO: Create and import a new action for file system settings from a separate actions.ts file
// import { updateFileSystemSettings } from "@/app/(dashboard)/dashboard/einstellungen/actions";

// Define FileSystemType
type FileSystemType = "local" | "klark0fs" | "oci" | "sftp" | "webdav" | "";

// Define FormField structure
type FormField = {
  id: string; // Corresponds to 'name' attribute in input and key in FileSystemSettings
  label: string;
  type: "text" | "password" | "number";
  placeholder?: string;
  defaultValue?: string | number;
};

// Define the structure for each file system configuration
type FileSystemDetail = {
  displayName: string;
  fields: FormField[];
};

// Configuration object for all file system types and their fields
const fileSystemConfigurations: Record<Exclude<FileSystemType, "">, FileSystemDetail> = {
  local: {
    displayName: "Lokal",
    fields: [
      { id: "path", label: "Lokaler Pfad", type: "text", placeholder: "/pfad/zum/ordner", defaultValue: "" },
    ],
  },
  klark0fs: {
    displayName: "Klark0FS",
    fields: [
      { id: "klark0fsApiKey", label: "Klark0 FS API Key", type: "password", placeholder: "Ihr API Key", defaultValue: "" },
    ],
  },
  oci: {
    displayName: "OCI Bucket",
    fields: [
      { id: "bucketName", label: "Bucket Name", type: "text", placeholder: "Ihr Bucket Name", defaultValue: "" },
      { id: "region", label: "Region", type: "text", placeholder: "z.B. eu-frankfurt-1", defaultValue: "" },
      { id: "accessKeyId", label: "Access Key ID", type: "text", placeholder: "Ihr Access Key ID", defaultValue: "" },
      { id: "secretAccessKey", label: "Secret Access Key", type: "password", placeholder: "Ihr Secret Access Key", defaultValue: "" },
    ],
  },
  sftp: {
    displayName: "SFTP/SSH",
    fields: [
      { id: "host", label: "Host", type: "text", placeholder: "sftp.example.com", defaultValue: "" },
      { id: "port", label: "Port", type: "number", placeholder: "22", defaultValue: 22 },
      { id: "username", label: "Benutzername", type: "text", placeholder: "Ihr Benutzername", defaultValue: "" },
      { id: "password", label: "Passwort", type: "password", placeholder: "Ihr Passwort", defaultValue: "" },
      { id: "path", label: "Pfad (optional)", type: "text", placeholder: "/remote/pfad", defaultValue: "" },
    ],
  },
  webdav: {
    displayName: "WebDAV",
    fields: [
      { id: "host", label: "Host URL", type: "text", placeholder: "https://webdav.example.com/remote.php/dav/files/username", defaultValue: "" },
      { id: "username", label: "Benutzername", type: "text", placeholder: "Ihr Benutzername", defaultValue: "" },
      { id: "password", label: "Passwort", type: "password", placeholder: "Ihr Passwort", defaultValue: "" },
      { id: "path", label: "Pfad auf Server (optional, oft Teil der Host URL)", type: "text", placeholder: "/optionaler/pfad", defaultValue: "" },
    ],
  },
};

// Generic FileSystemSettings type
type FileSystemSettings = {
  type: FileSystemType;
  [key: string]: any; // Allow dynamic fields
};

type ActionState = {
  error?: string;
  success?: string;
  settings?: FileSystemSettings;
};

// Helper to get initial settings based on type
const getInitialSettings = (type: Exclude<FileSystemType, "">): FileSystemSettings => {
  const settings: FileSystemSettings = { type };
  const config = fileSystemConfigurations[type];
  if (config) {
    config.fields.forEach(field => {
      settings[field.id] = field.defaultValue;
    });
  }
  return settings;
};

// Placeholder for the actual server action
async function updateFileSystemSettings(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  console.log("Form submitted", Object.fromEntries(formData.entries()));
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

  const type = formData.get("fileSystemSetting") as Exclude<FileSystemType, "">;

  if (!type || !fileSystemConfigurations[type]) {
    return { error: "Ungültiger Dateisystem Typ ausgewählt." };
  }

  const settings: FileSystemSettings = { type };
  const config = fileSystemConfigurations[type];

  config.fields.forEach(field => {
    const value = formData.get(field.id);
    if (value !== null && value !== undefined) {
      if (field.type === "number" && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        settings[field.id] = isNaN(numValue) ? field.defaultValue : numValue;
      } else {
        // If value is empty string, not a password, and has a defined default, use default. Otherwise, use the value.
        // This means user-cleared fields (non-password) might revert to default if one is set.
        settings[field.id] = (value === "" && field.type !== "password" && field.defaultValue !== undefined) ? field.defaultValue : value;
      }
    } else {
      settings[field.id] = field.defaultValue;
    }
  });

  // TODO: Implement actual logic to save settings
  return {
    success: "Dateisystem Einstellungen erfolgreich gespeichert!",
    settings: settings,
  };
  // return { error: "Fehler beim Speichern der Einstellungen." };
}

const defaultInitialType: Exclude<FileSystemType, ""> = "local";
const initialActionState: ActionState = {
  settings: getInitialSettings(defaultInitialType),
};

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateFileSystemSettings,
    initialActionState
  );
  const [selectedFileSystem, setSelectedFileSystem] = useState<Exclude<FileSystemType, "">>(
    state.settings?.type && state.settings.type !== "" ? state.settings.type as Exclude<FileSystemType, ""> : defaultInitialType
  );

  useEffect(() => {
    if (state.settings?.type && state.settings.type !== "" && state.settings.type !== selectedFileSystem) {
      setSelectedFileSystem(state.settings.type as Exclude<FileSystemType, "">);
    }
  }, [state.settings?.type]); // Simplified dependency array

  const currentFields = fileSystemConfigurations[selectedFileSystem]?.fields || [];

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
                  setSelectedFileSystem(value as Exclude<FileSystemType, "">)
                }>
                <SelectTrigger id="fileSystemSetting">
                  <SelectValue placeholder="Wählen Sie einen Typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fileSystemConfigurations).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentFields.map(field => {
              let Gtv = field.defaultValue !== undefined ? String(field.defaultValue) : "";
              // Use value from state.settings ONLY if state.settings.type matches the currently selected FS type
              if (state.settings?.type === selectedFileSystem && state.settings?.[field.id] !== undefined) {
                Gtv = String(state.settings[field.id]);
              }

              return (
                // Use a key that depends on both selectedFileSystem and field.id to ensure re-mount
                <div key={`${selectedFileSystem}-${field.id}`} className="space-y-2 pt-4">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    defaultValue={Gtv}
                  />
                </div>
              );
            })}

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
