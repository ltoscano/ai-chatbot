'use client';

import { Artifact } from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import { CopyIcon, LogsIcon, PlayIcon, FileIcon } from '@/components/icons';
import { Console, type ConsoleOutput } from '@/components/console';
import { toast } from 'sonner';

// WebContainer types
declare global {
  interface Window {
    WebContainer: any;
  }
}

interface NodeJSProjectData {
  files: Record<string, string>;
  startCommand: string;
}

interface NodeJSMetadata {
  projectData: NodeJSProjectData | null;
  selectedFile: string;
  isRunning: boolean;
  consoleOutputs: ConsoleOutput[];
  isWebContainerReady: boolean;
}

export const nodejsArtifact = new Artifact<'nodejs', NodeJSMetadata>({
  kind: 'nodejs',
  description: 'Create and run Node.js applications using WebContainers',
  actions: [
    {
      icon: <CopyIcon />,
      description: 'Copy current file to clipboard',
      onClick: async ({ metadata }) => {
        if (
          metadata.selectedFile &&
          metadata.projectData?.files[metadata.selectedFile]
        ) {
          await navigator.clipboard.writeText(
            metadata.projectData.files[metadata.selectedFile],
          );
          toast.success('Code copied to clipboard!');
        }
      },
      isDisabled: ({ metadata }) => !metadata.selectedFile,
    },
  ],
  toolbar: [],
  initialize: async ({ setMetadata }) => {
    setMetadata({
      projectData: null,
      selectedFile: '',
      isRunning: false,
      consoleOutputs: [],
      isWebContainerReady: false,
    });
  },
  onStreamPart: ({ streamPart, setMetadata }) => {
    if (streamPart.type === 'nodejs-delta') {
      try {
        const projectData = JSON.parse(
          streamPart.content as string,
        ) as NodeJSProjectData;

        // Verifica che projectData e files esistano
        if (
          !projectData ||
          !projectData.files ||
          Object.keys(projectData.files).length === 0
        ) {
          return;
        }

        setMetadata((prev) => ({
          ...(prev || {}),
          projectData,
          selectedFile:
            prev?.selectedFile ||
            (projectData.files['index.js']
              ? 'index.js'
              : projectData.files['app.js']
                ? 'app.js'
                : projectData.files['package.json']
                  ? 'package.json'
                  : Object.keys(projectData.files)[0] || ''),
        }));
      } catch (error) {
        console.error('Failed to parse Node.js project data:', error);
      }
    }
  },
  component: ({ artifact, metadata, onSaveContent, isReadonly }) => {
    const { projectData, selectedFile } = metadata;

    if (!projectData || !projectData.files) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">
            Loading Node.js project...
          </div>
        </div>
      );
    }

    const fileNames = Object.keys(projectData.files);

    return (
      <div className="flex flex-col h-full">
        {/* Header with info */}
        <div className="flex items-center gap-4 p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <FileIcon />
            <span className="font-medium">Node.js Project</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {fileNames.length} files • Command: {projectData.startCommand}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* File explorer sidebar */}
          <div className="w-64 border-r bg-muted/10">
            <div className="p-3 border-b">
              <div className="font-medium text-sm">Project Files</div>
            </div>
            <div className="p-2">
              {fileNames.map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => {
                    metadata.selectedFile = fileName;
                  }}
                  className={`w-full text-left p-2 rounded text-sm hover:bg-muted/40 ${
                    selectedFile === fileName ? 'bg-muted/60' : ''
                  }`}
                >
                  {fileName}
                </button>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div className="flex-1">
            {selectedFile && projectData.files[selectedFile] && (
              <CodeEditor
                language={
                  selectedFile.endsWith('.json') ? 'json' : 'javascript'
                }
                value={projectData.files[selectedFile]}
                onChange={(value) => {
                  if (!isReadonly) {
                    onSaveContent(
                      JSON.stringify(
                        {
                          ...projectData,
                          files: {
                            ...projectData.files,
                            [selectedFile]: value,
                          },
                        },
                        null,
                        2,
                      ),
                      true,
                    );
                  }
                }}
                readOnly={isReadonly}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
});
