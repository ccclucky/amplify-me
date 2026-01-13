
/**
 * services/llmRouter.ts
 * V3 Tuning: Balanced Creativity
 */

import { GoogleGenAI } from "@google/genai";
import { UserRequest, LLMTraceRecord } from "../types";

export type AgentId = 'UNDERSTANDING' | 'VISUAL_DIRECTOR' | 'IMAGE_GEN' | 'FAST_GUARDRAIL' | 'IMAGE_QA' | 'COPY' | 'EMPATHY';
export type Mode = 'fast' | 'quality';
export type ModelSpec = { model: string; temperature: number; topP?: number; topK?: number; maxOutputTokens?: number; responseMimeType?: 'application/json' | 'text/plain'; retries: number; tools?: any[]; };

const MODEL_MATRIX: Record<Mode, Record<AgentId, ModelSpec | null>> = {
  fast: {
    UNDERSTANDING: { model: 'gemini-3-pro-preview', temperature: 0.2, responseMimeType: 'application/json', retries: 2, tools: [{ googleSearch: {} }] },
    VISUAL_DIRECTOR: { model: 'gemini-3-pro-preview', temperature: 0.4, responseMimeType: 'application/json', retries: 2 },
    // V3 Tuning: 0.5 is the sweet spot for structural changes without random noise
    IMAGE_GEN: { model: 'gemini-2.5-flash-image', temperature: 0.5, maxOutputTokens: 1024, retries: 2 },
    FAST_GUARDRAIL: { model: 'gemini-2.5-flash-lite', temperature: 0.1, responseMimeType: 'application/json', retries: 1 },
    IMAGE_QA: null,
    COPY: { model: 'gemini-2.5-flash', temperature: 0.7, responseMimeType: 'application/json', retries: 2 },
    EMPATHY: { model: 'gemini-2.5-flash', temperature: 0.5, maxOutputTokens: 100, retries: 2 },
  },
  quality: {
    UNDERSTANDING: { model: 'gemini-3-pro-preview', temperature: 0.2, responseMimeType: 'application/json', retries: 3, tools: [{ googleSearch: {} }] },
    VISUAL_DIRECTOR: { model: 'gemini-3-pro-preview', temperature: 0.4, responseMimeType: 'application/json', retries: 3 },
    IMAGE_GEN: { model: 'gemini-3-pro-image-preview', temperature: 0.55, retries: 3, topP: 0.9, topK: 30 },
    IMAGE_QA: { model: 'gemini-2.5-flash-lite', temperature: 0.1, responseMimeType: 'application/json', retries: 2 },
    FAST_GUARDRAIL: null,
    COPY: { model: 'gemini-3-pro-preview', temperature: 0.7, responseMimeType: 'application/json', retries: 3 },
    EMPATHY: { model: 'gemini-3-pro-preview', temperature: 0.5, maxOutputTokens: 100, retries: 2 },
  }
};

export class LLMRouter {
  private ai: GoogleGenAI;
  private mode: Mode;
  private traceId: string;
  private traces: LLMTraceRecord[] = [];

  constructor(request: UserRequest, traceId: string) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.traceId = traceId;
    this.mode = request.enable_l4_loop ? 'quality' : (request.performance_mode || 'fast');
  }

  public getMode(): Mode { return this.mode; }
  public getTraces(): LLMTraceRecord[] { return this.traces; }
  public getSpec(agentId: AgentId): ModelSpec { return MODEL_MATRIX[this.mode][agentId]!; }

  async callJson<T>(agentId: AgentId, contents: any[], systemInstruction: string, schema: any): Promise<T> {
    const spec = this.getSpec(agentId);
    const res = await this.ai.models.generateContent({
      model: spec.model,
      contents,
      config: { temperature: spec.temperature, responseMimeType: 'application/json', responseSchema: schema, systemInstruction, tools: spec.tools }
    });
    this.traces.push({ agent: agentId, mode: this.mode, model: spec.model, temperature: spec.temperature, retriesUsed: 0, durationMs: 0, ok: true });
    return JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim()) as T;
  }

  async callText(agentId: AgentId, contents: any[], systemInstruction: string): Promise<string> {
    const spec = this.getSpec(agentId);
    const res = await this.ai.models.generateContent({ model: spec.model, contents, config: { temperature: spec.temperature, systemInstruction } });
    this.traces.push({ agent: agentId, mode: this.mode, model: spec.model, temperature: spec.temperature, retriesUsed: 0, durationMs: 0, ok: true });
    return res.text || "";
  }

  async callImageGen(prompt: string, base64Image: string): Promise<string | null> {
    const spec = this.getSpec('IMAGE_GEN');
    const parts = [{ inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } }, { text: prompt }];
    const res = await this.ai.models.generateContent({ model: spec.model, contents: [{ role: 'user', parts }], config: { temperature: spec.temperature, topP: spec.topP, topK: spec.topK } });
    for (const part of res.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  }
}
