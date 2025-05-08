"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown } from "lucide-react";
import { updateAccount } from "@/app/(login)/actions";
import { User } from "@/lib/db/schema";
import useSWR from "swr";
import { Suspense, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = "",
  emailValue = "",
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>("/api/user", fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ""}
      emailValue={user?.email ?? ""}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  const [isCardOpen, setIsCardOpen] = useState(false); // Default state is collapsed

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Konto Einstellungen
      </h1>

      <Collapsible open={isCardOpen} onOpenChange={setIsCardOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Nutzer Information</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isCardOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <form className="space-y-4" action={formAction}>
                <Suspense fallback={<AccountForm state={state} />}>
                  <AccountFormWithData state={state} />
                </Suspense>
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
