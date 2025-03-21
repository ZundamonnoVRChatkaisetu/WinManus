/**
 * エージェントの状態を表す型定義ファイル
 */

// エージェントの状態
export type AgentStatus = 
  | 'idle'        // 待機中
  | 'planning'    // 計画中
  | 'executing'   // 実行中
  | 'observing'   // 観察中
  | 'updating'    // 更新中
  | 'completed'   // 完了
  | 'error';      // エラー

// エージェントのアクション履歴
export type AgentAction = {
  action: string;  // アクションの種類
  result: any;     // アクションの結果
  timestamp: number; // タイムスタンプ
};

// メッセージの型
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
};

// エージェントの設定
export type AgentConfig = {
  modelName: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
};

// WebSocketメッセージのペイロード
export type WebSocketPayload = {
  type: 'state-update' | 'notification' | 'question' | 'error';
  data: any;
};
