import { NextRequest, NextResponse } from 'next/server';
import { AgentLoop } from '@/lib/agent/AgentLoop';

// エージェントのインスタンスを保持する辞書
const agentInstances: Record<string, AgentLoop> = {};

/**
 * エージェントの初期化・タスク送信のエンドポイント
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, task } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }
    
    // 既存のエージェントがあれば取得、なければ新規作成
    let agent = agentInstances[sessionId];
    if (!agent) {
      agent = new AgentLoop();
      agentInstances[sessionId] = agent;
    }
    
    // タスクを開始する（非同期）
    agent.startTask(task);
    
    return NextResponse.json({ message: 'Task started', sessionId });
  } catch (error) {
    console.error('Error in agent API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * エージェントの状態取得のエンドポイント
 */
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const agent = agentInstances[sessionId];
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for this session' }, { status: 404 });
    }
    
    const state = agent.getState();
    
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error in agent API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
