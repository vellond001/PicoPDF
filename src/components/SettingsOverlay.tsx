import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Key, RefreshCcw, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { llmService, ChainItem } from '../services/llm';

const PROVIDERS = {
  gemini: { name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  openai: { name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  anthropic: { name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  groq: { name: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  openrouter: { name: 'OpenRouter', models: ['meta-llama/llama-3-8b-instruct:free', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5'] }
};

type ProviderKey = keyof typeof PROVIDERS;

export type ModelInfo = { id: string, tags: string[] };

const categorizeModel = (id: string, provider: ProviderKey, rawData?: any): string[] => {
  const tags: string[] = [];
  const idLower = id.toLowerCase();

  let isFree = false;
  if (provider === 'groq') {
    isFree = true;
  } else if (provider === 'openrouter' && rawData?.pricing) {
    if (Number(rawData.pricing.prompt || 0) === 0 && Number(rawData.pricing.completion || 0) === 0 && Number(rawData.pricing.request || 0) === 0 && Number(rawData.pricing.image || 0) === 0) {
      isFree = true;
    }
  } else if (idLower.includes('free') || idLower.includes('flash') || idLower.includes('gemma')) {
    isFree = true;
  }
  
  if (isFree) tags.push('free');
  else tags.push('paid');

  if (rawData?.architecture?.modality) {
    const mod = rawData.architecture.modality.toLowerCase();
    if (mod.includes('image') || mod.includes('vision') || mod.includes('multimodal')) tags.push('image');
    if (mod.includes('video')) tags.push('video');
    if (mod.includes('audio')) tags.push('audio');
  } else {
    if (idLower.includes('vision') || idLower.includes('gpt-4o') || idLower.includes('claude-3-5') || idLower.includes('claude-3-haiku') || idLower.includes('claude-3-opus') || idLower.includes('claude-3-sonnet') || idLower.includes('gemini-1') || idLower.includes('gemini-2') || idLower.includes('pixtral')) {
      tags.push('image');
    }
    if (idLower.includes('audio') || idLower.includes('gpt-4o') || idLower.includes('gemini-1') || idLower.includes('gemini-2')) {
      tags.push('audio');
    }
    if (idLower.includes('video') || idLower.includes('gemini-1') || idLower.includes('gemini-2')) {
      tags.push('video');
    }
  }

  if (idLower.includes('nsfw') || idLower.includes('uncensored') || idLower.includes('dolphin') || idLower.includes('wizard') || idLower.includes('magnum') || idLower.includes('dark') || idLower.includes('shadow')) {
    tags.push('nsfw');
  }

  return tags;
}

const fetchModels = async (provider: ProviderKey, key: string): Promise<ModelInfo[]> => {
  const tryEndpoints = async (endpoints: {url: string, headers: any, transform: (data: any) => ModelInfo[]}[]) => {
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { headers: ep.headers });
        if (res.ok) {
          const data = await res.json();
          const models = ep.transform(data);
          
          models.sort((a, b) => {
            const aFree = a.tags.includes('free');
            const bFree = b.tags.includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.id.localeCompare(b.id);
          });
          
          if (models && models.length > 0) return models;
        }
      } catch (e) {}
    }
    throw new Error("All endpoints failed");
  };

  try {
    if (provider === 'gemini') {
      return await tryEndpoints([
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          headers: {},
          transform: (d: any) => d.models.map((m: any) => {
            const id = m.name.replace('models/', '');
            return { id, tags: categorizeModel(id, provider, m) };
          })
        }
      ]);
    } else if (provider === 'openai') {
      return await tryEndpoints([
        {
          url: 'https://api.openai.com/v1/models',
          headers: { 'Authorization': `Bearer ${key}` },
          transform: (d: any) => d.data
            .map((m: any) => m.id)
            .filter((id: string) => id.includes('gpt') || id.includes('o1') || id.includes('o3'))
            .map((id: string) => ({ id, tags: categorizeModel(id, provider, null) }))
        }
      ]);
    } else if (provider === 'groq') {
      return await tryEndpoints([
        {
          url: 'https://api.groq.com/openai/v1/models',
          headers: { 'Authorization': `Bearer ${key}` },
          transform: (d: any) => d.data.map((m: any) => ({ id: m.id, tags: categorizeModel(m.id, provider, m) }))
        }
      ]);
    } else if (provider === 'openrouter') {
      return await tryEndpoints([
        {
          url: 'https://openrouter.ai/api/v1/models',
          headers: {},
          transform: (d: any) => d.data.map((m: any) => ({ id: m.id, tags: categorizeModel(m.id, provider, m) }))
        }
      ]);
    }
  } catch (e) {
    console.warn("Auto-detect failed, using defaults");
  }

  const defs = PROVIDERS[provider].models.map(id => ({ id, tags: categorizeModel(id, provider, null) }));
  defs.sort((a, b) => {
    const aFree = a.tags.includes('free');
    const bFree = b.tags.includes('free');
    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;
    return a.id.localeCompare(b.id);
  });
  return defs;
};

export default function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const [chain, setChain] = useState<ChainItem[]>([]);
  const [saved, setSaved] = useState(false);

  const [inputKey, setInputKey] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<ProviderKey | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showManualSelect, setShowManualSelect] = useState(false);
  
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isIteratingModels, setIsIteratingModels] = useState(false);

  const [testResults, setTestResults] = useState<{id: string, status: 'success' | 'failed', latency: number, error?: string}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [tokenStats, setTokenStats] = useState<Record<string, { prompt: number, completion: number }>>({});

  useEffect(() => {
    const savedChain = localStorage.getItem('LLM_CHAIN');
    if (savedChain) {
      try {
        setChain(JSON.parse(savedChain));
      } catch (e) {}
    }
    setTokenStats(llmService.getUsageStats());
    
    const interval = setInterval(() => {
      setTokenStats(llmService.getUsageStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!inputKey) {
      setDetectedProvider(null);
      setShowManualSelect(false);
      setAvailableModels([]);
      return;
    }
    
    let prov: ProviderKey | null = null;
    if (inputKey.length > 20) {
      if (inputKey.startsWith('AIza')) prov = 'gemini';
      else if (inputKey.startsWith('sk-ant-')) prov = 'anthropic';
      else if (inputKey.startsWith('sk-or-v1-')) prov = 'openrouter';
      else if (inputKey.startsWith('gsk_')) prov = 'groq';
      else if (inputKey.startsWith('sk-') && !inputKey.startsWith('sk-ant-') && !inputKey.startsWith('sk-or-')) prov = 'openai';
    }

    if (prov) {
      setDetectedProvider(prov);
      setShowManualSelect(false);
    } else {
      setDetectedProvider(null);
      if (inputKey.length > 5) {
        setShowManualSelect(true);
      }
    }
  }, [inputKey]);

  useEffect(() => {
    let active = true;
    if (!detectedProvider || !inputKey) {
      setAvailableModels([]);
      return;
    }

    const autoAddFreeModels = (models: ModelInfo[], prov: ProviderKey, key: string) => {
      setChain(currentChain => {
        if (currentChain.some(c => c.key === key)) return currentChain;
        
        const freeModels = models.filter(m => m.tags.includes('free'));
        const modelsToAdd = freeModels;
        
        if (modelsToAdd.length === 0) return currentChain;
        
        const nextChain = [...currentChain];
        modelsToAdd.forEach(m => {
          if (!nextChain.some(c => c.key === key && c.model === m.id)) {
            nextChain.push({
              id: Math.random().toString(36).substring(7),
              provider: prov,
              key: key,
              model: m.id
            });
          }
        });
        
        localStorage.setItem('LLM_CHAIN', JSON.stringify(nextChain));
        llmService.updateChain(nextChain);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        
        return nextChain;
      });
    };

    const loadModels = async () => {
      setIsIteratingModels(true);
      try {
        const models = await fetchModels(detectedProvider, inputKey);
        if (active) {
          setAvailableModels(models);
          if (models.length > 0 && (!selectedModel || !models.find(m => m.id === selectedModel))) {
            setSelectedModel(models[0].id);
          }
          autoAddFreeModels(models, detectedProvider, inputKey);
        }
      } catch (e) {
        if (active) {
          const defs = PROVIDERS[detectedProvider].models.map(id => ({ id, tags: categorizeModel(id, detectedProvider, null) }));
          defs.sort((a, b) => {
            const aFree = a.tags.includes('free');
            const bFree = b.tags.includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.id.localeCompare(b.id);
          });
          setAvailableModels(defs);
          if (!selectedModel || !defs.find(m => m.id === selectedModel)) {
            setSelectedModel(defs[0].id);
          }
          autoAddFreeModels(defs, detectedProvider, inputKey);
        }
      } finally {
        if (active) setIsIteratingModels(false);
      }
    };
    
    loadModels();
    
    return () => { active = false; };
  }, [detectedProvider, inputKey]);

  const handleAdd = () => {
    if (!detectedProvider || !inputKey || !selectedModel) return;
    
    const newItem: ChainItem = {
      id: Math.random().toString(36).substring(7),
      provider: detectedProvider,
      key: inputKey,
      model: selectedModel
    };
    
    setChain([...chain, newItem]);
    setInputKey('');
    setDetectedProvider(null);
    setSelectedModel('');
  };

  const handleRemove = (id: string) => {
    setChain(chain.filter(c => c.id !== id));
  };

  const handleSave = () => {
    localStorage.setItem('LLM_CHAIN', JSON.stringify(chain));
    llmService.updateChain(chain);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    try {
      const results = await llmService.testChainList(chain);
      setTestResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.95 }}
        className="w-full max-w-lg bg-panel border-2 border-border-gold shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-4 md:p-6 border-b border-border-gold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-gold" />
            <h2 className="serif text-xl italic text-white">API providers list</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gold hover:bg-gold hover:text-black transition-colors rounded-sm"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-gold opacity-80 block">
                {chain.length === 0 ? 'Add Primary API Key' : 'Add Fallback API Key'}
              </label>
              <div className="flex flex-col gap-2 relative">
                <input 
                  type="password" 
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  placeholder="Paste any API key (e.g. sk-... or AIza...)"
                  className="w-full bg-black/50 border border-border-gold/50 p-3 text-sm text-white focus:outline-none focus:border-gold placeholder:opacity-30"
                />
                
                {detectedProvider && (
                  <div className="absolute right-3 top-3 text-xs text-green-400 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded-full border border-green-400/30">
                    <CheckCircle2 size={12} />
                    {PROVIDERS[detectedProvider].name} Detected
                  </div>
                )}
              </div>
            </div>

            {showManualSelect && !detectedProvider && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 p-3 bg-red-900/10 border border-red-500/20"
              >
                <label className="text-[10px] tracking-widest uppercase text-red-400 opacity-80 block">
                  Could not auto-detect provider. Please select manually:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(PROVIDERS).map(([key, prov]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDetectedProvider(key as ProviderKey);
                        setSelectedModel(prov.models[0]);
                      }}
                      className="px-2 py-1.5 text-xs border border-white/10 hover:border-gold hover:text-gold transition-colors text-left"
                    >
                      {prov.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {detectedProvider && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-[10px] tracking-widest uppercase text-gold opacity-80 block flex items-center justify-between">
                  <span>Select LLM Model</span>
                  {isIteratingModels && <span className="text-gold/50 lowercase">Fetching models...</span>}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="flex-1 bg-black/50 border border-border-gold/50 p-3 text-sm text-white focus:outline-none focus:border-gold appearance-none"
                    style={{ maxHeight: '150px' }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.id} [{m.tags.join(', ')}]</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAdd}
                    className="px-4 bg-gold text-black hover:bg-white transition-colors flex items-center justify-center"
                    title="Add to chain"
                    disabled={isIteratingModels || availableModels.length === 0}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {chain.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border-gold/30">
              <label className="text-[10px] tracking-widest uppercase text-gold opacity-80 block">
                Your Fallback Chain
              </label>
              <div className="space-y-4 max-h-[30vh] overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                {Object.entries(
                  chain.reduce((acc, item) => {
                    if (!acc[item.key]) {
                      acc[item.key] = { provider: item.provider as ProviderKey, items: [], freeCount: 0, errorCount: 0, tokens: 0 };
                    }
                    acc[item.key].items.push(item);
                    
                    const tags = categorizeModel(item.model, item.provider as ProviderKey);
                    if (tags.includes('free')) acc[item.key].freeCount++;
                    if (testResults.find(r => r.id === item.id)?.status === 'failed') acc[item.key].errorCount++;
                    
                    const stat = tokenStats[item.id];
                    if (stat) acc[item.key].tokens += stat.prompt + stat.completion;
                    
                    return acc;
                  }, {} as Record<string, { provider: ProviderKey, items: typeof chain, freeCount: number, errorCount: number, tokens: number }>)
                ).map(([key, group], gIdx) => (
                  <div key={key} className="border border-border-gold/30 bg-black/40 p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-border-gold/20 pb-2">
                      <div className="flex flex-col">
                        <span className="text-gold font-bold uppercase tracking-widest text-xs">
                          {PROVIDERS[group.provider]?.name || group.provider}
                        </span>
                        <span className="font-mono text-[10px] opacity-50">...{key.slice(-4)}</span>
                      </div>
                      <button
                        onClick={() => {
                          const nextChain = chain.filter(c => c.key !== key);
                          setChain(nextChain);
                          localStorage.setItem('LLM_CHAIN', JSON.stringify(nextChain));
                          llmService.updateChain(nextChain);
                        }}
                        className="text-red-400/50 hover:text-red-400 p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold tracking-widest uppercase bg-black/30 p-2 border border-border-gold/10">
                      <div className="text-green-400 flex flex-col">
                        <span className="opacity-70 text-[8px]">Free LLMs</span>
                        <span>{group.freeCount}</span>
                      </div>
                      <div className="text-red-400 flex flex-col">
                        <span className="opacity-70 text-[8px]">Errors</span>
                        <span>{group.errorCount}</span>
                      </div>
                      <div className="text-blue-400 flex flex-col">
                        <span className="opacity-70 text-[8px]">Provider Tokens Used</span>
                        <span>{group.tokens}</span>
                      </div>
                      <div className="text-blue-400 flex flex-col">
                        <span className="opacity-70 text-[8px]">Chain Tokens Used</span>
                        <span>{Object.values(tokenStats).reduce((sum, s) => sum + s.prompt + s.completion, 0)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {group.items.map((item, idx) => {
                        const mstat = tokenStats[item.id];
                        const mtokens = mstat ? mstat.prompt + mstat.completion : 0;
                        return (
                          <div key={item.id} className="p-2 bg-black border border-border-gold/20 flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gold/90">{item.model}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-blue-400/80 font-mono">{mtokens} tkns used</span>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  className="text-red-400/50 hover:text-red-400"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            {testResults.find(r => r.id === item.id) && (
                              <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 flex items-center justify-between ${
                                testResults.find(r => r.id === item.id)?.status === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                              }`}>
                                <span>
                                  {testResults.find(r => r.id === item.id)?.status === 'success' ? 'Connection OK' : 'Connection Failed'}
                                </span>
                                <span className="opacity-50">
                                  {testResults.find(r => r.id === item.id)?.latency}ms
                                </span>
                              </div>
                            )}
                            {testResults.find(r => r.id === item.id)?.error && (
                              <div className="text-[10px] text-red-300/80 bg-red-900/10 px-2 py-1 leading-tight whitespace-pre-wrap">
                                {testResults.find(r => r.id === item.id)?.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        <div className="p-4 md:p-6 border-t border-border-gold shrink-0 flex justify-between items-center">
          {chain.length > 0 ? (
            <button 
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 border border-gold text-gold uppercase tracking-widest text-[10px] font-bold hover:bg-gold/10 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting ? <RefreshCcw size={14} className="animate-spin" /> : null}
              {isTesting ? 'Testing...' : 'Test Chain'}
            </button>
          ) : (
            <div />
          )}

          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-gold text-black uppercase tracking-widest text-[10px] font-bold hover:bg-white transition-colors flex items-center gap-2"
          >
            {saved ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Saved' : 'Save Configuration'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
