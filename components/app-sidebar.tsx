'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon, DownloadIcon, UploadIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const params = useParams();
  
  // Extract chat ID from URL
  const currentChatId = pathname.startsWith('/chat/') ? params.id as string : null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const chatData = JSON.parse(e.target?.result as string);
        const response = await fetch('/api/chat/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatData)
        });
        
        if (!response.ok) throw new Error('Failed to import chat');
        
        const result = await response.json();
        setOpenMobile(false);
        router.push(`/chat/${result.chatId}`);
        router.refresh();
      } catch (error) {
        console.error('Error importing chat:', error);
        alert('Error importing chat. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadCurrentChat = async () => {
    if (!currentChatId) {
      alert('No chat selected to download');
      return;
    }

    try {
      const response = await fetch(`/api/chat/export?id=${currentChatId}`);
      if (!response.ok) throw new Error('Failed to export chat');
      
      const chatData = await response.json();
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${currentChatId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading chat:', error);
      alert('Error downloading chat');
    }
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Chatbot
              </span>
            </Link>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push('/');
                      router.refresh();
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={downloadCurrentChat}
                    disabled={!currentChatId}
                  >
                    <DownloadIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">
                  {currentChatId ? 'Download Current Chat' : 'No chat to download'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Upload Chat</TooltipContent>
              </Tooltip>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
