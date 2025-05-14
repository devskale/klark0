"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense, useState } from "react";
import {
  Users,
  User,
  Settings,
  Activity,
  Shield,
  Hexagon,
  Folder,
  Bolt,
  Hammer,
  Check,
  List,
  Brain,
  Home,
  LogOut,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/app/(login)/actions";
import { useRouter } from "next/navigation";
import { User as DbUser } from "@/lib/db/schema";
import useSWR from "swr";
import { useSelectedProject } from "@/components/ui/sidebar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const { data: user } = useSWR<DbUser>("/api/user", fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push("/");
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900">
          Preise
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Registrieren</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ""} />
          <AvatarFallback>
            {user.email
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSignOut();
          }}
          className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const sidebarData = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Projekt",
      url: "#",
      items: [
        {
          title: "Auswahl",
          url: "/dashboard/aauswahl",
          icon: Hexagon,
        },
        { title: "Vault", url: "/dashboard/vault", icon: Folder },
        { title: "Kriterien", url: "/dashboard/akriterien", icon: List },
        {
          title: "Konfig",
          url: "/dashboard/akonfig",
          icon: Bolt,
        },
        { title: "Tools", url: "/dashboard/atools", icon: Hammer },
        { title: "Freigabe", url: "/dashboard/afreigabe", icon: Check },
      ],
    },
    {
      title: "Bieter",
      url: "#",
      items: [
        {
          title: "Bieterauswahl",
          url: "/dashboard/bauswahl",
          icon: Hexagon,
        },
        { title: "Vault", url: "/dashboard/bfolder", icon: Folder },
        {
          title: "Konfig",
          url: "/dashboard/bkonfig",
          icon: Bolt,
        },
        { title: "Tools", url: "/dashboard/btools", icon: Hammer },
        { title: "Freigabe", url: "/dashboard/bfreigabe", icon: Check },
      ],
    },
    {
      title: "System",
      url: "#",
      items: [
        { title: "Team", url: "/dashboard", icon: Users },
        { title: "Konto", url: "/dashboard/konto", icon: User },
        {
          title: "Einstellungen",
          url: "/dashboard/einstellungen",
          icon: Settings,
        },
        { title: "Models", url: "/dashboard/models", icon: Brain },
        { title: "Aktivität", url: "/dashboard/activity", icon: Activity },
        { title: "Sicherheit", url: "/dashboard/security", icon: Shield },
      ],
    },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedProject, selectedBieter } = useSelectedProject();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        versions={sidebarData.versions}
        navMain={sidebarData.navMain}
        collapsible="icon"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 lg:hidden" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {selectedProject && (
              <nav className="text-sm text-gray-700">
                Projekt / <span className="font-medium">{selectedProject}</span>
                {selectedBieter && (
                  <> / <span className="font-medium">{selectedBieter}</span></>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Suspense fallback={<div className="h-9 w-9" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
