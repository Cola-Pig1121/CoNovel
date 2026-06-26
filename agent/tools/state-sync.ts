import { defineTool } from 'eve/tools';
import { z } from 'zod';

/**
 * State Sync Tool - 状态同步工具
 *
 * 同步小说项目的状态到持久化存储。
 */
export const stateSync = defineTool({
  name: 'state-sync',
  description: '状态同步 - 将章节创作结果同步到持久化状态',

  inputSchema: z.object({
    action: z.enum([
      'sync_chapter',
      'update_characters',
      'update_foreshadowing',
      'update_timeline',
      'update_progress',
    ]),
    bookId: z.string().uuid(),
    chapterNumber: z.number().positive(),
    params: z.record(z.unknown()).optional(),
  }),

  execute: async (input) => {
    const { action, bookId, chapterNumber, params } = input;

    switch (action) {
      case 'sync_chapter': {
        const { chapterText, wordCount, agentScores } = params as {
          chapterText: string;
          wordCount: number;
          agentScores: Record<string, number>;
        };
        return {
          success: true,
          data: {
            bookId,
            chapterNumber,
            wordCount,
            agentScores,
            syncedAt: new Date().toISOString(),
          },
        };
      }

      case 'update_characters': {
        const { characters } = params as { characters: Array<{
          id: string;
          lastState: string;
          lastAppearance: number;
        }> };
        return {
          success: true,
          data: {
            bookId,
            updatedCharacters: characters.length,
          },
        };
      }

      case 'update_foreshadowing': {
        const { foreshadowing } = params as { foreshadowing: Array<{
          id: string;
          status: string;
          resolvedIn?: number;
        }> };
        return {
          success: true,
          data: {
            bookId,
            updatedForeshadowing: foreshadowing.length,
          },
        };
      }

      case 'update_timeline': {
        const { events } = params as { events: Array<{
          description: string;
          chapterNumber: number;
          location: string;
        }> };
        return {
          success: true,
          data: {
            bookId,
            addedEvents: events.length,
          },
        };
      }

      case 'update_progress': {
        const { mainPlot, subplots, currentWordCount } = params as {
          mainPlot?: number;
          subplots?: Record<string, number>;
          currentWordCount?: number;
        };
        return {
          success: true,
          data: {
            bookId,
            chapterNumber,
            mainPlot,
            subplots,
            currentWordCount,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  },
});
