'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { FileIcon, PlusIcon, TrashIcon, LoaderIcon } from './icons';
import { cn } from '@/lib/utils';
import { toast } from './toast';

interface Project {
  project_name: string;
  sanitized_name: string;
  description?: string;
  upload_time: string;
  file_tree: FileTreeNode;
  tree_text: string;
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  extension?: string;
  children?: FileTreeNode[];
}

interface ProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
}

export function ProjectsDialog({
  open,
  onOpenChange,
  currentProjectId,
  onProjectSelect,
}: ProjectsDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Dialog states
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);
  const [showProjectDescriptionDialog, setShowProjectDescriptionDialog] =
    useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [projectToShowDescription, setProjectToShowDescription] =
    useState<Project | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id || 'default-user'; // Fallback per compatibilità
  const serverUrl =
    process.env.NEXT_PUBLIC_PROJECTS_URL_SERVER || 'http://localhost:8000';

  // Carica la lista dei progetti
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${serverUrl}/list/projects/${userId}`);
      const data = await response.json();

      if (data.success) {
        // Assicuriamoci che ogni progetto abbia un upload_time valido
        const projectsWithValidDates = (data.projects || []).map(
          (project: any) => ({
            ...project,
            upload_time:
              project.upload_time ||
              project.created_time ||
              new Date().toISOString(),
          }),
        );

        // Ordina i progetti dal più recente al meno recente
        const sortedProjects = projectsWithValidDates.sort(
          (a: Project, b: Project) => {
            const dateA = new Date(a.upload_time);
            const dateB = new Date(b.upload_time);
            return dateB.getTime() - dateA.getTime(); // Ordine decrescente (più recente prima)
          },
        );

        setProjects(sortedProjects);
      } else {
        toast({
          type: 'error',
          description: data.error || 'Failed to load projects',
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        type: 'error',
        description: 'Failed to load projects',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carica i dettagli di un progetto specifico
  const loadProjectDetails = async (projectName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${serverUrl}/project/${userId}?project_name=${encodeURIComponent(projectName)}`,
      );
      const data = await response.json();

      if (data.success) {
        const project: Project = {
          project_name: data.project_name,
          sanitized_name: data.sanitized_name,
          description: data.description,
          upload_time: data.upload_time || new Date().toISOString(),
          file_tree: data.file_tree,
          tree_text: data.tree,
        };
        setSelectedProject(project);
        setActiveTab('files');
      } else {
        toast({
          type: 'error',
          description: data.error || 'Failed to load project details',
        });
      }
    } catch (error) {
      console.error('Error loading project details:', error);
      toast({
        type: 'error',
        description: 'Failed to load project details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Crea un nuovo progetto utilizzando l'endpoint create per creare un progetto vuoto
  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        type: 'error',
        description: 'Project name is required',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Utilizziamo l'endpoint specifico per creare progetti vuoti
      const formData = new FormData();
      formData.append('project_name', newProjectName);
      if (newProjectDescription.trim()) {
        formData.append('description', newProjectDescription);
      }

      const response = await fetch(`${serverUrl}/project/${userId}/create`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          type: 'success',
          description: 'Project created successfully',
        });

        // Seleziona automaticamente il progetto appena creato (senza toast aggiuntivo)
        // onProjectSelect(newProjectName);
        // Carica automaticamente i dettagli del progetto selezionato
        //loadProjectDetails(newProjectName);

        setNewProjectName('');
        setNewProjectDescription('');
        loadProjects();
        setActiveTab('projects');
      } else {
        toast({
          type: 'error',
          description: data.error || 'Failed to create project',
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        type: 'error',
        description: 'Failed to create project',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Elimina un file da un progetto
  const deleteFile = async (projectName: string, filePath: string) => {
    setIsLoading(true);
    try {
      // Usa la nuova rotta con i parametri nell'URL
      const response = await fetch(
        `${serverUrl}/project/file/${userId}/${encodeURIComponent(projectName)}/${encodeURIComponent(filePath)}`,
        {
          method: 'DELETE',
        },
      );

      const data = await response.json();

      if (data.success) {
        toast({
          type: 'success',
          description: 'File deleted successfully',
        });

        // Aggiorna direttamente l'albero dei file e i dettagli del progetto con i dati ricevuti
        if (selectedProject && data.file_tree) {
          setSelectedProject({
            ...selectedProject,
            file_tree: data.file_tree,
            tree_text: data.tree,
          });
        }
      } else {
        toast({
          type: 'error',
          description: data.error || 'Failed to delete file',
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        type: 'error',
        description: 'Failed to delete file',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Elimina un progetto
  const deleteProject = async (projectName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${serverUrl}/project/${userId}/${encodeURIComponent(projectName)}`,
        {
          method: 'DELETE',
        },
      );

      const data = await response.json();

      if (data.success) {
        toast({
          type: 'success',
          description: 'Project deleted successfully',
        });

        if (currentProjectId === projectName) {
          onProjectSelect(null);
        }

        loadProjects();
        setSelectedProject(null);
        setActiveTab('projects');
      } else {
        toast({
          type: 'error',
          description: data.error || 'Failed to delete project',
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        type: 'error',
        description: 'Failed to delete project',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carica file nel progetto
  const uploadFilesToProject = async () => {
    if (!selectedProject || !uploadFiles || uploadFiles.length === 0) {
      toast({
        type: 'error',
        description: 'Please select files to upload',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload di ogni file singolarmente usando l'endpoint standard
      for (let i = 0; i < uploadFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', uploadFiles[i]);
        formData.append('project_name', selectedProject.project_name);

        const response = await fetch(`${serverUrl}/project/${userId}`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            `Failed to upload ${uploadFiles[i].name}: ${data.error}`,
          );
        }
      }

      toast({
        type: 'success',
        description: `${uploadFiles.length} file(s) uploaded successfully`,
      });

      setUploadFiles(null);
      loadProjectDetails(selectedProject.project_name);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to upload files',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestione drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadFiles(files);
    }
  };

  // Seleziona un progetto come corrente
  const selectProject = (projectName: string) => {
    onProjectSelect(projectName);
    // Carica automaticamente i dettagli del progetto selezionato
    loadProjectDetails(projectName);
    // toast({
    //   type: 'success',
    //   description: `Project "${projectName}" selected`,
    // });
  };

  // Deseleziona il progetto corrente
  const clearProjectSelection = () => {
    onProjectSelect(null);
    setSelectedProject(null);
    setUploadFiles(null);
    // toast({
    //   type: 'success',
    //   description: 'Project selection cleared',
    // });
  };

  // Effetto per caricare i progetti all'apertura
  useEffect(() => {
    if (open) {
      loadProjects();
      // Se c'è già un progetto selezionato, carica i suoi dettagli
      if (currentProjectId) {
        loadProjectDetails(currentProjectId);
      }
    }
  }, [open, currentProjectId]);

  // Pulisce il file selezionato quando cambia il progetto selezionato
  useEffect(() => {
    setSelectedFile('');
  }, [selectedProject]);

  // Renderizza l'albero dei file con possibilità di selezionare ed eliminare
  const renderFileTree = (node: FileTreeNode, level = 0) => {
    const isFile = node.type === 'file';
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path} className={cn('ml-4', level === 0 && 'ml-0')}>
        <div
          className={cn(
            'flex items-start gap-2 py-1 px-2 rounded group hover:bg-muted/50',
            isFile && 'cursor-pointer',
            isSelected && 'bg-blue-50 border border-blue-200',
          )}
          onClick={() => {
            if (isFile) {
              setSelectedFile(isSelected ? '' : node.path);
            }
          }}
        >
          <div className="flex items-center gap-2 flex-shrink-0 w-6 mt-0.5">
            {node.type === 'directory' ? (
              <div className="text-blue-600">📁</div>
            ) : (
              <FileIcon size={16} />
            )}
          </div>
          <div className="w-32 flex-shrink-0">
            <span className="text-sm block break-words">{node.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {node.type === 'file' && node.size && (
              <Badge variant="outline" className="text-xs">
                {Math.round(node.size / 1024)}KB
              </Badge>
            )}
            {isFile && isSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(node.path);
                  setShowDeleteFileDialog(true);
                }}
              >
                <TrashIcon size={12} />
              </Button>
            )}
          </div>
        </div>
        {node.children && (
          <div className="ml-4">
            {node.children.map((child) => renderFileTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Project Manager</DialogTitle>
            <DialogDescription>
              Manage your projects and files. Select a project to use with
              specific tools.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 overflow-auto">
            <div className="p-4 space-y-4 min-h-[600px]">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="files" disabled={!currentProjectId}>
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="create">Create</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Your Projects</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearProjectSelection}
                        disabled={!currentProjectId}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadProjects}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {currentProjectId && (
                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <FileIcon size={16} />
                          <span className="font-medium">Current Project:</span>
                          <Badge variant="secondary">{currentProjectId}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoaderIcon size={16} />
                        <span className="ml-2">Loading projects...</span>
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        No projects found. Create your first project!
                      </div>
                    ) : (
                      <>
                        {projects.map((project) => (
                          <Card
                            key={project.sanitized_name}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-muted/50',
                              currentProjectId === project.project_name &&
                                'border-blue-200 bg-blue-50/50',
                            )}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  className="flex-1 text-left"
                                  onClick={() =>
                                    loadProjectDetails(project.project_name)
                                  }
                                >
                                  <h4 className="font-medium">
                                    {project.project_name}
                                  </h4>
                                  {project.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {project.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(() => {
                                      try {
                                        const date = new Date(
                                          project.upload_time,
                                        );
                                        return Number.isNaN(date.getTime())
                                          ? 'Date not available'
                                          : date.toLocaleDateString();
                                      } catch {
                                        return 'Date not available';
                                      }
                                    })()}
                                  </p>
                                </button>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      selectProject(project.project_name)
                                    }
                                    disabled={
                                      currentProjectId === project.project_name
                                    }
                                  >
                                    {currentProjectId === project.project_name
                                      ? 'Selected'
                                      : 'Select'}
                                  </Button>
                                  {project.description && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setProjectToShowDescription(project);
                                        setShowProjectDescriptionDialog(true);
                                      }}
                                      title="View description"
                                    >
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                      </svg>
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setProjectToDelete(project.project_name);
                                      setShowDeleteProjectDialog(true);
                                    }}
                                  >
                                    <TrashIcon size={14} />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="space-y-4">
                  {selectedProject && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">
                            {selectedProject.project_name}
                          </h3>
                          {selectedProject.description && (
                            <p className="text-sm text-muted-foreground">
                              {selectedProject.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('projects')}
                        >
                          Back to Projects
                        </Button>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                File Tree
                              </CardTitle>
                            </div>
                            {selectedFile && (
                              <p className="text-xs text-muted-foreground">
                                Click on a file to select it. Selected file will
                                show a delete button.
                              </p>
                            )}
                            {!selectedFile && selectedProject?.file_tree && (
                              <p className="text-xs text-muted-foreground">
                                Click on a file to select it for deletion.
                              </p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-64">
                              {selectedProject.file_tree &&
                                renderFileTree(selectedProject.file_tree)}
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Upload Files
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div
                              className={cn(
                                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                                isDragOver
                                  ? 'border-blue-500 bg-blue-50/50'
                                  : 'border-gray-300 hover:border-gray-400',
                              )}
                              onDragEnter={handleDragEnter}
                              onDragLeave={handleDragLeave}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                            >
                              <div className="space-y-2">
                                <FileIcon size={24} />
                                <div>
                                  <p className="text-sm font-medium">
                                    Drag and drop files here, or{' '}
                                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                                      browse
                                      <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                          setUploadFiles(e.target.files)
                                        }
                                      />
                                    </label>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Select multiple files to upload to your
                                    project
                                  </p>
                                </div>
                              </div>
                            </div>

                            {uploadFiles && uploadFiles.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">
                                  Selected files ({uploadFiles.length}):
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {Array.from(uploadFiles).map((file) => (
                                    <div
                                      key={`${file.name}-${file.size}-${file.lastModified}`}
                                      className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1"
                                    >
                                      <FileIcon size={12} />
                                      <span className="flex-1 truncate">
                                        {file.name}
                                      </span>
                                      <span className="text-gray-500">
                                        {Math.round(file.size / 1024)}KB
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Button
                              onClick={uploadFilesToProject}
                              disabled={
                                isLoading ||
                                !uploadFiles ||
                                uploadFiles.length === 0
                              }
                              className="w-full"
                            >
                              {isLoading ? (
                                <>
                                  <LoaderIcon size={14} />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <PlusIcon size={14} />
                                  Upload Files
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="create" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Create New Project</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a new empty project. The project will be completely
                      empty and you can add files later using the upload
                      functionality.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        placeholder="My Amazing Project"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="projectDescription">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="projectDescription"
                        placeholder="Describe your project..."
                        value={newProjectDescription}
                        onChange={(e) =>
                          setNewProjectDescription(e.target.value)
                        }
                      />
                    </div>

                    <Button
                      onClick={createProject}
                      disabled={isLoading || !newProjectName.trim()}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <LoaderIcon size={14} />
                          Creating Project...
                        </>
                      ) : (
                        <>
                          <PlusIcon size={14} />
                          Create Project
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog per visualizzare la descrizione del progetto */}
      <AlertDialog
        open={showProjectDescriptionDialog}
        onOpenChange={setShowProjectDescriptionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {projectToShowDescription?.project_name}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {projectToShowDescription?.description ||
                'No description available'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowProjectDescriptionDialog(false);
                setProjectToShowDescription(null);
              }}
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog di conferma eliminazione progetto */}
      <AlertDialog
        open={showDeleteProjectDialog}
        onOpenChange={setShowDeleteProjectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the project "{projectToDelete}"?
              This action cannot be undone and will permanently delete all
              project files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete);
                }
                setShowDeleteProjectDialog(false);
                setProjectToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog di conferma eliminazione file */}
      <AlertDialog
        open={showDeleteFileDialog}
        onOpenChange={setShowDeleteFileDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the file "{fileToDelete}"? This
              action cannot be undone and will permanently delete the file from
              your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fileToDelete && selectedProject) {
                  deleteFile(selectedProject.project_name, fileToDelete);
                  setSelectedFile('');
                }
                setShowDeleteFileDialog(false);
                setFileToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
