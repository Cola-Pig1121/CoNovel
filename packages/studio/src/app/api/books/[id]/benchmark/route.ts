import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

/**
 * Cross-book Benchmark API
 * 分析参考小说的文风，生成风格指纹，用于指导写作
 */

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }
function getRefDir(bookId: string): string { return join(getBooksDir(), bookId, 'reference'); }

/** GET /api/books/[id]/benchmark — 分析参考小说并生成基准风格 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refDir = getRefDir(id);

  if (!existsSync(refDir)) {
    return NextResponse.json({ error: 'No reference directory' }, { status: 404 });
  }

  // Read reference text files
  const files = readdirSync(refDir).filter(f => f.endsWith('.txt') || f.endsWith('.md') && !f.startsWith('_'));
  const refTexts: Array<{ name: string; text: string; stats: any }> = [];

  for (const file of files) {
    const text = readFileSync(join(refDir, file), 'utf-8');
    refTexts.push({
      name: file,
      text: text.substring(0, 50000), // Limit to 50k chars for analysis
      stats: analyzeText(text),
    });
  }

  // Generate benchmark style from reference texts
  const benchmarkStyle = generateBenchmarkStyle(refTexts);

  return NextResponse.json({
    referenceCount: refTexts.length,
    references: refTexts.map(r => ({ name: r.name, stats: r.stats })),
    benchmarkStyle,
    recommendation: generateStyleRecommendation(benchmarkStyle),
  });
}

function analyzeText(text: string) {
  // Basic text analysis
  const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    : 0;

  // Dialogue ratio
  const dialogueMatches = text.match(/[""「」『』]/g) || [];
  const dialogueRatio = text.length > 0 ? dialogueMatches.length / (text.length / 100) : 0;

  // Paragraph analysis
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const avgParagraphLength = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
    : 0;

  // Vocabulary diversity (simple type-token ratio)
  const chars = text.replace(/\s/g, '').split('');
  const uniqueChars = new Set(chars);
  const vocabularyDiversity = chars.length > 0 ? uniqueChars.size / chars.length : 0;

  return {
    totalChars: text.length,
    totalSentences: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLength),
    dialogueRatio: Math.round(dialogueRatio * 100) / 100,
    paragraphCount: paragraphs.length,
    avgParagraphLength: Math.round(avgParagraphLength),
    vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
  };
}

function generateBenchmarkStyle(refTexts: Array<{ stats: any }>) {
  if (refTexts.length === 0) return null;

  const avgSentenceLength = Math.round(
    refTexts.reduce((sum, r) => sum + r.stats.avgSentenceLength, 0) / refTexts.length
  );
  const dialogueRatio = Math.round(
    refTexts.reduce((sum, r) => sum + r.stats.dialogueRatio, 0) / refTexts.length * 100
  ) / 100;
  const avgParagraphLength = Math.round(
    refTexts.reduce((sum, r) => sum + r.stats.avgParagraphLength, 0) / refTexts.length
  );

  return {
    avgSentenceLength,
    dialogueRatio,
    avgParagraphLength,
    shortSentenceRatio: avgSentenceLength < 20 ? 0.4 : avgSentenceLength < 30 ? 0.3 : 0.2,
    longSentenceRatio: avgSentenceLength > 35 ? 0.3 : avgSentenceLength > 25 ? 0.2 : 0.1,
    referenceCount: refTexts.length,
  };
}

function generateStyleRecommendation(style: any) {
  if (!style) return '无参考小说，使用默认风格';

  const recommendations: string[] = [];

  if (style.dialogueRatio > 0.4) {
    recommendations.push('参考小说对话比例较高，建议增加对话描写');
  } else if (style.dialogueRatio < 0.2) {
    recommendations.push('参考小说对话比例较低，建议增加叙述和描写');
  }

  if (style.avgSentenceLength > 35) {
    recommendations.push('参考小说句式偏长，适合沉稳厚重的文风');
  } else if (style.avgSentenceLength < 20) {
    recommendations.push('参考小说句式偏短，适合节奏明快的文风');
  }

  if (style.avgParagraphLength > 300) {
    recommendations.push('参考小说段落偏厚，适合深度叙述');
  } else if (style.avgParagraphLength < 100) {
    recommendations.push('参考小说段落偏薄，适合快节奏阅读');
  }

  return recommendations.length > 0 ? recommendations.join('；') : '参考小说风格均衡，适合多种文风';
}
