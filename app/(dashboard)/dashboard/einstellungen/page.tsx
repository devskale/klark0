"use client";

import { useActionState } from "react";
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
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Define FileSystemType
export type FileSystemType =
  | "local"
  | "klark0fs"
  | "oci"
  | "sftp"
  | "webdav"
  | "proto"
  | "";

// Define FormField structure
export type FormField = {
  id: string;
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

// Define structure for external websites configuration
type ExternalWebsiteConfig = {
  displayName: string;
  options: {
    id: string;
    label: string;
    defaultValue: boolean;
  }[];
};

// Configuration object for all file system types and their fields
const fileSystemConfigurations: Record<
  Exclude<FileSystemType, "">,
  FileSystemDetail
> = {
  proto: {
    displayName: "Proto",
    fields: [
      {
        id: "protoEndpoint",
        label: "Proto Endpoint",
        type: "text",
        placeholder: "https://proto.example.com",
        defaultValue: "https://proto.example.com",
      },
      {
        id: "protoToken",
        label: "Proto Token",
        type: "password",
        placeholder: "Your Proto Token",
        defaultValue: "",
      },
      {
        id: "protoNamespace",
        label: "Namespace",
        type: "text",
        placeholder: "default",
        defaultValue: "default",
      },
    ],
  },
  local: {
    displayName: "Lokal",
    fields: [
      {
        id: "path",
        label: "Lokaler Pfad",
        type: "text",
        placeholder: "/pfad/zum/ordner",
        defaultValue: "",
      },
    ],
  },
  klark0fs: {
    displayName: "Klark0FS",
    fields: [
      {
        id: "klark0fsApiKey",
        label: "Klark0 FS API Key",
        type: "password",
        placeholder: "Ihr API Key",
        defaultValue: "",
      },
    ],
  },
  oci: {
    displayName: "OCI Bucket",
    fields: [
      {
        id: "bucketName",
        label: "Bucket Name",
        type: "text",
        placeholder: "Ihr Bucket Name",
        defaultValue: "",
      },
      {
        id: "region",
        label: "Region",
        type: "text",
        placeholder: "z.B. eu-frankfurt-1",
        defaultValue: "",
      },
      {
        id: "accessKeyId",
        label: "Access Key ID",
        type: "text",
        placeholder: "Ihr Access Key ID",
        defaultValue: "",
      },
      {
        id: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        placeholder: "Ihr Secret Access Key",
        defaultValue: "",
      },
    ],
  },
  sftp: {
    displayName: "SFTP/SSH",
    fields: [
      {
        id: "host",
        label: "Host",
        type: "text",
        placeholder: "sftp.example.com",
        defaultValue: "",
      },
      {
        id: "port",
        label: "Port",
        type: "number",
        placeholder: "22",
        defaultValue: 22,
      },
      {
        id: "username",
        label: "Benutzername",
        type: "text",
        placeholder: "Ihr Benutzername",
        defaultValue: "",
      },
      {
        id: "password",
        label: "Passwort",
        type: "password",
        placeholder: "Ihr Passwort",
        defaultValue: "",
      },
      {
        id: "path",
        label: "Pfad (optional)",
        type: "text",
        placeholder: "/remote/pfad",
        defaultValue: "",
      },
    ],
  },
  webdav: {
    displayName: "WebDAV",
    fields: [
      {
        id: "host",
        label: "Host URL",
        type: "text",
        placeholder: "https://webdav.example.com/remote.php/dav/files/username",
        defaultValue: "",
      },
      {
        id: "username",
        label: "Benutzername",
        type: "text",
        placeholder: "Ihr Benutzername",
        defaultValue: "",
      },
      {
        id: "password",
        label: "Passwort",
        type: "password",
        placeholder: "Ihr Passwort",
        defaultValue: "",
      },
      {
        id: "path",
        label: "Pfad auf Server (optional, oft Teil der Host URL)",
        type: "text",
        placeholder: "/optionaler/pfad",
        defaultValue: "",
      },
    ],
  },
};

// Generic FileSystemSettings type
export type FileSystemSettings = {
  type: FileSystemType;
  [key: string]: any;
};

type ActionState = {
  error?: string;
  success?: string;
  settings?: FileSystemSettings;
};

// Configuration for external websites
const externalWebsitesConfig: ExternalWebsiteConfig = {
  displayName: "Externe Webseiten",
  options: [
    { id: "anko", label: "ankö", defaultValue: false },
    { id: "euted", label: "euted", defaultValue: false },
    { id: "openfirmenbuch", label: "openfirmenbuch", defaultValue: false },
    { id: "web", label: "web", defaultValue: false },
  ],
};

// Configuration for info section
const infoConfig = {
  displayName: "Infos",
  fields: [
    {
      id: "vergabestelle",
      label: "Vergabestelle",
      type: "text",
      defaultValue: "",
    },
    { id: "adresse", label: "Adresse", type: "text", defaultValue: "" },
  ],
};

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const type = formData.get("fileSystemSetting") as FileSystemType;
      const newSettings: FileSystemSettings = { type };

      const config = type !== "" ? fileSystemConfigurations[type] : undefined;
      if (config) {
        config.fields.forEach((field) => {
          const value = formData.get(field.id);
          newSettings[field.id] = value || field.defaultValue;
        });
      }

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingKey: "fileSystem", value: newSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || response.statusText };
      }

      return {
        success: "Dateisystem Einstellungen erfolgreich gespeichert!",
        settings: newSettings,
      };
    },
    {}
  );

  const { data: dbSettings, mutate } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    fetcher
  );

  const { data: externalWebsites } = useSWR<Record<string, boolean>>(
    "/api/settings?key=externalWebsites",
    fetcher
  );

  const { data: infoSettings } = useSWR<Record<string, string>>(
    "/api/settings?key=info",
    fetcher
  );

  const [isInfoCardOpen, setIsInfoCardOpen] = useState(true);
  const [isWebsitesCardOpen, setIsWebsitesCardOpen] = useState(false);
  const [isFileSystemCardOpen, setIsFileSystemCardOpen] = useState(false);

  const currentFields =
    fileSystemConfigurations[dbSettings?.type || "local"]?.fields || [];

  if (!dbSettings) {
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

      {/* Info Section */}
      <Collapsible open={isInfoCardOpen} onOpenChange={setIsInfoCardOpen} className="mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle>{infoConfig.displayName}</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isInfoCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newInfo = Object.fromEntries(formData.entries());
                  await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      settingKey: "info",
                      value: newInfo,
                    }),
                  });
                  mutate();
                }}
              >
                {infoConfig.fields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      placeholder={"placeholder" in field ? (field.placeholder as string | undefined) : ""}
                      defaultValue={infoSettings?.[field.id] || ""}
                    />
                  </div>
                ))}
                <Button type="submit" className="bg-orange-500 text-white">
                  Speichern
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* External Websites Section */}
      <Collapsible open={isWebsitesCardOpen} onOpenChange={setIsWebsitesCardOpen} className="mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle>{externalWebsitesConfig.displayName}</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isWebsitesCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newWebsites = Object.fromEntries(
                    Array.from(formData.entries()).map(([key, value]) => [
                      key,
                      value === "on",
                    ])
                  );
                  await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      settingKey: "externalWebsites",
                      value: newWebsites,
                    }),
                  });
                  mutate(); // Revalidate the SWR cache
                }}
              >
                {externalWebsitesConfig.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={option.id}
                      name={option.id}
                      checked={externalWebsites?.[option.id] || false}
                      onChange={(e) =>
                        mutate((prev) => {
                          const updatedSettings: FileSystemSettings = {
                            ...(prev || {}),
                            type: prev?.type || "local", // Ensure 'type' is always defined
                            [option.id]: e.target.checked,
                          };
                          return updatedSettings;
                        })}
                        className="h-4 w-4"
                    />
                    <Label htmlFor={option.id}>{option.label}</Label>
                  </div>
                ))}
                <Button type="submit" className="bg-orange-500 text-white">
                  Speichern
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* File System Section */}
      <Collapsible open={isFileSystemCardOpen} onOpenChange={setIsFileSystemCardOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Dateisystem</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isFileSystemCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <form className="space-y-4" action={formAction}>
                <div>
                  <Label htmlFor="fileSystemSetting">Dateisystem Typ</Label>
                  <Select
                    name="fileSystemSetting"
                    value={dbSettings.type}
                    onValueChange={(value) =>
                      mutate({ ...dbSettings, type: value as FileSystemType })
                    }
                  >
                    <SelectTrigger id="fileSystemSetting">
                      <SelectValue placeholder="Wählen Sie einen Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fileSystemConfigurations).map(
                        ([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.displayName}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {currentFields.map((field) => (
                  <div key={field.id} className="space-y-2 pt-4">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      defaultValue={dbSettings[field.id] || ""}
                    />
                  </div>
                ))}

                {state.error && (
                  <p className="text-red-500 text-sm">{state.error}</p>
                )}
                {state.success && (
                  <p className="text-green-500 text-sm">{state.success}</p>
                )}
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isPending}
                >
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
