"use client";

import * as React from "react";
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
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar to access the sidebar state
import { useSelectedProject } from "@/components/ui/sidebar"; // Import useSelectedProject to access the selected project

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
  const { state } = useSidebar(); // Access the sidebar state (expanded or collapsed)
  const { selectedProject } = useSelectedProject(); // Destructure selectedProject from context

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {selectedProject ? (
          <div className="px-4 py-2 bg-gray-200 text-xl font-bold mb-2">
            {selectedProject}
          </div>
        ) : (
          <>
            <SearchForm />
            <VersionSwitcher versions={versions} defaultVersion={versions[0]} />
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((subItem) => (
                  <SidebarMenuItem key={subItem.title}>
                    <SidebarMenuButton asChild isActive={subItem.isActive}>
                      <a href={subItem.url}>
                        {subItem.icon && (
                          <subItem.icon className="mr-2 h-4 w-4" />
                        )}
                        {subItem.title}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
