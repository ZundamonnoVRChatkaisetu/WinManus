/**
 * エージェントの状態を表す型
 */
export type AgentState = {
  status: 'idle' | 'planning' | 'executing' | 'observing' | 'updating' | 'completed' | 'error';
  currentTask: string | null;
  plan: string[];
  progress: number; // 0-100
  currentStep: string | null;
  results: any[];
  error: string | null;
  history: {
    action: string;
    result: any;
    timestamp: number;
  }[];
};

/**
 * エージェントループ（計画→実行→観察→更新）を制御するクラス
 */
export class AgentLoop {
  private state: AgentState;
  private taskRunning: boolean = false;
  private updateCallbacks: ((state: AgentState) => void)[] = [];

  constructor() {
    this.state = {
      status: 'idle',
      currentTask: null,
      plan: [],
      progress: 0,
      currentStep: null,
      results: [],
      error: null,
      history: [],
    };
  }

  /**
   * 現在の状態を取得する
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * 状態更新のコールバックを登録する
   */
  onStateUpdate(callback: (state: AgentState) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // コールバックの登録解除関数を返す
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * 状態を更新する
   */
  private updateState(updates: Partial<AgentState>) {
    this.state = { ...this.state, ...updates };
    
    // 全てのコールバックを呼び出す
    for (const callback of this.updateCallbacks) {
      callback(this.getState());
    }
  }

  /**
   * タスクを開始する
   */
  async startTask(task: string) {
    if (this.taskRunning) {
      console.warn('Task already running, ignoring new task');
      return;
    }
    
    this.taskRunning = true;
    this.updateState({
      status: 'planning',
      currentTask: task,
      plan: [],
      progress: 0,
      currentStep: null,
      results: [],
      error: null,
      history: [],
    });
    
    try {
      await this.runAgentLoop(task);
    } catch (error) {
      console.error('Error in agent loop:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.taskRunning = false;
    }
  }

  /**
   * エージェントループの実行
   */
  private async runAgentLoop(task: string) {
    // 1. 計画フェーズ
    await this.planTask(task);
    
    // エラーがあれば中止
    if (this.state.status === 'error') return;
    
    // 各ステップを実行
    for (let i = 0; i < this.state.plan.length; i++) {
      const step = this.state.plan[i];
      
      // 2. 実行フェーズ
      this.updateState({
        status: 'executing',
        currentStep: step,
        progress: Math.floor((i / this.state.plan.length) * 50),
      });
      
      const result = await this.executeStep(step);
      
      // エラーがあれば中止
      if (this.state.status === 'error') return;
      
      // 3. 観察フェーズ
      this.updateState({
        status: 'observing',
        progress: Math.floor((i / this.state.plan.length) * 70),
      });
      
      const observation = await this.observeResult(result);
      
      // 4. 更新フェーズ
      this.updateState({
        status: 'updating',
        progress: Math.floor((i / this.state.plan.length) * 90),
      });
      
      const shouldContinue = await this.updatePlan(observation);
      
      // 更新の結果、続行不要なら終了
      if (!shouldContinue) break;
    }
    
    // タスク完了
    this.updateState({
      status: 'completed',
      progress: 100,
      currentStep: null,
    });
  }

  /**
   * タスクの計画を立てる
   */
  private async planTask(task: string): Promise<void> {
    try {
      // タスクを分析して計画を立てる（ここでは単純な例）
      // 実際には、LLMを使用してタスクを分解する
      const plan = [
        `タスク "${task}" の情報収集`,
        `タスク "${task}" の分析`,
        `タスク "${task}" の実行`,
        `タスク "${task}" の結果のまとめ`,
      ];
      
      // 少し待機して計画プロセスをシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.updateState({
        plan,
        progress: 10,
        history: [
          ...this.state.history,
          {
            action: 'planning',
            result: plan,
            timestamp: Date.now(),
          },
        ],
      });
    } catch (error) {
      console.error('Error in planning:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * ステップを実行する
   */
  private async executeStep(step: string): Promise<any> {
    try {
      // ステップの実行をシミュレート
      console.log(`Executing step: ${step}`);
      
      // 実際には、ステップに応じたアクションを実行する
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = { stepCompleted: step, output: `${step} の実行結果` };
      
      this.updateState({
        results: [...this.state.results, result],
        history: [
          ...this.state.history,
          {
            action: 'execution',
            result,
            timestamp: Date.now(),
          },
        ],
      });
      
      return result;
    } catch (error) {
      console.error(`Error executing step "${step}":`, error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 結果を観察する
   */
  private async observeResult(result: any): Promise<any> {
    try {
      // 結果の観察をシミュレート
      console.log(`Observing result:`, result);
      
      // 実際には、結果を分析してフィードバックを得る
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const observation = { analysisOf: result, feedback: '正常に完了' };
      
      this.updateState({
        history: [
          ...this.state.history,
          {
            action: 'observation',
            result: observation,
            timestamp: Date.now(),
          },
        ],
      });
      
      return observation;
    } catch (error) {
      console.error('Error in observation:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 計画を更新する
   */
  private async updatePlan(observation: any): Promise<boolean> {
    try {
      // 計画の更新をシミュレート
      console.log(`Updating plan based on observation:`, observation);
      
      // 実際には、観察結果に基づいて計画を調整する
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedPlan = [...this.state.plan]; // この例では計画を変更しない
      
      this.updateState({
        plan: updatedPlan,
        history: [
          ...this.state.history,
          {
            action: 'plan-update',
            result: { updatedPlan },
            timestamp: Date.now(),
          },
        ],
      });
      
      // true を返すと次のステップへ進む、false を返すとループを終了する
      return true;
    } catch (error) {
      console.error('Error in plan update:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
