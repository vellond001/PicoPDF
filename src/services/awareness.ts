export type ComponentState = {
  component: string;
  failures: { time: number; error: string }[];
  totalAttempts: number;
  consecutiveFailures: number;
  avgLatency: number;
  circuitBreaker: 'closed' | 'open';
};

class AwarenessService {
  private states = new Map<string, ComponentState>();
  private resources = { memory: 0, cores: 4, network: 'unknown' };

  constructor() {
    this.startMonitor();
    this.loadFromStorage();
  }

  private startMonitor() {
    if (typeof window === 'undefined') return;
    
    setInterval(() => this.collectResourceMetrics(), 30000);
    window.addEventListener('error', (e) => this.recordFailure('window', e.error?.message || 'Unknown window error'));
    this.collectResourceMetrics();
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('awareness_')) {
        try {
          const state = JSON.parse(localStorage.getItem(key) || '');
          this.states.set(state.component, state);
        } catch (e) { /* ignore */ }
      }
    }
  }

  private collectResourceMetrics() {
    try {
      const mem = (performance as any).memory?.usedJSHeapSize / 1048576 || 0;
      const cores = navigator.hardwareConcurrency || 4;
      const net = (navigator as any).connection?.effectiveType || 'unknown';
      this.resources = { memory: mem, cores, network: net };
    } catch (e) { /* ignore */ }
  }

  getState(component: string): ComponentState {
    if (!this.states.has(component)) {
      const newState: ComponentState = {
        component,
        failures: [],
        totalAttempts: 0,
        consecutiveFailures: 0,
        avgLatency: 0,
        circuitBreaker: 'closed'
      };
      this.states.set(component, newState);
      return newState;
    }
    return this.states.get(component)!;
  }

  recordFailure(component: string, error: string) {
    const state = this.getState(component);
    state.failures.push({ time: Date.now(), error });
    if (state.failures.length > 50) state.failures.shift();
    state.totalAttempts += 1;
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= 3) {
      state.circuitBreaker = 'open';
    }
    this.persist(state);
  }

  recordSuccess(component: string) {
    const state = this.getState(component);
    state.totalAttempts += 1;
    state.consecutiveFailures = 0;
    state.circuitBreaker = 'closed';
    this.persist(state);
  }

  private persist(state: ComponentState) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`awareness_${state.component}`, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  getHealthScore(component: string): number {
    const state = this.getState(component);
    const latencyScore = 100 - Math.min(state.avgLatency / 10, 100);
    const failureScore = Math.max(0, 100 - state.failures.length * 10);
    const cbScore = state.circuitBreaker === 'open' ? 0 : 100;
    return Math.round((latencyScore + failureScore + cbScore) / 3);
  }

  getConfidence(component: string): number {
    const state = this.getState(component);
    if (state.totalAttempts === 0) return 0.5;
    return Math.min(1, (state.totalAttempts - state.failures.length) / state.totalAttempts);
  }

  isCircuitOpen(component: string): boolean {
    return this.getState(component).circuitBreaker === 'open';
  }

  getResourcePressure(): number {
    const { memory, cores } = this.resources;
    const memPressure = Math.min(1, memory / 512); 
    const corePressure = Math.min(1, (4 - cores) / 4);
    return Math.max(memPressure, corePressure);
  }

  getDecision(component: string, action: string, context: any = {}): { shouldProceed: boolean; reason: string } {
    const health = this.getHealthScore(component);
    const pressure = this.getResourcePressure();
    
    if (pressure > 0.9) return { shouldProceed: false, reason: 'CRITICAL_RESOURCE_PRESSURE' };
    if (health < 20) return { shouldProceed: false, reason: 'COMPONENT_UNHEALTHY' };
    if (this.isCircuitOpen(component)) return { shouldProceed: false, reason: 'CIRCUIT_OPEN' };
    
    return { shouldProceed: true, reason: 'PROCEED' };
  }

  validateAction(component: string, input: any): boolean {
    // Simple validation orchestrator logic
    if (!input) return false;
    if (typeof input === 'string' && input.length > 100000) return false;
    return true;
  }
}

export const awareness = new AwarenessService();
