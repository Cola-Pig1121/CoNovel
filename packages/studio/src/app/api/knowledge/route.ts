import { NextResponse } from 'next/server';
// Knowledge base search - returns empty for now (CSV files were in deleted core package)
export async function GET() { return NextResponse.json({ entries: [], total: 0, categories: [], stats: { totalEntries: 0, categories: 0, files: 0 } }); }
