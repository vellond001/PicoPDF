import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { awareness } from './awareness';
import { RetryManager } from './retry';

export interface ChainItem {
  id: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter';
  key: string;
  model: string;
}

class LLMService {
  private chain: ChainItem[] = [];
  private retry = new RetryManager('llm-service');

  constructor() {
    const saved = localStorage.getItem('LLM_CHAIN');
    if (saved) {
      try {
        this.chain = JSON.parse(saved);
      } catch (e) {}
    } else {
      const gkey = process.env.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
      if (gkey) {
        this.chain.push({
          id: 'default-gemini',
          provider: 'gemini',
          key: gkey,
          model: 'gemini-2.5-flash'
        });
      }
    }
  }

  updateChain(chain: ChainItem[]) {
    this.chain = chain;
  }

  getUsageStats(): Record<string, { prompt: number, completion: number }> {
    const saved = localStorage.getItem('LLM_USAGE_STATS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  }

  recordUsage(id: string, promptTokens: number, completionTokens: number) {
    const stats = this.getUsageStats();
    if (!stats[id]) stats[id] = { prompt: 0, completion: 0 };
    stats[id].prompt += promptTokens;
    stats[id].completion += completionTokens;
    localStorage.setItem('LLM_USAGE_STATS', JSON.stringify(stats));
  }

  async testChainList(chainToTest: ChainItem[]): Promise<{ id: string, status: 'success' | 'failed', latency: number, error?: string }[]> {
    const results: { id: string, status: 'success' | 'failed', latency: number, error?: string }[] = [];
    const system = "Reply with exactly: OK";
    const prompt = "Test connection";

    for (const item of chainToTest) {
      const start = Date.now();
      try {
        if (item.provider === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: item.key });
          const res = await ai.models.generateContent({
            model: item.model || "gemini-2.5-flash",
            contents: prompt,
            config: { systemInstruction: system, maxOutputTokens: 5 }
          });
          if (!res.text) throw new Error("No response");
        } else if (item.provider === 'openai') {
          const ai = new OpenAI({ apiKey: item.key, dangerouslyAllowBrowser: true });
          await ai.chat.completions.create({
            model: item.model || "gpt-4o-mini",
            messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
            max_tokens: 5
          });
        } else if (item.provider === 'anthropic') {
          const ai = new Anthropic({ apiKey: item.key, dangerouslyAllowBrowser: true } as any);
          await ai.messages.create({
            model: item.model || "claude-3-5-sonnet-20241022",
            max_tokens: 5,
            system: system,
            messages: [{ role: "user", content: prompt }]
          });
        } else if (item.provider === 'groq') {
          const ai = new Groq({ apiKey: item.key, dangerouslyAllowBrowser: true });
          await ai.chat.completions.create({
            model: item.model || "llama-3.1-8b-instant",
            messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
            max_tokens: 5
          });
        } else if (item.provider === 'openrouter') {
          const ai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: item.key,
            dangerouslyAllowBrowser: true,
            defaultHeaders: { "HTTP-Referer": window.location.href, "X-Title": "PicoPDF" }
          });
          await ai.chat.completions.create({
            model: item.model || "meta-llama/llama-3-8b-instruct:free",
            messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
            max_tokens: 5
          });
        }
        results.push({ id: item.id, status: 'success', latency: Date.now() - start });
      } catch (e: any) {
        results.push({ id: item.id, status: 'failed', latency: Date.now() - start, error: e.message || String(e) });
      }
    }
    return results;
  }

  getChain() {
    return this.chain;
  }

  async *summarizeStream(text: string, activeModelId?: string) {
    const basePrompt = `Please summarize the following document content:\n\n${text.slice(0, 30000)}`;
    const system = `You are PicoAI Orchestrator, an elite document analyzer and intelligence assistant.

Core Directives:
1. Role Reinforcement: You are a sharp, analytical intelligence interface. Maintain this authoritative and precise persona at all times.
2. Metacognition & Reasoning: Analyze the document format, complexity, and key themes to determine the best summarization strategy (e.g., bullet points vs paragraph, technical vs layman terms).
3. Verbosity Auto-Tuning: Ensure the summary depth reflects the document's density. Extract core insights efficiently without unnecessary fluff.
4. Grounding: Root all summaries strictly in the provided Document Content.`;
    let generatedSoFar = "";
    
    let modelsToTry = this.chain;
    if (activeModelId) {
      const selected = this.chain.find(c => c.id === activeModelId);
      if (selected) {
        modelsToTry = [selected, ...this.chain.filter(c => c.id !== activeModelId)];
      }
    }

    for (const item of modelsToTry) {
      const prompt = generatedSoFar
        ? `${basePrompt}\n\n[System directive: A previous model started generating a response but failed mid-way. Please CONTINUE the following partial response from exactly where it left off. DO NOT repeat what is already written. Start your response directly with the continuation:]\n\n${generatedSoFar}`
        : basePrompt;
      const promptTokens = Math.ceil((prompt.length + system.length) / 4);
      let completionLength = 0;
      try {
        if (item.provider === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: item.key });
          const stream = await ai.models.generateContentStream({
            model: item.model,
            contents: prompt,
            config: { systemInstruction: system }
          });
          for await (const chunk of stream) {
            const t = chunk.text || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-summarize-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'openai') {
          const ai = new OpenAI({ apiKey: item.key, dangerouslyAllowBrowser: true });
          const stream = await ai.chat.completions.create({
            model: item.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-summarize-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'anthropic') {
          const ai = new Anthropic({ apiKey: item.key, dangerouslyAllowBrowser: true } as any);
          const stream = await ai.messages.create({
            model: item.model,
            max_tokens: 1000,
            system: system,
            messages: [
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && 'text' in chunk.delta) {
              const t = chunk.delta.text || "";
              completionLength += t.length;
              generatedSoFar += t;
              yield t;
            }
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-summarize-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'groq') {
          const ai = new Groq({ apiKey: item.key, dangerouslyAllowBrowser: true });
          const stream = await ai.chat.completions.create({
            model: item.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-summarize-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'openrouter') {
          const ai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: item.key,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
              "HTTP-Referer": window.location.href,
              "X-Title": "PicoPDF",
            }
          });
          const stream = await ai.chat.completions.create({
            model: item.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-summarize-stream-${item.provider}`);
          return;
        }
      } catch (e) {
        console.warn(`Provider ${item.provider} failed, trying next...`, e);
      }
    }
    throw new Error("All LLM providers failed or none are configured.");
  }

  async *queryStream(text: string, history: Array<{ role: string, content: string }>, activeModelId?: string) {
    const chatHistory = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    const basePrompt = `Document Content:\n${text.slice(0, 30000)}\n\nConversation History:\n${chatHistory}\n\nPlease respond to the last User message as the Assistant.`;
    const system = `You are PicoAI Orchestrator, an elite document analyzer and intelligence assistant.

Core Directives:
1. Role Reinforcement: You are a sharp, analytical intelligence interface. Maintain this authoritative and precise persona at all times.
2. Metacognition & Reasoning: Implicitly analyze the intent, complexity, and underlying assumptions of the user's request. Formulate a structured reasoning path before answering. 
3. Verbosity Auto-Tuning: Dynamically adjust your detail level based on the user's prompt. Provide concise, direct answers for simple queries, and deep, comprehensive breakdowns for analytical or complex questions.
4. Grounding: Root all answers strictly in the provided Document Content. If the document lacks the answer, state that clearly instead of guessing.

Interactive UI Copilot Mode:
If the user asks for a tour, a tutorial, or wants to know how to use the app or a specific feature:
You can highlight UI elements by emitting a special XML tag at the end of your response. 
Format: <tour steps='[{"target":".step-toolbar-zoom-in","content":"Use this to zoom in."}]' />
Important Targets you can use:
- .step-toolbar-open : File Open button in the toolbar
- .step-toolbar-prev : Previous page button
- .step-toolbar-next : Next page button
- .step-toolbar-modes : Edit, draw, and watermark modes
- .step-toolbar-compress : Compress PDF button
- .step-toolbar-split : Split PDF button
- .step-toolbar-fullscreen : Toggle fullscreen mode
- .step-sidebar-toggle : Toggle the sidebar (top left)
- .step-settings : Settings button (top right)
- .step-metrics : Diagnostics button (top right)

Analyze the context, tune your verbosity, and deliver the optimal response.`;
    let generatedSoFar = "";

    let modelsToTry = this.chain;
    if (activeModelId) {
      const selected = this.chain.find(c => c.id === activeModelId);
      if (selected) {
        modelsToTry = [selected, ...this.chain.filter(c => c.id !== activeModelId)];
      }
    }

    for (const item of modelsToTry) {
      const prompt = generatedSoFar
        ? `${basePrompt}\n\n[System directive: A previous model started generating a response but failed mid-way. Please CONTINUE the following partial response from exactly where it left off. DO NOT repeat what is already written. Start your response directly with the continuation:]\n\n${generatedSoFar}`
        : basePrompt;
      const promptTokens = Math.ceil((prompt.length + system.length) / 4);
      let completionLength = 0;
      try {
        if (item.provider === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: item.key });
          const stream = await ai.models.generateContentStream({
            model: item.model || "gemini-2.5-pro",
            contents: prompt,
            config: { systemInstruction: system }
          });
          for await (const chunk of stream) {
            const t = chunk.text || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-query-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'openai') {
          const ai = new OpenAI({ apiKey: item.key, dangerouslyAllowBrowser: true });
          const stream = await ai.chat.completions.create({
            model: item.model || "gpt-4o",
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-query-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'anthropic') {
          const ai = new Anthropic({ apiKey: item.key, dangerouslyAllowBrowser: true } as any);
          const stream = await ai.messages.create({
            model: item.model || "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: system,
            messages: [
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && 'text' in chunk.delta) {
              const t = chunk.delta.text || "";
              completionLength += t.length;
              generatedSoFar += t;
              yield t;
            }
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-query-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'groq') {
          const ai = new Groq({ apiKey: item.key, dangerouslyAllowBrowser: true });
          const stream = await ai.chat.completions.create({
            model: item.model || "llama-3.1-70b-versatile",
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-query-stream-${item.provider}`);
          return;
        }

        if (item.provider === 'openrouter') {
          const ai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: item.key,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
              "HTTP-Referer": window.location.href,
              "X-Title": "PicoPDF",
            }
          });
          const stream = await ai.chat.completions.create({
            model: item.model || "meta-llama/llama-3-8b-instruct:free",
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta?.content || "";
            completionLength += t.length;
            generatedSoFar += t;
            yield t;
          }
          this.recordUsage(item.id, promptTokens, Math.ceil(completionLength / 4));
          awareness.recordSuccess(`llm-query-stream-${item.provider}`);
          return;
        }
      } catch (e) {
        console.warn(`Provider ${item.provider} failed, trying next...`, e);
      }
    }
    throw new Error("All LLM providers failed or none are configured.");
  }
}

export const llmService = new LLMService();
