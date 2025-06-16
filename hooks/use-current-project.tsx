'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface CurrentProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
  syncProjectToServer: (
    chatId: string,
    projectId: string | null,
  ) => Promise<void>;
  loadProjectFromServer: (chatId: string) => Promise<void>;
}

const CurrentProjectContext = createContext<CurrentProjectContextType | null>(
  null,
);

export function CurrentProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { data: session } = useSession();

  // Wrapper per il setCurrentProjectId con logging
  const setCurrentProjectIdWithLogging = (projectId: string | null) => {
    console.log('setCurrentProjectId called with:', projectId);
    setCurrentProjectId(projectId);
  };

  const syncProjectToServer = async (
    chatId: string,
    projectId: string | null,
  ) => {
    if (!projectId || !session?.user?.id) return;

    try {
      const serverUrl =
        process.env.NEXT_PUBLIC_PROJECTS_URL_SERVER || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('project_id', projectId);

      const response = await fetch(
        `${serverUrl}/addProjectId/${session.user.id}/${chatId}`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        console.error('Failed to save project mapping:', await response.text());
      }
    } catch (error) {
      console.error('Error saving project mapping:', error);
    }
  };

  const loadProjectFromServer = async (chatId: string) => {
    if (!session?.user?.id || !chatId) {
      console.log('loadProjectFromServer: Missing session or chatId', {
        userId: session?.user?.id,
        chatId,
      });
      return;
    }

    try {
      const serverUrl =
        process.env.NEXT_PUBLIC_PROJECTS_URL_SERVER || 'http://localhost:8000';
      const url = `${serverUrl}/getProjectId/${session.user.id}?chat_id=${chatId}`;
      console.log('loadProjectFromServer: Fetching from', url);

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('loadProjectFromServer: Response data', data);

        // Gestisce sia il formato con project_mappings che il formato diretto
        let projectId = null;

        if (data.success) {
          if (data.project_mappings && data.project_mappings.length > 0) {
            // Formato con array di mappature
            projectId = data.project_mappings[0].project_id;
            console.log(
              'loadProjectFromServer: Found project in project_mappings array:',
              projectId,
            );
          } else if (data.project_id) {
            // Formato diretto con project_id nella radice
            projectId = data.project_id;
            console.log(
              'loadProjectFromServer: Found project in direct format:',
              projectId,
            );
          } else {
            console.log(
              'loadProjectFromServer: No project_id found in response data',
            );
          }

          console.log(
            'loadProjectFromServer: Final projectId to set:',
            projectId,
          );
          setCurrentProjectIdWithLogging(projectId);
        } else {
          console.log(
            'loadProjectFromServer: Server response not successful',
            data,
          );
          console.log(
            'loadProjectFromServer: Resetting currentProjectId to null',
          );
          setCurrentProjectIdWithLogging(null);
        }
      } else {
        console.error('loadProjectFromServer: HTTP error', response.status);
        const errorText = await response.text();
        console.error('loadProjectFromServer: Error response:', errorText);

        // Se il server restituisce 404 o errore simile, significa che non c'è mapping
        if (response.status === 404) {
          console.log(
            'loadProjectFromServer: No mapping found (404), resetting to null',
          );
          setCurrentProjectIdWithLogging(null);
        }
      }
    } catch (error) {
      console.error('Error loading project mapping:', error);
    }
  };

  return (
    <CurrentProjectContext.Provider
      value={{
        currentProjectId,
        setCurrentProjectId: setCurrentProjectIdWithLogging,
        syncProjectToServer,
        loadProjectFromServer,
      }}
    >
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = useContext(CurrentProjectContext);
  if (!context) {
    throw new Error(
      'useCurrentProject must be used within a CurrentProjectProvider',
    );
  }
  return context;
}
