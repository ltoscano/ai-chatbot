'use client';

import { ChatRequestOptions, Message } from 'ai';
import { Button } from './ui/button';
import { Dispatch, SetStateAction, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Textarea } from './ui/textarea';
import { deleteTrailingMessagesClient } from '@/app/(chat)/actions';
import { UseChatHelpers } from '@ai-sdk/react';

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Extract text content from parts instead of using deprecated content property
  const getTextFromMessage = (message: Message): string => {
    if (message.content) {
      return message.content;
    }
    
    // For messages loaded from database, extract text from parts
    if (message.parts) {
      const textParts = message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
      return textParts;
    }
    
    return '';
  };

  const [draftContent, setDraftContent] = useState<string>(getTextFromMessage(message));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await deleteTrailingMessagesClient({
        id: message.id,
      });

      // @ts-expect-error todo: support UIMessage in setMessages
      setMessages((messages: any) => {
        const index = messages.findIndex((m: any) => m.id === message.id);

        if (index !== -1) {
          const updatedMessage = {
            ...message,
            content: draftContent,
            parts: [{ type: 'text', text: draftContent }],
          };

          return [...messages.slice(0, index), updatedMessage];
        }

        return messages;
      });

      setMode('view');
      reload();
    } catch (error) {
      console.error('Error updating message:', error);
      // Optionally show a toast or error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
