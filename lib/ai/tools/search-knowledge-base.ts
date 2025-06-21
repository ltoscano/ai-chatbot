import { tool } from 'ai';
import { z } from 'zod';

export const searchKnowledgeBase = tool({
  description: 'Search documents and attachments in the project knowledge base using the blob server. Only use this tool when a project is associated with the chat.',
  parameters: z.object({
    query: z.string().describe('The search query to look for in the project documents'),
    userId: z.string().describe('The user ID to search within'),
    projectId: z.string().describe('The project ID to search within'),
    topK: z.number().optional().default(5).describe('Number of top results to return (default: 5)'),
  }),
  execute: async ({ query, userId, projectId, topK = 5 }) => {
    try {
      const blobServerUrl = process.env.BLOB_SERVER_URL || 'http://blob-server:8000';
      const searchUrl = `${blobServerUrl}/blob/project/search/${userId}/${projectId}`;

      const formData = new FormData();
      formData.append('query', query);
      formData.append('top_k', topK.toString());

      const response = await fetch(searchUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Blob server returned ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();

      return {
        query,
        userId,
        projectId,
        topK,
        results,
        timestamp: new Date().toISOString(),
        status: 'success',
      };
    } catch (error) {
      console.error('Knowledge base search failed:', error);
      
      return {
        query,
        userId,
        projectId,
        topK,
        results: [],
        timestamp: new Date().toISOString(),
        status: 'error',
        error: `Knowledge base search failed: ${(error as Error).message}`,
      };
    }
  },
});