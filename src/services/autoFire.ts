import { awareness } from './awareness';
import { llmService } from './llm';

export type Trigger = {
  id: string;
  name: string;
  condition: (context: any) => boolean;
  action: (context: any) => Promise<void>;
};

class AutoFireService {
  private triggers: Trigger[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.triggers.push({
      id: 'AF-001',
      name: 'Auto-Summarize',
      condition: (ctx) => ctx.event === 'file-loaded' && ctx.text,
      action: async (ctx) => {
        console.log('Auto-firing summary...');
        // We'll let the UI handle the actual call to show it in chat
      }
    });

    this.triggers.push({
      id: 'AF-007',
      name: 'Security Escalation',
      condition: (ctx) => ctx.event === 'error' && ctx.critical,
      action: async (ctx) => {
        alert('SECURITY PROTOCOL: Component failure detected. Switching to fallback.');
      }
    });
  }

  evaluate(context: any) {
    this.triggers.forEach(t => {
      if (t.condition(context)) {
        t.action(context);
      }
    });
  }
}

export const autoFire = new AutoFireService();
