'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
  ToolIcon,
  FileIcon,
} from './icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { toast } from './toast';
import { ProjectsDialog } from './projects-dialog';

export type VisibilityType = 'private' | 'public';

const visibilities: Array<{
  id: VisibilityType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can access this chat',
    icon: <LockIcon />,
  },
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone with the link can access this chat',
    icon: <GlobeIcon />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType: selectedVisibilityType,
  });

  const selectedVisibility = useMemo(
    () => visibilities.find((visibility) => visibility.id === visibilityType),
    [visibilityType],
  );

  const handleHubRefresh = async () => {
    try {
      const response = await fetch('/api/mcp/invalidate-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          type: 'success',
          description: 'MCP tools cache refreshed successfully',
        });
      } else {
        toast({
          type: 'error',
          description: result.message || 'Failed to invalidate MCP tools cache',
        });
      }

      setHubMenuOpen(false);
    } catch (error) {
      console.error('Error invalidating cache:', error);
      toast({
        type: 'error',
        description: 'Failed to invalidate MCP tools cache',
      });
    }
  };

  const handleProjectSelect = (projectId: string | null) => {
    setCurrentProjectId(projectId);
    setHubMenuOpen(false);

    if (projectId) {
      toast({
        type: 'success',
        description: `Project selected: ${projectId}`,
      });
    } else {
      toast({
        type: 'success',
        description: 'Project selection cleared',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
            className,
          )}
        >
          <Button
            data-testid="visibility-selector"
            variant="outline"
            className="hidden md:flex md:px-2 md:h-[34px]"
          >
            {selectedVisibility?.icon}
            {selectedVisibility?.label}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[300px]">
          {visibilities.map((visibility) => (
            <DropdownMenuItem
              data-testid={`visibility-selector-item-${visibility.id}`}
              key={visibility.id}
              onSelect={() => {
                setVisibilityType(visibility.id);
                setOpen(false);
              }}
              className="gap-4 group/item flex flex-row justify-between items-center"
              data-active={visibility.id === visibilityType}
            >
              <div className="flex flex-col gap-1 items-start">
                {visibility.label}
                {visibility.description && (
                  <div className="text-xs text-muted-foreground">
                    {visibility.description}
                  </div>
                )}
              </div>
              <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hub Refresh Menu - shown only when Private is selected */}
      {visibilityType === 'private' && (
        <DropdownMenu open={hubMenuOpen} onOpenChange={setHubMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex md:px-2 md:h-[34px]"
            >
              <ToolIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleHubRefresh}
              className="cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <span>Hub Refresh</span>
                <span className="text-xs text-muted-foreground">
                  Rediscovery MCP tools and resources
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setProjectsDialogOpen(true)}
              className="cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <FileIcon size={14} />
                  <span>Projects</span>
                  {currentProjectId && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                      {currentProjectId}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Manage and select projects for tool operations
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ProjectsDialog
        open={projectsDialogOpen}
        onOpenChange={setProjectsDialogOpen}
        onProjectSelect={handleProjectSelect}
        currentProjectId={currentProjectId}
      />
    </div>
  );
}
