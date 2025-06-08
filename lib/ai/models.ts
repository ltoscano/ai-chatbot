export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google most capable model for complex reasoning',
  },
  {
    id: 'claude-anthropic',
    name: 'Anthropic Claude 4',
    description: 'Anthropic’s most capable model for complex reasoning',
  },
];
