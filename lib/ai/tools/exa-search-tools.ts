import { tool } from 'ai';
import { z } from 'zod';
import { ExaSearchResults, ExaFindSimilarResults } from '@langchain/exa';
import Exa from 'exa-js';

// Types for better type safety
interface ExaResult {
  rank: number;
  title: string;
  url: string;
  snippet: string;
  score: number;
  publishedDate: string | null;
  author: string | null;
  domain: string;
  id: string;
  sourceQuery?: string;
  contentCategory?: string;
}

interface ExaSearchResponse {
  query: string;
  totalResults: number;
  results: ExaResult[];
  timestamp: string;
  source: string;
  status: 'success' | 'error' | 'parse_error';
  error?: string;
  rawData?: string;
}

interface ExaContentResult extends ExaResult {
  content: {
    text: string | null;
    highlights: string[];
    summary: string | null;
  };
}

interface ExaContentResponse {
  query: string;
  totalResults: number;
  results: ExaContentResult[];
  timestamp: string;
  source: string;
  status: 'success' | 'error';
  error?: string;
}

interface ResearchScope {
  focusAreas: string[];
  contentTypes: string[];
  timeRange: string;
  depth: 'quick' | 'standard' | 'comprehensive';
}

interface ResearchSummary {
  totalQueries: number;
  totalResults: number;
  uniqueResults: number;
  successfulQueries: number;
}

interface QueryResult {
  query: string;
  contentType?: string;
  resultCount: number;
  status: 'success' | 'error';
  error?: string;
}

// Initialize Exa client
const client = new Exa(process.env.EXA_API_KEY as string);

// Search type enum
const SearchType = z.enum(['neural', 'keyword', 'auto']);
const ContentCategory = z.enum([
  'company',
  'research paper',
  'news',
  'github',
  'tweet',
  'movie',
  'song',
  'personal site',
  'pdf',
]);
const TextType = z.enum(['text', 'html']);
const SummaryLength = z.enum(['short', 'medium', 'long']);
const TimeRange = z.enum(['day', 'week', 'month', 'quarter', 'year']);
const ResearchDepth = z.enum(['quick', 'standard', 'comprehensive']);

// Basic search tool
export const searchExa = tool({
  description:
    'Search the web using Exa for high-quality, AI-optimized results with better content understanding. Do not show to the user the raw results just a summary of the results.',
  parameters: z.object({
    query: z.string().describe('The search query to look for'),
    numResults: z
      .number()
      .optional()
      .default(5)
      .describe('Number of results to return (1-20)'),
    type: SearchType.optional()
      .default('auto')
      .describe(
        'Search type: neural for semantic search, keyword for traditional, auto for best match',
      ),
    category: ContentCategory.optional().describe('Filter results by category'),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe('Only include results from these domains'),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe('Exclude results from these domains'),
    startPublishedDate: z
      .string()
      .optional()
      .describe('Filter results published after this date (YYYY-MM-DD)'),
    endPublishedDate: z
      .string()
      .optional()
      .describe('Filter results published before this date (YYYY-MM-DD)'),
  }),
  execute: async ({
    query,
    numResults = 5,
    type = 'auto',
    category,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    endPublishedDate,
  }) => {
    try {
      const searchTool = new ExaSearchResults({
        client,
        searchArgs: {
          numResults: Math.min(numResults, 20),
          type: type as 'neural' | 'keyword' | 'auto',
          category: category as any,
          includeDomains: includeDomains,
          excludeDomains: excludeDomains,
          startPublishedDate: startPublishedDate,
          endPublishedDate: endPublishedDate,
        },
      });

      const rawResults = await searchTool.invoke(query);
      const formattedResults = parseExaResults(rawResults, query);

      return formattedResults;
    } catch (error) {
      const errorResult = {
        error: `Exa search failed: ${(error as Error).message}`,
        query: query,
        timestamp: new Date().toISOString(),
        totalResults: 0,
        results: [],
        source: 'exa',
        status: 'error',
      };
      return errorResult;
    }
  },
});

// Advanced search with content extraction
export const searchExaWithContent = tool({
  description:
    'Search with Exa and extract full content from results for deeper analysis. . Do not show to the user the raw results just a summary of the results.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    numResults: z
      .number()
      .optional()
      .default(3)
      .describe('Number of results (1-10)'),
    includeText: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include extracted text content'),
    includeHighlights: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include highlighted relevant sections'),
    textType: TextType.optional()
      .default('text')
      .describe('Format of extracted content'),
    summaryLength: SummaryLength.optional().describe(
      'Length of content summary',
    ),
    category: ContentCategory.optional().describe('Content category filter'),
  }),
  execute: async ({
    query,
    numResults = 3,
    includeText = true,
    includeHighlights = true,
    textType = 'text',
    summaryLength,
    category,
  }) => {
    try {
      // First, perform the search
      const searchTool = new ExaSearchResults({
        client,
        searchArgs: {
          numResults: Math.min(numResults, 10),
          type: 'auto',
          category: category as any,
        },
      });

      const searchResults = await searchTool.invoke(query);

      // Extract URLs from search results
      const urls = extractUrlsFromResults(searchResults);

      if (urls.length === 0) {
        const errorResult = {
          query: query,
          totalResults: 0,
          results: [],
          timestamp: new Date().toISOString(),
          source: 'exa_with_content',
          status: 'error',
          error: 'No valid URLs found in search results',
        };
        return errorResult;
      }

      // Get content for each URL
      const contentResults = await client.getContents(urls, {
        text: includeText ? true : undefined,
        highlights: includeHighlights ? true : undefined,
        summary: summaryLength ? true : undefined,
      });

      // Combine search results with content
      const enrichedResults = combineSearchAndContent(
        searchResults,
        contentResults,
        query,
      );

      return enrichedResults;
    } catch (error) {
      const errorResult = {
        query: query,
        totalResults: 0,
        results: [],
        timestamp: new Date().toISOString(),
        source: 'exa_with_content',
        status: 'error',
        error: `Exa content search failed: ${(error as Error).message}`,
      };
      return errorResult;
    }
  },
});

// Find similar content tool
export const findSimilarExa = tool({
  description:
    'Find content similar to a given URL using Exa semantic similarity',
  parameters: z.object({
    url: z
      .string()
      .url()
      .describe('The reference URL to find similar content for'),
    numResults: z
      .number()
      .optional()
      .default(5)
      .describe('Number of similar results to return'),
    category: ContentCategory.optional().describe(
      'Filter similar content by category',
    ),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe('Only search within these domains'),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe('Exclude these domains from results'),
    startPublishedDate: z
      .string()
      .optional()
      .describe('Only include content published after this date'),
    endPublishedDate: z
      .string()
      .optional()
      .describe('Only include content published before this date'),
  }),
  execute: async ({
    url,
    numResults = 5,
    category,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    endPublishedDate,
  }) => {
    try {
      const similarTool = new ExaFindSimilarResults({
        client,
        searchArgs: {
          numResults: Math.min(numResults, 20),
          category: category as any,
          includeDomains: includeDomains,
          excludeDomains: excludeDomains,
          startPublishedDate: startPublishedDate,
          endPublishedDate: endPublishedDate,
        },
      });

      const rawResults = await similarTool.invoke(url);
      const formattedResults = parseExaResults(
        rawResults,
        `Similar to: ${url}`,
      );

      return {
        ...formattedResults,
        referenceUrl: url,
        searchType: 'similarity',
      };
    } catch (error) {
      const errorResult = {
        error: `Exa similarity search failed: ${(error as Error).message}`,
        query: `Similar to: ${url}`,
        referenceUrl: url,
        searchType: 'similarity',
        timestamp: new Date().toISOString(),
        totalResults: 0,
        results: [],
        source: 'exa',
        status: 'error',
      };
      return errorResult;
    }
  },
});

// Research assistant tool - combines multiple Exa capabilities
export const researchWithExa = tool({
  description:
    'Comprehensive research tool that combines search, similarity, and content analysis',
  parameters: z.object({
    topic: z.string().describe('The research topic or question'),
    focusAreas: z
      .array(z.string())
      .optional()
      .describe('Specific areas or aspects to explore'),
    contentTypes: z
      .array(ContentCategory)
      .optional()
      .describe('Types of content to prioritize'),
    timeRange: TimeRange.optional().describe(
      'How recent the content should be',
    ),
    depth: ResearchDepth.optional()
      .default('standard')
      .describe('Research depth level'),
  }),
  execute: async ({
    topic,
    focusAreas = [],
    contentTypes = [],
    timeRange,
    depth = 'standard',
  }) => {
    try {
      const resultsPerQuery =
        depth === 'quick' ? 3 : depth === 'standard' ? 5 : 8;
      const maxQueries = depth === 'quick' ? 2 : depth === 'standard' ? 4 : 6;

      // Calculate date filter
      let startDate: string | undefined;
      if (timeRange) {
        const now = new Date();
        const daysBack: Record<string, number> = {
          day: 1,
          week: 7,
          month: 30,
          quarter: 90,
          year: 365,
        };

        startDate = new Date(
          now.getTime() - daysBack[timeRange] * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0];
      }

      // Generate research queries
      const queries = [topic];

      if (focusAreas.length > 0) {
        focusAreas.slice(0, maxQueries - 1).forEach((area) => {
          queries.push(`${topic} ${area}`);
        });
      } else {
        // Default research angles
        const defaultAngles = [
          `${topic} overview introduction`,
          `${topic} latest developments 2024`,
          `${topic} challenges problems issues`,
          `${topic} best practices solutions`,
          `${topic} future trends predictions`,
        ];
        queries.push(...defaultAngles.slice(0, maxQueries - 1));
      }

      const allResults: ExaResult[] = [];
      const queryResults: QueryResult[] = [];

      // Execute searches for each content type and query combination
      const contentTypesToUse =
        contentTypes.length > 0
          ? contentTypes
          : (['news', 'research paper', 'company'] as const);

      for (const query of queries) {
        for (const contentType of contentTypesToUse) {
          try {
            const searchTool = new ExaSearchResults({
              client,
              searchArgs: {
                numResults: resultsPerQuery,
                type: 'auto',
                category: contentType as any,
                startPublishedDate: startDate,
              },
            });

            const rawResults = await searchTool.invoke(query);
            const parsedResults = parseExaResults(rawResults, query);

            if (parsedResults.results && parsedResults.results.length > 0) {
              allResults.push(
                ...parsedResults.results.map((r) => ({
                  ...r,
                  sourceQuery: query,
                  contentCategory: contentType,
                })),
              );

              queryResults.push({
                query: query,
                contentType: contentType,
                resultCount: parsedResults.results.length,
                status: 'success',
              });
            }

            // Rate limiting - be respectful to the API
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            queryResults.push({
              query: query,
              contentType: contentType,
              resultCount: 0,
              status: 'error',
              error: (error as Error).message,
            });
          }
        }
      }

      // Deduplicate results by URL
      const uniqueResults = deduplicateByUrl(allResults);

      // Sort by relevance and recency
      uniqueResults.sort((a, b) => {
        const scoreA = (a.score || 0) + (isRecent(a.publishedDate) ? 10 : 0);
        const scoreB = (b.score || 0) + (isRecent(b.publishedDate) ? 10 : 0);
        return scoreB - scoreA;
      });

      return {
        topic: topic,
        researchScope: {
          focusAreas:
            focusAreas.length > 0
              ? focusAreas
              : [
                  'overview',
                  'latest developments',
                  'challenges',
                  'best practices',
                  'future trends',
                ],
          contentTypes:
            contentTypes.length > 0
              ? contentTypes
              : ['news', 'research paper', 'company'],
          timeRange: timeRange || 'all_time',
          depth: depth,
        },
        summary: {
          totalQueries: queries.length * contentTypesToUse.length,
          totalResults: allResults.length,
          uniqueResults: uniqueResults.length,
          successfulQueries: queryResults.filter((r) => r.status === 'success')
            .length,
        },
        queryBreakdown: queryResults,
        results: uniqueResults,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorResult = {
        topic: topic,
        researchScope: {
          focusAreas: [],
          contentTypes: [],
          timeRange: 'all_time',
          depth: depth,
        },
        summary: {
          totalQueries: 0,
          totalResults: 0,
          uniqueResults: 0,
          successfulQueries: 0,
        },
        queryBreakdown: [],
        results: [],
        timestamp: new Date().toISOString(),
        error: `Exa research failed: ${(error as Error).message}`,
      };
      return errorResult;
    }
  },
});

// Helper functions
function parseExaResults(rawResults: any, query: string): ExaSearchResponse {
  try {
    // Exa results come in different formats, handle both string and object
    let results: any;
    if (typeof rawResults === 'string') {
      results = JSON.parse(rawResults);
    } else {
      results = rawResults;
    }

    // Handle different result structures
    let resultArray: any[] = [];
    if (Array.isArray(results)) {
      resultArray = results;
    } else if (results.results && Array.isArray(results.results)) {
      resultArray = results.results;
    } else if (results.data && Array.isArray(results.data)) {
      resultArray = results.data;
    }

    const formattedResults: ExaResult[] = resultArray.map(
      (result: any, index: number) => ({
        rank: index + 1,
        title: result.title || 'No title',
        url: result.url || result.link || 'No URL',
        snippet:
          result.snippet ||
          result.text ||
          result.summary ||
          'No description available',
        score: result.score || result.relevance_score || 100 - index * 5,
        publishedDate: result.published_date || result.date || null,
        author: result.author || null,
        domain: extractDomain(result.url || result.link),
        id: result.id || `result_${index}`,
      }),
    );

    return {
      query: query,
      totalResults: formattedResults.length,
      results: formattedResults,
      timestamp: new Date().toISOString(),
      source: 'exa',
      status: 'success',
    };
  } catch (error) {
    return {
      query: query,
      totalResults: 0,
      results: [],
      timestamp: new Date().toISOString(),
      source: 'exa',
      status: 'parse_error',
      error: (error as Error).message,
      rawData:
        typeof rawResults === 'string' ? rawResults.slice(0, 500) : 'object',
    };
  }
}

function extractUrlsFromResults(results: any): string[] {
  try {
    let resultArray: any[] = [];
    if (typeof results === 'string') {
      const parsed = JSON.parse(results);
      resultArray = Array.isArray(parsed) ? parsed : parsed.results || [];
    } else {
      resultArray = Array.isArray(results) ? results : results.results || [];
    }

    return resultArray
      .map((result: any) => result.url || result.link)
      .filter((url: any): url is string => url && typeof url === 'string');
  } catch (error) {
    return [];
  }
}

function combineSearchAndContent(
  searchResults: any,
  contentResults: any,
  query: string,
): ExaContentResponse {
  try {
    const searchArray = extractResultsArray(searchResults);
    const contentArray = Array.isArray(contentResults)
      ? contentResults
      : contentResults.results || [];

    const combined: ExaContentResult[] = searchArray.map(
      (searchResult: any, index: number) => {
        const contentResult = contentArray[index] || {};

        return {
          rank: index + 1,
          title: searchResult.title || 'No title',
          url: searchResult.url || searchResult.link || 'No URL',
          snippet:
            searchResult.snippet || searchResult.text || 'No description',
          score: searchResult.score || 100 - index * 5,
          publishedDate: searchResult.published_date || null,
          author: searchResult.author || null,
          domain: extractDomain(searchResult.url || searchResult.link),
          content: {
            text: contentResult.text || null,
            highlights: contentResult.highlights || [],
            summary: contentResult.summary || null,
          },
          id: searchResult.id || `result_${index}`,
        };
      },
    );

    return {
      query: query,
      totalResults: combined.length,
      results: combined,
      timestamp: new Date().toISOString(),
      source: 'exa_with_content',
      status: 'success',
    };
  } catch (error) {
    return {
      query: query,
      totalResults: 0,
      results: [],
      timestamp: new Date().toISOString(),
      source: 'exa_with_content',
      status: 'error',
      error: `Failed to combine results: ${(error as Error).message}`,
    };
  }
}

function extractResultsArray(results: any): any[] {
  if (Array.isArray(results)) return results;
  if (typeof results === 'string') {
    try {
      const parsed = JSON.parse(results);
      return Array.isArray(parsed) ? parsed : parsed.results || [];
    } catch {
      return [];
    }
  }
  return results.results || [];
}

function extractDomain(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function deduplicateByUrl(results: ExaResult[]): ExaResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.url)) {
      return false;
    }
    seen.add(result.url);
    return true;
  });
}

function isRecent(dateString: string | null): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30; // Consider last 30 days as recent
  } catch {
    return false;
  }
}
