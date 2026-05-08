import { awareness } from './awareness';

export type DependencyType = 'hard' | 'soft';

export type MitigationChain = {
  primary: string;
  fallback1: string;
  fallback2?: string;
  lastResort?: string;
};

export type IsolationPoint = {
  check: (context: any) => { isolate: boolean; reason?: string };
  action: (context: any) => { fallback: string };
};

class CascadeMatrix {
    private graph = new Map<string, { dependsOn: string[]; type: DependencyType }>();
    private mitigations = new Map<string, MitigationChain>();
    private isolation = new Map<string, IsolationPoint>();
    private activeMitigations = new Map<string, string>();

    constructor() {
        this.init();
    }

    private init() {
        // Core dependencies
        this.registerComponent('UI', { dependsOn: [], type: 'hard' });
        this.registerComponent('Viewer', { dependsOn: ['UI'], type: 'hard' });
        this.registerComponent('Editor', { dependsOn: ['Viewer'], type: 'hard' });
        this.registerComponent('OCR', { dependsOn: ['UI'], type: 'soft' });
        this.registerComponent('LLM', { dependsOn: ['UI'], type: 'soft' });
    }

    registerComponent(component: string, config: { dependsOn: string[]; type: DependencyType }) {
        this.graph.set(component, config);
    }

    registerMitigation(component: string, chain: MitigationChain) {
        this.mitigations.set(component, chain);
    }

    registerIsolationPoint(component: string, point: IsolationPoint) {
        this.isolation.set(component, point);
    }

    checkCascade(component: string, error: any, context: any = {}) {
        const isolation = this.isolation.get(component);
        if (isolation) {
            const result = isolation.check({ error, ...context });
            if (result.isolate) {
                const action = isolation.action({ error, ...context });
                this.activeMitigations.set(component, action.fallback);
                return { isolated: true, fallback: action.fallback };
            }
        }

        const chain = this.mitigations.get(component);
        if (chain) {
            const current = this.activeMitigations.get(component);
            if (!current) {
                this.activeMitigations.set(component, chain.fallback1);
                return { isolated: false, fallback: chain.fallback1 };
            } else if (current === chain.fallback1 && chain.fallback2) {
                this.activeMitigations.set(component, chain.fallback2);
                return { isolated: false, fallback: chain.fallback2 };
            }
        }

        return { isolated: false, fallback: null };
    }

    getActiveMitigation(component: string): string | null {
        return this.activeMitigations.get(component) || null;
    }

    resetMitigation(component: string) {
        this.activeMitigations.delete(component);
    }
}

export const cascade = new CascadeMatrix();
