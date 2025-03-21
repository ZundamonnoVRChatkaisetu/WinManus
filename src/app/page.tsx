"use client";

import { useState, useEffect, FormEvent } from "react";
import { v4 as uuidv4 } from 'uuid';
import { AgentState } from "@/lib/agent/AgentLoop";
import { getWebSocketManager } from "@/lib/utils/websocket";

// 初期メッセージ
const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    content: "こんにちは！AIアシスタントです。どのようなタスクをお手伝いしましょうか？",
    timestamp: Date.now(),
  },
];

export default function Home() {
  // セッションID
  const [sessionId] = useState<string>(() => uuidv4());
  
  // メッセージ状態
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // エージェント状態
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  
  // WebSocket状態
  const [wsConnected, setWsConnected] = useState(false);
  
  // 初期化処理
  useEffect(() => {
    // WebSocketマネージャーを取得
    const wsManager = getWebSocketManager(sessionId);
    
    // 状態変更リスナーを登録
    const removeStateListener = wsManager.addStateChangeListener((state) => {
      setWsConnected(state.isConnected);
    });
    
    // メッセージリスナーを登録
    const removeMessageListener = wsManager.addMessageListener((payload) => {
      if (payload.type === 'state-update') {
        setAgentState(payload.data);
        
        // 状態が完了に変わったら処理中フラグをオフに
        if (payload.data.status === 'completed') {
          setIsProcessing(false);
          
          // 結果メッセージを追加
          const results = payload.data.results || [];
          if (results.length > 0) {
            addMessage({
              id: uuidv4(),
              role: "assistant",
              content: `タスクが完了しました。\n\n結果: ${JSON.stringify(results, null, 2)}`,
              timestamp: Date.now(),
            });
          }
        }
      }
    });
    
    // WebSocket接続を開始
    wsManager.connect();
    
    // クリーンアップ
    return () => {
      removeStateListener();
      removeMessageListener();
      wsManager.disconnect();
    };
  }, [sessionId]);
  
  // メッセージを追加する
  const addMessage = (message: any) => {
    setMessages((prev) => [...prev, message]);
  };
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    // ユーザーメッセージを追加
    const userMessage = {
      id: uuidv4(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    
    // 入力フィールドをクリアして処理中状態に
    setInput("");
    setIsProcessing(true);
    
    try {
      // タスクをAPIに送信
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, task: input }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // 思考中メッセージを追加
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: "タスクを計画中です...",
        timestamp: Date.now(),
      });
      
      // WebSocketマネージャーを通じてエージェント状態の更新を監視する
      // (WebSocketメッセージリスナーで処理される)
    } catch (error) {
      console.error("Error submitting task:", error);
      setIsProcessing(false);
      
      // エラーメッセージを追加
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: "エラーが発生しました。もう一度お試しください。",
        timestamp: Date.now(),
      });
    }
  };
  
  // 進捗表示
  const renderProgress = () => {
    if (!agentState || agentState.status === 'idle') return null;
    
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <h3 className="font-bold mb-2">タスク進捗状況</h3>
        <div className="mb-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${agentState.progress}%` }}
            ></div>
          </div>
          <p className="text-sm mt-1">{agentState.progress}% 完了</p>
        </div>
        <p className="text-sm">
          <span className="font-semibold">状態: </span>
          {agentState.status === 'planning' && '計画中'}
          {agentState.status === 'executing' && '実行中'}
          {agentState.status === 'observing' && '観察中'}
          {agentState.status === 'updating' && '更新中'}
          {agentState.status === 'completed' && '完了'}
          {agentState.status === 'error' && 'エラー'}
        </p>
        {agentState.currentStep && (
          <p className="text-sm mt-1">
            <span className="font-semibold">現在のステップ: </span>
            {agentState.currentStep}
          </p>
        )}
        {agentState.error && (
          <p className="text-sm mt-1 text-red-500">
            <span className="font-semibold">エラー: </span>
            {agentState.error}
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* ヘッダー */}
      <header className="bg-white border-b p-4">
        <h1 className="text-xl font-bold">WinManus AI アシスタント</h1>
        <div className="text-xs">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {wsConnected ? 'オンライン' : 'オフライン'}
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden flex flex-col p-4">
        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 p-3 rounded-lg max-w-3xl ${
                message.role === "user"
                  ? "ml-auto bg-blue-100"
                  : "bg-gray-100"
              }`}
            >
              <div className="text-sm font-semibold mb-1">
                {message.role === "user" ? "あなた" : "アシスタント"}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
        </div>
        
        {/* 進捗表示 */}
        {renderProgress()}
        
        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="flex items-end">
          <textarea
            className="flex-1 border rounded-l p-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="指示を入力してください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            rows={2}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className={`px-4 py-2 rounded-r text-white ${
              isProcessing || !input.trim()
                ? "bg-gray-400"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            送信
          </button>
        </form>
      </main>
    </div>
  );
}
