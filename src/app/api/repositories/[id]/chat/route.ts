import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { RagService } from '@/server/rag/ragService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;

    const res = await query(
      `SELECT id, sender, content, citations, confidence_score, created_at
       FROM chat_messages
       WHERE repository_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ messages: res.rows });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch chat history.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const body = await req.json();
    const prompt = body.prompt || body.message;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Message prompt is required.' }, { status: 400 });
    }

    // Save user message to database
    try {
      await query(
        `INSERT INTO chat_messages (id, repository_id, sender, content)
         VALUES ($1, $2, 'user', $3)`,
        [`msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, id, prompt.trim()]
      );
    } catch (e) {
      console.warn('Could not save user message:', e);
    }

    // Run RAG pipeline
    const ragResult = await RagService.answerQuestion(id, prompt.trim());

    // Save assistant reply to database
    try {
      await query(
        `INSERT INTO chat_messages (id, repository_id, sender, content, citations, confidence_score)
         VALUES ($1, $2, 'assistant', $3, $4::jsonb, $5)`,
        [
          `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          id,
          ragResult.answer,
          JSON.stringify(ragResult.citations || []),
          ragResult.confidenceScore || 0.9,
        ]
      );
    } catch (e) {
      console.warn('Could not save assistant message:', e);
    }

    return NextResponse.json(ragResult);
  } catch (error: any) {
    console.error('Error in chat RAG endpoint:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI chat query.' },
      { status: 500 }
    );
  }
}
