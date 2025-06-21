import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { saveChat, saveMessages, getChatById, deleteChatById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID } from '@/lib/utils';

interface ImportChatData {
  chat: {
    id?: string;
    title: string;
    visibility: 'public' | 'private';
    createdAt?: string;
    updatedAt?: string;
  };
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant';
    parts: any[];
    attachments?: any[];
    createdAt?: string;
  }>;
  metadata?: {
    exportedAt?: string;
    exportedBy?: string;
    version?: string;
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const importData: ImportChatData = await request.json();

    if (!importData.chat || !importData.messages) {
      return NextResponse.json(
        { error: 'Invalid chat data format' },
        { status: 400 }
      );
    }

    // Generate new chat ID or use existing one
    const chatId = importData.chat.id || generateUUID();
    
    // Check if chat already exists and belongs to the user
    let existingChat = null;
    try {
      existingChat = await getChatById({ id: chatId });
    } catch (error) {
      console.log(`Chat ${chatId} does not exist yet, will create new one`);
      existingChat = null;
    }
    
    if (existingChat && existingChat.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot overwrite chat that belongs to another user' },
        { status: 403 }
      );
    }

    // If chat exists, delete it first to ensure clean import
    if (existingChat) {
      console.log(`Deleting existing chat: ${chatId}`);
      await deleteChatById({ id: chatId });
      console.log(`Chat deleted successfully: ${chatId}`);
    }

    // Save chat
    console.log(`Saving chat: ${chatId}`);
    await saveChat({
      id: chatId,
      userId: session.user.id,
      title: importData.chat.title,
      visibility: importData.chat.visibility,
    });
    console.log(`Chat saved successfully: ${chatId}`);

    // Prepare messages for saving - always generate new IDs to avoid conflicts
    const messagesWithIds = importData.messages.map(message => ({
      id: message.id || generateUUID(), // Always generate new ID to avoid conflicts
      chatId: chatId,
      role: message.role,
      parts: message.parts,
      attachments: message.attachments || [],
      createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
    }));

    // Save messages
    await saveMessages({ messages: messagesWithIds });

    return NextResponse.json({
      success: true,
      chatId: chatId,
      message: existingChat ? 'Chat updated successfully' : 'Chat imported successfully',
    });

  } catch (error) {
    console.error('Error importing chat:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to import chat. Please check the file format.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}