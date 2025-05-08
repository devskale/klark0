"use client";

import * as React from "react";
import Link from "next/link"; // Added
import { Suspense, useState } from "react"; // Added
import {
  Users,
  User,
  Settings,
  Activity,
  Shield,
  CircleIcon,
  Home,
  LogOut,
  Hexagon,
  Folder,
  Bolt,
  Hammer,
  Check,
} from "lucide-react"; // Added CircleIcon, Home, LogOut
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator"; // Assuming this exists
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; // Added
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Added
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Added
import { signOut } from "@/app/(login)/actions"; // Added
import { useRouter } from "next/navigation"; // Added
import { User as DbUser } from "@/lib/db/schema"; // Added and aliased User to DbUser
import useSWR from "swr"; // Added

// Function to fetch data
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * UserMenu component displays user avatar and a dropdown menu for navigation and sign out.
 * @returns JSX.Element
 */
function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<DbUser>("/api/user", fetcher);
  const router = useRouter();

  /**
   * Handles the sign out process.
   */
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
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ""} />
          <AvatarFallback>
            {user.email // Ensure user and user.email exist
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

/**
 * DashboardLayout component that provides the main structure for the dashboard pages,
 * including the AppSidebar and a content area with a header.
 * @param {object} props - The props for the component.
 * @param {React.ReactNode} props.children - The content to be rendered within the layout.
 * @returns JSX.Element
 */
// Define the data for the AppSidebar
const sidebarData = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Projekt",
      url: "#",
      items: [
        {
          title: "Projektauswahl",
          url: "/dashboard/aauswahl",
          icon: Hexagon,
        },
        { title: "Vault", url: "/dashboard/afolder", icon: Folder },
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
  return (
    <SidebarProvider>
      <AppSidebar
        versions={sidebarData.versions}
        navMain={sidebarData.navMain}
      />
      <SidebarInset>
        {/* Header with Klark0 logo, brand name, and UserMenu */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            {/* Separator is hidden on larger screens as the logo provides visual separation */}
            <Separator orientation="vertical" className="mr-2 h-4 lg:hidden" />
            <Link href="/" className="flex items-center">
              <CircleIcon className="h-6 w-6 text-orange-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Klark0
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Suspense fallback={<div className="h-9 w-9" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* The children prop will render the specific page content here */}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
