"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { updateAccount } from "@/app/(login)/actions"; // TODO: This action needs to be updated for file system settings

// TODO: Define a more specific state for file system settings
type ActionState = {
  error?: string;
  success?: string;
};

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

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
            <RadioGroup
              defaultValue="local"
              name="fileSystemSetting"
              className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="local" id="fs-local" />
                <Label htmlFor="fs-local">
                  Lokales Dateisystem: Zugriff auf lokalen Ordner
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="klark0fs" id="fs-klark0" />
                <Label htmlFor="fs-klark0">Klark0 FS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oci" id="fs-oci" />
                <Label htmlFor="fs-oci">OCI Bucket</Label>
              </div>
            </RadioGroup>
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
