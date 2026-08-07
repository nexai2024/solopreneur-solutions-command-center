'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { fetchProjects, Project } from './build-tracker';

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  setActiveProjectId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  activeProjectId: null,
  activeProject: null,
  setActiveProjectId: () => {},
  refreshProjects: async () => {},
  loading: true,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchProjects(user.id);
      setProjects(data);

      // Filter for non-archived projects for the default selection
      const activeProjects = data.filter(p => p.status !== 'archived');

      // If there's an active project ID but it's not in the active list, clear it or pick a new one
      if (activeProjectId && !activeProjects.find(p => p.id === activeProjectId)) {
        setActiveProjectId(activeProjects.length > 0 ? activeProjects[0].id : (data.length > 0 ? data[0].id : null));
      }
      // If no active project is set but we have active projects, set the first one
      else if (!activeProjectId && activeProjects.length > 0) {
        setActiveProjectId(activeProjects[0].id);
      }
    } catch (error) {
      console.error('Error refreshing projects:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeProjectId]);

  useEffect(() => {
    refreshProjects();
  }, [user]); // Only refresh when user changes initially

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
