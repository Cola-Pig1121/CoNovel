import { z } from 'zod';

// ===== Genre Template =====
export const GenreTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameZh: z.string(),
  description: z.string(),
  targetPlatforms: z.array(z.string()), // 起点, 番茄, 晋江, etc.
  typicalLength: z.object({
    min: z.number(), // words
    max: z.number(),
  }),
  pacingProfile: z.enum(['fast', 'balanced', 'slow_burn']),
  tropes: z.array(z.string()), // Common tropes for this genre
  bannedPatterns: z.array(z.string()), // Patterns to avoid
  writingGuidelines: z.string(), // Detailed writing guidelines
  emotionArcs: z.array(z.string()), // Common emotion arc templates
  worldBuilding: z.string(), // World building guidelines
});
export type GenreTemplate = z.infer<typeof GenreTemplateSchema>;
