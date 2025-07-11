"use client";

import * as React from "react";
import Link from "next/link"; // Import Link
import { usePathname } from "next/navigation"; // Import usePathname
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProject } from "@/context/ProjectContext";
import { CircleIcon } from "lucide-react";

// Placeholder for SearchForm component
/**
 * Placeholder SearchForm component.
 * @returns JSX.Element
 */
export function SearchForm() {
  return <div className="p-2">Searchform</div>;
}

// Placeholder for VersionSwitcher component
/**
 * Placeholder VersionSwitcher component.
 * @param {object} props - The props for the component.
 * @param {string[]} props.versions - Array of version strings.
 * @param {string} props.defaultVersion - The default version string.
 * @returns JSX.Element
 */
export function VersionSwitcher({
  versions,
  defaultVersion,
}: {
  versions: string[];
  defaultVersion: string;
}) {
  return (
    <div className="p-2">
      <select defaultValue={defaultVersion}>
        {versions.map((version) => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
      </select>
    </div>
  );
}

// Define the types for the props
interface NavItem {
  title: string;
  url: string;
  icon?: React.ElementType; // Optional icon component
  isActive?: boolean; // isActive is optional as it's not in the original data structure but used in the component
  items?: NavItem[]; // For nested items, though not used in the current flat structure
}

interface NavMain {
  title: string;
  url: string;
  items: NavItem[];
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  versions: string[];
  navMain: NavMain[];
}

/**
 * AppSidebar component that displays navigation links and version information.
 * @param {AppSidebarProps} props - Props for the AppSidebar component, including versions and navigation data.
 * @returns JSX.Element
 */
export function AppSidebar({ versions, navMain, ...props }: AppSidebarProps) {
  const { state } = useSidebar();
  const { selectedProject, selectedBieter, selectedDok } = useProject();
  const pathname = usePathname(); // Get current pathname

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {state === "collapsed" ? (
          <div className="flex justify-center items-center p-2">
            <img
              src="/schild_orange.svg"
              alt="dokso Logo"
              className="h-6 w-6"
            />
          </div>
        ) : (
          <div className="flex flex-col items-start p-4 text-gray-800">
            <div className="flex items-center font-bold text-xl">
              <img
                src="/schild_orange.svg"
                alt="kontext1 Logo"
                className="h-6 w-6 mr-2"
              />
              kontext<sup>one</sup>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              Digitale Vergabeaudits Wien
            </span>
          </div>
        )}
        {state !== "collapsed" && (
          <>
            {!selectedProject && (
              <>
                {/* Placeholder for content when not collapsed and no project selected */}
              </>
            )}
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        {navMain.map(
          (item) =>
            (item.title !== "Doks" || !!selectedDok) &&
            (item.title !== "Bieter" || !!selectedBieter) && ( // Also hide Bieter section if no bieter selected
              <SidebarGroup key={item.title}>
                <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((subItem) => (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === subItem.url} // Use pathname for isActive
                        >
                          <Link href={subItem.url}>
                            {subItem.icon && (
                              <subItem.icon className="mr-2 h-4 w-4" />
                            )}
                            {subItem.title}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
