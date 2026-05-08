import { awareness } from './awareness';

export type RetryOptions = {
  maxAttempts?: number;
  backoff?: number[];
  retryType?: 'exponential' | 'linear' | 'jittered';
};

export class RetryManager {
  private component: string;
  private maxAttempts: number;
  private backoff: number[];
  private retryType: 'exponential' | 'linear' | 'jittered';

  constructor(component: string, options: RetryOptions = {}) {
    this.component = component;
    this.maxAttempts = options.maxAttempts || 3;
    this.backoff = options.backoff || [500, 1000, 2000];
    this.retryType = options.retryType || 'exponential';
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    let attempts = 0;
    while (attempts < this.maxAttempts) {
      try {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        
        // Update latency in awareness
        const state = awareness.getState(this.component);
        state.avgLatency = (state.avgLatency * 0.8) + (duration * 0.2);

        awareness.recordSuccess(this.component);
        return result;
      } catch (e: any) {
        attempts++;
        awareness.recordFailure(this.component, e.message || String(e));
        
        if (attempts >= this.maxAttempts) {
          throw e;
        }

        let delay = this.backoff[attempts - 1] || 2000;
        if (this.retryType === 'exponential') {
          delay = Math.min(delay * Math.pow(2, attempts - 1), 8000);
        } else if (this.retryType === 'jittered') {
          delay = delay * (0.5 + Math.random());
        }
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
