"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

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
  // Initialize state from localStorage if available
  const [selectedProject, setSelectedProject] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedProject');
    }
    return null;
  });
  const [selectedBieter, setSelectedBieter] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedBieter');
    }
    return null;
  });
  const [selectedDok, setSelectedDok] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedDok');
    }
    return null;
  });

  // Persist state changes to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProject', selectedProject);
    } else {
      localStorage.removeItem('selectedProject');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedBieter) {
      localStorage.setItem('selectedBieter', selectedBieter);
    } else {
      localStorage.removeItem('selectedBieter');
    }
  }, [selectedBieter]);

  useEffect(() => {
    if (selectedDok) {
      localStorage.setItem('selectedDok', selectedDok);
    } else {
      localStorage.removeItem('selectedDok');
    }
  }, [selectedDok]);
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
