import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('id');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const messages = await getMessagesByChatId({ id: chatId });

    const exportData = {
      chat: {
        id: chat.id,
        title: chat.title,
        visibility: chat.visibility,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      messages: messages.map(message => ({
        id: message.id,
        role: message.role,
        parts: message.parts,
        attachments: message.attachments || [],
        createdAt: message.createdAt,
      })),
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.id,
        version: '1.0',
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting chat:', error);
    return new ChatSDKError('server_error:chat').toResponse();
  }
}