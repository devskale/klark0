"use client";
import React, { createContext, useContext, useState } from "react";

type ProjectContextType = {
  selectedProject: string | null;
  setSelectedProject: (p: string | null) => void;
  selectedBieter: string | null;
  setSelectedBieter: (b: string | null) => void;
  selectedDok: string | null;
  setSelectedDok: (d: string | null) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedBieter, setSelectedBieter] = useState<string | null>(null);
  const [selectedDok, setSelectedDok] = useState<string | null>(null);
  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        selectedBieter,
        setSelectedBieter,
        selectedDok,
        setSelectedDok,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectProvider");
  return ctx;
}
