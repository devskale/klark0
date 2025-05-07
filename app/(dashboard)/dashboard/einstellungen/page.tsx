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
import { Loader2, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Define FileSystemType
export type FileSystemType = "local" | "klark0fs" | "oci" | "sftp" | "webdav" | "";

// Define FormField structure
export type FormField = {
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
export type FileSystemSettings = {
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

// Server action to update file system settings
async function updateFileSystemSettings(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  console.log("Form submitted", Object.fromEntries(formData.entries()));

  const type = formData.get("fileSystemSetting") as Exclude<FileSystemType, "">;

  if (!type || !fileSystemConfigurations[type]) {
    return { error: "Ungültiger Dateisystem Typ ausgewählt." };
  }

  const newSettings: FileSystemSettings = { type };
  const config = fileSystemConfigurations[type];

  config.fields.forEach(field => {
    const value = formData.get(field.id);
    if (value !== null && value !== undefined) {
      if (field.type === "number" && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        newSettings[field.id] = isNaN(numValue) ? field.defaultValue : numValue;
      } else {
        newSettings[field.id] = (value === "" && field.type !== "password" && field.defaultValue !== undefined) ? field.defaultValue : value;
      }
    } else {
      newSettings[field.id] = field.defaultValue;
    }
  });

  try {
    const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingKey: 'fileSystem', value: newSettings }),
    });

    // BEST PRACTICE for caching DB values:
    // The POST /api/settings endpoint, after successfully updating the settings in the database,
    // MUST invalidate or update any server-side cache for 'fileSystem' settings.
    // This ensures that subsequent reads will fetch the fresh data.

    if (!response.ok) {
        const errorData = await response.json();
        return { error: `Fehler beim Speichern: ${errorData.error || response.statusText}` };
    }

    // Returning newSettings here allows the client to update its state (client-side cache)
    // with the successfully saved data.
    return {
      success: "Dateisystem Einstellungen erfolgreich gespeichert!",
      settings: newSettings,
    };
  } catch (e: any) {
    console.error("Error saving file system settings:", e);
    return { error: `Fehler beim Speichern der Einstellungen: ${e.message}` };
  }
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
  const [selectedFileSystem, setSelectedFileSystem] = useState<Exclude<FileSystemType, "">>(defaultInitialType);
  // dbSettings state acts as a client-side cache for the fetched settings.
  const [dbSettings, setDbSettings] = useState<FileSystemSettings | null>(null);
  const [isLoadingDbSettings, setIsLoadingDbSettings] = useState(true);
  const [isFileSystemCardOpen, setIsFileSystemCardOpen] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingDbSettings(true);
      try {
        // BEST PRACTICE for caching DB values:
        // 1. The /api/settings GET endpoint should implement server-side caching (e.g., in-memory, Redis)
        //    to avoid hitting the database on every request if the data hasn't changed.
        // 2. The /api/settings GET endpoint should also set appropriate HTTP Cache-Control headers.
        //    This allows the browser to cache the response, potentially avoiding network requests altogether
        //    if the cached data is still fresh according to the headers.
        const response = await fetch('/api/settings?key=fileSystem');
        if (response.ok) {
          const data = await response.json();
          if (data && data.type) {
            // Client-side caching: Storing fetched settings in React state (dbSettings).
            setDbSettings(data as FileSystemSettings);
            setSelectedFileSystem(data.type as Exclude<FileSystemType, "">);
          } else if (response.status === 404) {
            // Settings not found in DB, initialize with defaults.
            setDbSettings(getInitialSettings(defaultInitialType));
            setSelectedFileSystem(defaultInitialType);
          }
        } else if (response.status === 404) {
           // Settings not found (e.g., API returns 404 if no settings exist), initialize with defaults.
           setDbSettings(getInitialSettings(defaultInitialType));
           setSelectedFileSystem(defaultInitialType);
        }
      } catch (error) {
        console.error("Failed to fetch file system settings:", error);
        // Fallback to default settings on error.
        setDbSettings(getInitialSettings(defaultInitialType));
        setSelectedFileSystem(defaultInitialType);
      } finally {
        setIsLoadingDbSettings(false);
      }
    };
    fetchSettings();
  }, []); // Empty dependency array ensures this effect runs once on mount, fetching initial settings.

  useEffect(() => {
    // This effect handles updating the client-side cache (dbSettings and selectedFileSystem)
    // after a successful form submission (server action).
    // It uses the 'settings' returned by the server action, ensuring UI consistency
    // with the persisted state. This is a good practice.
    if (state.success && state.settings?.type && state.settings.type !== "") {
      setSelectedFileSystem(state.settings.type as Exclude<FileSystemType, "">);
      setDbSettings(state.settings); // Update client-side cache with the latest settings from the action.
    }
  }, [state.success, state.settings]); 

  const currentFields = fileSystemConfigurations[selectedFileSystem]?.fields || [];

  if (isLoadingDbSettings) {
    return (
      <section className="flex-1 p-4 lg:p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="ml-2">Einstellungen werden geladen...</p>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Allgemeine Einstellungen
      </h1>

      <Collapsible open={isFileSystemCardOpen} onOpenChange={setIsFileSystemCardOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
              <CardTitle>Dateisystem</CardTitle>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  isFileSystemCardOpen ? "rotate-180" : ""
                }`}
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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

                  if (dbSettings && dbSettings.type === selectedFileSystem && dbSettings[field.id] !== undefined) {
                    Gtv = String(dbSettings[field.id]);
                  } else if (state.settings?.type === selectedFileSystem && state.settings?.[field.id] !== undefined && state.success) {
                    // This condition ensures that if an action just succeeded and state.settings reflects that for the *current* selection,
                    // it can be used. This is mostly a fallback or for immediate reflection if dbSettings update is perceived as delayed.
                    // Given dbSettings is updated in the effect above, this might often be covered by the dbSettings check.
                    Gtv = String(state.settings[field.id]);
                  }
                  
                  return (
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}
