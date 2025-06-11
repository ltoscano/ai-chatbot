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
  MenuIcon,
} from './icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { toast } from './toast';

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
          description: 'MCP tools cache invalidated successfully',
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
              <MenuIcon size={16} />
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
                  Invalidate MCP tools cache
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
