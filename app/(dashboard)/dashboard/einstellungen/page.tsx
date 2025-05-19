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
import { Loader2, ChevronDown, X, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import useSWR from "swr";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { toast } from "sonner";

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

// Configuration for Markdown Conversion
const markdownConversionConfig = {
  displayName: "Markdown Konversion",
  options: [
    { id: "ocr", label: "OCR", defaultValue: true },
    { id: "marker", label: "marker", defaultValue: false },
    { id: "llamaparse", label: "llamaparse", defaultValue: false },
    { id: "docling", label: "docling", defaultValue: false },
    { id: "pdfplumber", label: "pdfplumber", defaultValue: false },
  ],
  forceOcr: { id: "ocrforced", label: "OCR Erzwingen", defaultValue: false },
};

// Configuration for KI Einstellungen
const kiEinstellungenConfig = {
  displayName: "KI Einstellungen",
  fields: [
    {
      id: "kiFramework" as const,
      label: "KI Framework",
      type: "select" as const,
      options: [
        { value: "uniinfer", label: "uniinfer" },
        { value: "aisdk", label: "aisdk" },
      ],
      defaultValue: "uniinfer",
    },
    {
      id: "baseUrl",
      label: "Base URL",
      type: "text",
      placeholder: "https://api.example.com",
      defaultValue: "",
    },
    {
      id: "bearer",
      label: "Bearer Token",
      type: "password",
      placeholder: "Ihr Bearer Token",
      defaultValue: "",
    },
    {
      id: "encryptionKey",
      label: "Encryption Key",
      type: "password",
      placeholder: "Ihr Encryption Key",
      defaultValue: "",
    },
    {
      id: "workModel",
      label: "Work Model",
      type: "text",
      placeholder: "Provider Model",
      defaultValue: "",
    },
    {
      id: "elaborateModel",
      label: "Elaborate Model",
      type: "text",
      placeholder: "Provider Model",
      defaultValue: "",
    },
    {
      id: "classifierModel",
      label: "Classifier Model",
      type: "text",
      placeholder: "Provider Model",
      defaultValue: "",
    },
  ],
};

// Konfiguration für Personendaten Anonymisierung
const personDataConfig = {
  displayName: "Anonymisierung",
  options: [
    { id: "glna", label: "glna" },
    { id: "glnb", label: "glnb" },
    { id: "glnc", label: "glnc" },
    { id: "gemma3_4b", label: "gemma3:4b" },
    { id: "llama3_7b", label: "llama3:7b" },
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
          newSettings[field.id] = value || field.defaultValue; // Ensure all fields are captured
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

  const { data: externalWebsites, mutate: mutateExternalWebsites } = useSWR<
    Record<string, boolean>
  >("/api/settings?key=externalWebsites", fetcher);

  const { data: infoSettings } = useSWR<Record<string, string>>(
    "/api/settings?key=info",
    fetcher
  );

  const { data: mdConvSettings, mutate: mutateMdConvSettings } = useSWR<
    Record<string, boolean>
  >("/api/settings?key=markdownKonversion", fetcher);

  const { data: personSettings, mutate: mutatePersonSettings } = useSWR<
    Record<string, boolean>
  >("/api/settings?key=personendaten", fetcher);

  const { data: kiSettings, mutate: mutateKiSettings } = useSWR<
    Record<string, any>
  >(
    "/api/settings?key=kiEinstellungen", // New setting key
    fetcher
  );

  const [isInfoCardOpen, setIsInfoCardOpen] = useState(true);
  const [isWebsitesCardOpen, setIsWebsitesCardOpen] = useState(false);
  const [isFileSystemCardOpen, setIsFileSystemCardOpen] = useState(false);
  const [isMdConvCardOpen, setIsMdConvCardOpen] = useState(false);
  const [isPersonCardOpen, setIsPersonCardOpen] = useState(false);
  const [isKiCardOpen, setIsKiCardOpen] = useState(false); // State for the new KI card

  // New state for the selected KI Framework
  const [selectedKiFramework, setSelectedKiFramework] = useState<string>("");

  // Effect to initialize and update selectedKiFramework
  useEffect(() => {
    const frameworkField = kiEinstellungenConfig.fields.find(
      (f) => f.id === "kiFramework"
    ) as
      | (FormField & {
          type: "select";
          options: { value: string; label: string }[];
          defaultValue: string;
        })
      | undefined;
    if (kiSettings?.kiFramework && typeof kiSettings.kiFramework === "string") {
      setSelectedKiFramework(kiSettings.kiFramework);
    } else if (frameworkField?.defaultValue) {
      setSelectedKiFramework(frameworkField.defaultValue);
    } else {
      setSelectedKiFramework(""); // Default to empty if no value found
    }
  }, [kiSettings, kiEinstellungenConfig.fields]);

  const [infoSaving, setInfoSaving] = useState(false);
  const [websitesSaving, setWebsitesSaving] = useState(false);
  const [mdSaving, setMdSaving] = useState(false);
  const [personSaving, setPersonSaving] = useState(false);
  const [kiSaving, setKiSaving] = useState(false); // Saving state for KI settings

  const currentFields =
    fileSystemConfigurations[dbSettings?.type || "local"]?.fields || [];

  // Multi-select state for Markdown Konversion
  type MdOption = { value: string; label: string };
  const mdOptions: MdOption[] = markdownConversionConfig.options.map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));
  const [mdSelected, setMdSelected] = useState<MdOption[]>(() =>
    mdOptions.filter((opt) =>
      mdConvSettings
        ? mdConvSettings[opt.value]
        : markdownConversionConfig.options.find((o) => o.id === opt.value)!
            .defaultValue
    )
  );
  const [mdInputValue, setMdInputValue] = useState("");
  const [mdOpen, setMdOpen] = useState(false);
  const mdFiltered = useMemo(
    () =>
      mdOptions.filter((opt) => !mdSelected.some((s) => s.value === opt.value)),
    [mdSelected]
  );
  const handleMdUnselect = useCallback((opt: MdOption) => {
    setMdSelected((prev) => prev.filter((s) => s.value !== opt.value));
  }, []);
  const handleMdKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && mdSelected.length > 0) {
        setMdSelected((prev) => prev.slice(0, -1));
      }
    },
    [mdSelected]
  );

  // reset Markdown Konversion selection when settings load
  useEffect(() => {
    if (mdConvSettings) {
      setMdSelected(mdOptions.filter((opt) => mdConvSettings[opt.value]));
    }
  }, [mdConvSettings]);

  // Multi-select state for External Websites
  type WebOption = { value: string; label: string };
  const webOptions: WebOption[] = externalWebsitesConfig.options.map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));
  const [webSelected, setWebSelected] = useState<WebOption[]>(() =>
    webOptions.filter(
      (opt) =>
        externalWebsites?.[opt.value] ??
        externalWebsitesConfig.options.find((o) => o.id === opt.value)!
          .defaultValue
    )
  );
  const [webInputValue, setWebInputValue] = useState("");
  const [webOpen, setWebOpen] = useState(false);
  const webFiltered = useMemo(
    () =>
      webOptions.filter(
        (opt) => !webSelected.some((s) => s.value === opt.value)
      ),
    [webSelected]
  );
  const handleWebUnselect = useCallback((opt: WebOption) => {
    setWebSelected((prev) => prev.filter((s) => s.value !== opt.value));
  }, []);
  const handleWebKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && webSelected.length > 0) {
        setWebSelected((prev) => prev.slice(0, -1));
      }
    },
    [webSelected]
  );

  // reset External Websites selection when settings load
  useEffect(() => {
    if (externalWebsites) {
      setWebSelected(webOptions.filter((opt) => externalWebsites[opt.value]));
    }
  }, [externalWebsites]);

  // Multi-select state für Personendaten
  type PersonOption = { value: string; label: string };
  const personOptions: PersonOption[] = personDataConfig.options.map((o) => ({
    value: o.id,
    label: o.label,
  }));
  const [personSelected, setPersonSelected] = useState<PersonOption[]>(() =>
    personOptions.filter((opt) =>
      personSettings ? personSettings[opt.value] : false
    )
  );
  const [personInput, setPersonInput] = useState("");
  const [personOpen, setPersonOpen] = useState(false);
  const personFiltered = useMemo(
    () =>
      personOptions.filter(
        (opt) => !personSelected.some((s) => s.value === opt.value)
      ),
    [personSelected]
  );
  const handlePersonUnselect = useCallback((opt: PersonOption) => {
    setPersonSelected((ps) => ps.filter((s) => s.value !== opt.value));
  }, []);
  const handlePersonKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && personSelected.length > 0) {
        setPersonSelected((ps) => ps.slice(0, -1));
      }
    },
    [personSelected]
  );

  // reset Personendaten selection when settings load
  useEffect(() => {
    if (personSettings) {
      setPersonSelected(
        personOptions.filter((opt) => personSettings[opt.value])
      );
    }
  }, [personSettings]);

  // Placeholder useEffect for KI settings if needed in the future
  useEffect(() => {
    if (kiSettings) {
      // Logic to handle KI settings when loaded, e.g., set form defaults
    }
  }, [kiSettings]);

  // Multi-select state for Datenklassen
  type DataClassOption = { value: string; label: string };
  const dataClassOptions: DataClassOption[] = [
    { value: "person", label: "Person" },
    { value: "firma", label: "Firma" },
    { value: "adresse", label: "Adresse" },
    { value: "telefonnummer", label: "Telefonnummer" },
    { value: "email", label: "E-Mail" },
  ];
  const [dataClassSelected, setDataClassSelected] = useState<DataClassOption[]>(
    []
  );
  const [dataClassInput, setDataClassInput] = useState("");
  const [dataClassOpen, setDataClassOpen] = useState(false);
  const dataClassFiltered = useMemo(
    () =>
      dataClassOptions.filter(
        (opt) => !dataClassSelected.some((s) => s.value === opt.value)
      ),
    [dataClassSelected]
  );
  const handleDataClassUnselect = useCallback((opt: DataClassOption) => {
    setDataClassSelected((prev) => prev.filter((s) => s.value !== opt.value));
  }, []);
  const handleDataClassKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Backspace" &&
        dataClassInput === "" &&
        dataClassSelected.length > 0
      ) {
        e.preventDefault();
        setDataClassSelected((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter" && dataClassInput.trim() !== "") {
        e.preventDefault();
        const newLabel = dataClassInput.trim();
        // Create a simple value, e.g., "My Custom Tag" -> "my_custom_tag"
        const newValue = newLabel.toLowerCase().replace(/\s+/g, "_");

        // Check if this custom tag (by value) is already selected
        if (!dataClassSelected.some((opt) => opt.value === newValue)) {
          const newOption: DataClassOption = {
            value: newValue,
            label: newLabel,
          };
          setDataClassSelected((prev) => [...prev, newOption]);
        }
        setDataClassInput(""); // Clear input after adding
        setDataClassOpen(false); // Close dropdown
      }
    },
    [dataClassInput, dataClassSelected]
  );

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
        System Einstellungen
      </h1>

      {/* Info Section */}
      <Collapsible
        open={isInfoCardOpen}
        onOpenChange={setIsInfoCardOpen}
        className="mb-8">
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
                  setInfoSaving(true);
                  const formData = new FormData(e.currentTarget);
                  const newInfo = Object.fromEntries(formData.entries());
                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        settingKey: "info",
                        value: newInfo,
                      }),
                    });
                    mutate();
                    toast.success("Einstellungen gespeichert", {
                      description:
                        "Die Info-Einstellungen wurden erfolgreich gespeichert.",
                      position: "top-center",
                      duration: 3000,
                    });
                  } catch (error) {
                    toast.error("Fehler beim Speichern", {
                      description:
                        "Die Änderungen konnten nicht gespeichert werden.",
                      position: "top-center",
                    });
                  } finally {
                    setInfoSaving(false);
                  }
                }}>
                {infoConfig.fields.map((field) => (
                  <div key={field.id} className="mb-6">
                    <Label htmlFor={field.id} className="mb-3">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      placeholder={
                        "placeholder" in field
                          ? (field.placeholder as string | undefined)
                          : ""
                      }
                      defaultValue={infoSettings?.[field.id] || ""}
                    />
                  </div>
                ))}
                <Button
                  type="submit"
                  className="bg-orange-500 text-white"
                  disabled={infoSaving}>
                  {infoSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* External Websites Section */}
      <Collapsible
        open={isWebsitesCardOpen}
        onOpenChange={setIsWebsitesCardOpen}
        className="mb-8">
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
              <p className="text-sm text-muted-foreground">
                Websiten für das Beziehen von externen Daten
              </p>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWebsitesSaving(true);
                  const formData = new FormData(e.currentTarget);
                  const newSettings = Object.fromEntries(
                    Array.from(formData.entries()).map(([k, v]) => [
                      k,
                      v === "on",
                    ])
                  );
                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        settingKey: "externalWebsites",
                        value: newSettings,
                      }),
                    });
                    mutateExternalWebsites({
                      ...externalWebsites,
                      ...newSettings,
                    });
                    toast.success("Einstellungen gespeichert", {
                      description:
                        "Die Webseiten-Einstellungen wurden erfolgreich gespeichert.",
                      position: "top-center",
                      duration: 3000,
                    });
                  } catch (error) {
                    toast.error("Fehler beim Speichern", {
                      description:
                        "Die Änderungen konnten nicht gespeichert werden.",
                      position: "top-center",
                    });
                  } finally {
                    setWebsitesSaving(false);
                  }
                }}>
                {/* Hidden inputs for selected websites */}
                {webSelected.map((opt) => (
                  <input
                    key={opt.value}
                    type="hidden"
                    name={opt.value}
                    value="on"
                  />
                ))}

                {/* Multi-select UI for external websites */}
                <Command className="overflow-visible">
                  <div className="rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <div className="flex flex-wrap gap-1">
                      {webSelected.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant="secondary"
                          className="select-none">
                          {opt.label}
                          <span
                            className="ml-2 cursor-pointer inline-flex"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWebUnselect(opt);
                            }}>
                            <X className="size-3 text-muted-foreground hover:text-foreground" />
                          </span>
                        </Badge>
                      ))}
                      <CommandPrimitive.Input
                        onKeyDown={handleWebKeyDown}
                        onValueChange={setWebInputValue}
                        value={webInputValue}
                        onBlur={() => setWebOpen(false)}
                        onFocus={() => setWebOpen(true)}
                        placeholder="Select websites..."
                        className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <CommandList>
                      {webOpen && !!webFiltered.length && (
                        <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                          <CommandGroup className="h-full overflow-auto">
                            {webFiltered.map((opt) => (
                              <CommandItem
                                key={opt.value}
                                onMouseDown={(e) => e.preventDefault()}
                                onSelect={() => {
                                  setWebInputValue("");
                                  setWebSelected((prev) =>
                                    prev.some((s) => s.value === opt.value)
                                      ? prev
                                      : [...prev, opt]
                                  );
                                }}
                                className="cursor-pointer">
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </div>
                      )}
                    </CommandList>
                  </div>
                </Command>

                <Button
                  type="submit"
                  className="bg-orange-500 text-white"
                  disabled={websitesSaving}>
                  {websitesSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Markdown Konversion Section */}
      <Collapsible
        open={isMdConvCardOpen}
        onOpenChange={setIsMdConvCardOpen}
        className="mb-8">
        <Card>
          <CardHeader className="flex items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle>{markdownConversionConfig.displayName}</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isMdConvCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Modelle für das Konvertieren von Originaldateien in
                Markdown-Format
              </p>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setMdSaving(true);
                  const formData = new FormData(e.currentTarget);
                  const newSettings = Object.fromEntries(
                    Array.from(formData.entries()).map(([k, v]) => [
                      k,
                      v === "on",
                    ])
                  );
                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        settingKey: "markdownKonversion",
                        value: newSettings,
                      }),
                    });
                    mutateMdConvSettings({
                      ...mdConvSettings,
                      ...newSettings,
                    });
                    toast.success("Einstellungen gespeichert", {
                      description:
                        "Die Konversionsoptionen wurden erfolgreich gespeichert.",
                      position: "top-center",
                      duration: 3000,
                    });
                  } catch (error) {
                    toast.error("Fehler beim Speichern", {
                      description:
                        "Die Änderungen konnten nicht gespeichert werden.",
                      position: "top-center",
                    });
                  } finally {
                    setMdSaving(false);
                  }
                }}>
                {/* Hidden inputs für gewählte Tags */}
                {mdSelected.map((opt) => (
                  <input
                    key={opt.value}
                    type="hidden"
                    name={opt.value}
                    value="on"
                  />
                ))}
                {/* Multi-Select UI */}
                <Command className="overflow-visible">
                  <div className="rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <div className="flex flex-wrap gap-1">
                      {mdSelected.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant="secondary"
                          className="select-none">
                          {opt.label}
                          <span
                            className="ml-2 cursor-pointer inline-flex"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMdUnselect(opt);
                            }}>
                            <X className="size-3 text-muted-foreground hover:text-foreground" />
                          </span>
                        </Badge>
                      ))}
                      <CommandPrimitive.Input
                        onKeyDown={handleMdKeyDown}
                        onValueChange={setMdInputValue}
                        value={mdInputValue}
                        onBlur={() => setMdOpen(false)}
                        onFocus={() => setMdOpen(true)}
                        placeholder="Select tags..."
                        className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <CommandList>
                      {mdOpen && !!mdFiltered.length && (
                        <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                          <CommandGroup className="h-full overflow-auto">
                            {mdFiltered.map((opt) => (
                              <CommandItem
                                key={opt.value}
                                onMouseDown={(e) => e.preventDefault()}
                                onSelect={() => {
                                  setMdInputValue("");
                                  setMdSelected((prev) =>
                                    prev.some((s) => s.value === opt.value)
                                      ? prev
                                      : [...prev, opt]
                                  );
                                }}
                                className="cursor-pointer">
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </div>
                      )}
                    </CommandList>
                  </div>
                </Command>

                {/* OCR Erzwingen Checkbox */}
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id={markdownConversionConfig.forceOcr.id}
                    name={markdownConversionConfig.forceOcr.id}
                    defaultChecked={
                      mdConvSettings?.[markdownConversionConfig.forceOcr.id] ??
                      markdownConversionConfig.forceOcr.defaultValue
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor={markdownConversionConfig.forceOcr.id}>
                    {markdownConversionConfig.forceOcr.label}
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="bg-orange-500 text-white"
                  disabled={mdSaving}>
                  {mdSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personendaten Section */}
      <Collapsible
        open={isPersonCardOpen}
        onOpenChange={setIsPersonCardOpen}
        className="mb-8">
        <Card>
          <CardHeader className="flex items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  {personDataConfig.displayName}
                  <Sparkles className="h-5 w-5 text-black-400" />
                </CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isPersonCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Modelle für das Entfernen von Personenbezogenen{" "}
              </p>

              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPersonSaving(true);
                  const fd = new FormData(e.currentTarget);
                  const newSettings = Object.fromEntries(
                    Array.from(fd.entries()).map(([k, v]) => [k, v === "on"])
                  );
                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        settingKey: "personendaten",
                        value: newSettings,
                      }),
                    });
                    mutatePersonSettings({ ...personSettings, ...newSettings });
                    toast.success("Einstellungen gespeichert", {
                      description:
                        "Die Personendaten-Einstellungen wurden erfolgreich gespeichert.",
                      position: "top-center",
                      duration: 3000,
                    });
                  } catch (error) {
                    toast.error("Fehler beim Speichern", {
                      description:
                        "Die Änderungen konnten nicht gespeichert werden.",
                      position: "top-center",
                    });
                  } finally {
                    setPersonSaving(false);
                  }
                }}>
                {/* Hidden inputs für Auswahl */}
                {personSelected.map((opt) => (
                  <input
                    key={opt.value}
                    type="hidden"
                    name={opt.value}
                    value="on"
                  />
                ))}

                {/* Multi-select UI */}
                <Command className="overflow-visible">
                  <div className="rounded-md border border-input px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
                    <div className="flex flex-wrap gap-1">
                      {personSelected.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant="secondary"
                          className="select-none">
                          {opt.label}
                          <span
                            className="ml-2 cursor-pointer inline-flex"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePersonUnselect(opt);
                            }}>
                            <X className="size-3" />
                          </span>
                        </Badge>
                      ))}
                      <CommandPrimitive.Input
                        onKeyDown={handlePersonKeyDown}
                        onValueChange={setPersonInput}
                        value={personInput}
                        onBlur={() => setPersonOpen(false)}
                        onFocus={() => setPersonOpen(true)}
                        placeholder="Methoden wählen..."
                        className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <CommandList>
                      {personOpen && !!personFiltered.length && (
                        <div className="absolute top-0 z-10 w-full rounded-md border bg-popover shadow-md">
                          <CommandGroup className="h-full overflow-auto">
                            {personFiltered.map((opt) => (
                              <CommandItem
                                key={opt.value}
                                onMouseDown={(e) => e.preventDefault()}
                                onSelect={() => {
                                  setPersonInput("");
                                  setPersonSelected((ps) =>
                                    ps.some((s) => s.value === opt.value)
                                      ? ps
                                      : [...ps, opt]
                                  );
                                }}
                                className="cursor-pointer px-2 py-1">
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </div>
                      )}
                    </CommandList>
                  </div>
                </Command>

                {/* New Datenklassen Multi-select UI */}
                <div className="mt-4">
                  <Label className="block mb-2">Datenklassen</Label>
                  {/* Hidden inputs for selected data classes */}
                  {dataClassSelected.map((opt) => (
                    <input
                      key={opt.value}
                      type="hidden"
                      name={opt.value}
                      value="on"
                    />
                  ))}
                  <Command className="overflow-visible">
                    <div className="rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring">
                      <div className="flex flex-wrap gap-1">
                        {dataClassSelected.map((opt) => (
                          <Badge
                            key={opt.value}
                            variant="secondary"
                            className="select-none">
                            {opt.label}
                            <span
                              className="ml-2 cursor-pointer inline-flex"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDataClassUnselect(opt);
                              }}>
                              <X className="size-3 text-muted-foreground hover:text-foreground" />
                            </span>
                          </Badge>
                        ))}
                        <CommandPrimitive.Input
                          onKeyDown={handleDataClassKeyDown}
                          onValueChange={setDataClassInput}
                          value={dataClassInput}
                          onBlur={() => setDataClassOpen(false)}
                          onFocus={() => setDataClassOpen(true)}
                          placeholder="Select or type..."
                          className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <CommandList>
                        {dataClassOpen && !!dataClassFiltered.length && (
                          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                            <CommandGroup className="h-full overflow-auto">
                              {dataClassFiltered.map((opt) => (
                                <CommandItem
                                  key={opt.value}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onSelect={() => {
                                    setDataClassInput("");
                                    setDataClassSelected((prev) =>
                                      prev.some((s) => s.value === opt.value)
                                        ? prev
                                        : [...prev, opt]
                                    );
                                  }}
                                  className="cursor-pointer">
                                  {opt.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </div>
                        )}
                      </CommandList>
                    </div>
                  </Command>
                </div>

                <Button
                  type="submit"
                  className="bg-orange-500 text-white"
                  disabled={personSaving}>
                  {personSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* KI Einstellungen Section */}
      <Collapsible
        open={isKiCardOpen}
        onOpenChange={setIsKiCardOpen}
        className="mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  {kiEinstellungenConfig.displayName}
                  <Sparkles className="h-5 w-5 text-orange-400" />
                </CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isKiCardOpen ? "rotate-180" : ""
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
                  setKiSaving(true);
                  const formData = new FormData(e.currentTarget);
                  const kiFrameworkValue = formData.get(
                    "kiFramework"
                  ) as string;
                  const newKiSettings: Record<string, any> = {
                    kiFramework:
                      kiFrameworkValue ||
                      (
                        kiEinstellungenConfig.fields.find(
                          (f) => f.id === "kiFramework"
                        ) as any
                      )?.defaultValue,
                  };

                  kiEinstellungenConfig.fields.forEach((field) => {
                    if (field.id !== "kiFramework") {
                      const value = formData.get(field.id);
                      if (value !== null) {
                        newKiSettings[field.id] = value;
                      } else if (field.defaultValue) {
                        newKiSettings[field.id] = field.defaultValue;
                      }
                    }
                  });

                  try {
                    await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        settingKey: "kiEinstellungen",
                        value: newKiSettings,
                      }),
                    });
                    mutateKiSettings();
                    toast.success("KI Einstellungen gespeichert", {
                      description:
                        "Die KI-Einstellungen wurden erfolgreich gespeichert.",
                      position: "top-center",
                      duration: 3000,
                    });
                  } catch (error) {
                    toast.error("Fehler beim Speichern der KI Einstellungen", {
                      description:
                        "Die KI-Änderungen konnten nicht gespeichert werden.",
                      position: "top-center",
                    });
                  } finally {
                    setKiSaving(false);
                  }
                }}>
                {kiEinstellungenConfig.fields.map((field) => {
                  if (field.type === "select" && field.id === "kiFramework") {
                    const selectField = field as typeof field & {
                      options: { value: string; label: string }[];
                      defaultValue: string;
                    };
                    return (
                      <div key={selectField.id} className="mb-6">
                        <Label htmlFor={selectField.id} className="mb-3">
                          {selectField.label}
                        </Label>
                        <Select
                          name={selectField.id}
                          value={selectedKiFramework}
                          onValueChange={(value) =>
                            setSelectedKiFramework(value)
                          }>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`Wähle ${selectField.label}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {selectField.options.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  } else if (field.type === "text" || field.type === "password") {
                    return (
                      <div key={field.id} className="mb-6">
                        <Label htmlFor={field.id} className="mb-3">
                          {field.label}
                        </Label>
                        <Input
                          id={field.id}
                          name={field.id}
                          type={field.type}
                          placeholder={field.placeholder}
                          defaultValue={kiSettings?.[field.id] || field.defaultValue}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
                <Button
                  type="submit"
                  className="bg-orange-500 text-white hover:bg-orange-600"
                  disabled={kiSaving}>
                  {kiSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "KI Einstellungen Speichern"
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* File System Section */}
      <Collapsible
        open={isFileSystemCardOpen}
        onOpenChange={setIsFileSystemCardOpen}>
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
              <form
                className="space-y-4"
                action={async (formData) => {
                  const result = await formAction(formData);
                  if (result?.success) {
                    toast.success("Einstellungen gespeichert", {
                      description: result.success,
                      position: "top-center",
                      duration: 3000,
                    });
                  } else if (result?.error) {
                    toast.error("Fehler beim Speichern", {
                      description: result.error,
                      position: "top-center",
                    });
                  }
                }}>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="fileSystemSetting" className="block mb-2">
                    Dateisystem Typ
                  </Label>
                  <Select
                    name="fileSystemSetting"
                    value={dbSettings.type}
                    onValueChange={(value) =>
                      mutate(
                        { ...dbSettings, type: value as FileSystemType },
                        false
                      )
                    }>
                    <SelectTrigger id="fileSystemSetting">
                      <SelectValue placeholder="Wählen Sie einen Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fileSystemConfigurations).map(
                        ([key, config]) => (
                          <SelectItem
                            key={key}
                            value={key}
                            className="py-2 px-4 my-1">
                            {config.displayName}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {currentFields.map((field) => (
                  <div key={field.id} className="space-y-2 pt-4">
                    <Label htmlFor={field.id} className="mb-2">
                      {field.label}
                    </Label>
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
                  disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
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
