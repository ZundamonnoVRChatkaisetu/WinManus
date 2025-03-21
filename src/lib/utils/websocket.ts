/**
 * WebSocketクライアント用ユーティリティ
 */

import { WebSocketPayload } from '@/lib/agent/AgentTypes';

// WebSocketの状態
export type WebSocketState = {
  isConnected: boolean;
  error: string | null;
};

/**
 * WebSocketマネージャークラス
 * クライアント側でWebSocket接続を管理する
 */
export class WebSocketManager {
  private socket: WebSocket | null = null;
  private messageListeners: ((payload: WebSocketPayload) => void)[] = [];
  private stateChangeListeners: ((state: WebSocketState) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ミリ秒
  private sessionId: string;
  private state: WebSocketState = {
    isConnected: false,
    error: null
  };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * WebSocket接続を開始する
   */
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return; // 既に接続中
    }

    try {
      // WebSocketサーバーのURLを構築
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/ws?sessionId=${this.sessionId}`;

      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.updateState({
        isConnected: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * WebSocket接続を閉じる
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.reconnectAttempts = 0;
      this.updateState({
        isConnected: false,
        error: null
      });
    }
  }

  /**
   * メッセージを送信する
   */
  sendMessage(type: string, data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({ type, data }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * メッセージリスナーを追加する
   */
  addMessageListener(listener: (payload: WebSocketPayload) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  /**
   * 状態変更リスナーを追加する
   */
  addStateChangeListener(listener: (state: WebSocketState) => void): () => void {
    this.stateChangeListeners.push(listener);
    // 最新の状態を即座に通知
    listener(this.state);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  /**
   * 接続時のハンドラ
   */
  private handleOpen(event: Event): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.updateState({
      isConnected: true,
      error: null
    });
  }

  /**
   * メッセージ受信時のハンドラ
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const payload = JSON.parse(event.data) as WebSocketPayload;
      // 全てのリスナーにメッセージを通知
      for (const listener of this.messageListeners) {
        listener(payload);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * 接続切断時のハンドラ
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    this.updateState({
      isConnected: false,
      error: event.code !== 1000 ? `Connection closed: ${event.reason || 'Unknown reason'}` : null
    });

    // 異常切断の場合に再接続を試みる
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  /**
   * エラー発生時のハンドラ
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.updateState({
      isConnected: false,
      error: 'Connection error'
    });
  }

  /**
   * 状態を更新してリスナーに通知する
   */
  private updateState(newState: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...newState };
    // 全てのリスナーに状態変更を通知
    for (const listener of this.stateChangeListeners) {
      listener(this.state);
    }
  }

  /**
   * 現在の接続状態を取得する
   */
  getState(): WebSocketState {
    return { ...this.state };
  }
}

// シングルトンのWebSocketマネージャーインスタンス
let wsManager: WebSocketManager | null = null;

/**
 * WebSocketマネージャーのインスタンスを取得する
 */
export function getWebSocketManager(sessionId: string): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(sessionId);
  }
  return wsManager;
}
