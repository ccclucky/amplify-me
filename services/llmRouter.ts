
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
  public getSpecForMode(mode: Mode, agentId: AgentId): ModelSpec | null { return MODEL_MATRIX[mode][agentId]; }

  private extractTextFromResponse(res: any): string {
    if (res?.text) return res.text;
    const parts = res?.candidates?.[0]?.content?.parts;
    if (!parts) return "";
    return parts.map((part: { text?: string }) => part.text).filter(Boolean).join("\n");
  }

  private recordTrace(
    agentId: AgentId,
    spec: ModelSpec,
    attempt: number,
    durationMs: number,
    ok: boolean,
    error?: string,
    modeOverride?: Mode
  ) {
    this.traces.push({
      agent: agentId,
      mode: modeOverride || this.mode,
      model: spec.model,
      temperature: spec.temperature,
      responseMimeType: spec.responseMimeType,
      retriesUsed: attempt,
      durationMs,
      ok,
      error
    });
  }

  private async withRetries<T>(
    agentId: AgentId,
    spec: ModelSpec,
    action: () => Promise<T>,
    isValid: (result: T) => boolean = () => true,
    modeOverride?: Mode
  ): Promise<T> {
    const attempts = Math.max(1, spec.retries || 1);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const start = performance.now();
      try {
        const result = await action();
        if (!isValid(result)) {
          throw new Error(`[LLMRouter] Invalid response for ${agentId}`);
        }
        const durationMs = Math.round(performance.now() - start);
        this.recordTrace(agentId, spec, attempt, durationMs, true, undefined, modeOverride);
        return result;
      } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        const message = error instanceof Error ? error.message : String(error);
        this.recordTrace(agentId, spec, attempt, durationMs, false, message, modeOverride);
        lastError = error;
      }
    }

    throw lastError;
  }

  async callJson<T>(agentId: AgentId, contents: any[], systemInstruction: string, schema: any): Promise<T> {
    const spec = this.getSpec(agentId);
    return this.withRetries(
      agentId,
      spec,
      async () => {
        const res = await this.ai.models.generateContent({
          model: spec.model,
          contents,
          config: { temperature: spec.temperature, responseMimeType: 'application/json', responseSchema: schema, systemInstruction, tools: spec.tools }
        });
        const text = this.extractTextFromResponse(res);
        if (!text) {
          throw new Error(`[LLMRouter] Empty JSON response for ${agentId}`);
        }
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as T;
      }
    );
  }

  async callText(agentId: AgentId, contents: any[], systemInstruction: string): Promise<string> {
    const spec = this.getSpec(agentId);
    return this.withRetries(
      agentId,
      spec,
      async () => {
        const res = await this.ai.models.generateContent({ model: spec.model, contents, config: { temperature: spec.temperature, systemInstruction } });
        return this.extractTextFromResponse(res);
      },
      (text) => Boolean(text && text.trim())
    );
  }

  async callTextWithMode(mode: Mode, agentId: AgentId, contents: any[], systemInstruction: string): Promise<string> {
    const spec = this.getSpecForMode(mode, agentId);
    if (!spec) {
      throw new Error(`[LLMRouter] Missing model spec for ${mode}:${agentId}`);
    }
    return this.withRetries(
      agentId,
      spec,
      async () => {
        const res = await this.ai.models.generateContent({ model: spec.model, contents, config: { temperature: spec.temperature, systemInstruction } });
        return this.extractTextFromResponse(res);
      },
      (text) => Boolean(text && text.trim()),
      mode
    );
  }

  async callJsonWithMode<T>(mode: Mode, agentId: AgentId, contents: any[], systemInstruction: string, schema: any): Promise<T> {
    const spec = this.getSpecForMode(mode, agentId);
    if (!spec) {
      throw new Error(`[LLMRouter] Missing model spec for ${mode}:${agentId}`);
    }
    return this.withRetries(
      agentId,
      spec,
      async () => {
        const res = await this.ai.models.generateContent({
          model: spec.model,
          contents,
          config: { temperature: spec.temperature, responseMimeType: 'application/json', responseSchema: schema, systemInstruction, tools: spec.tools }
        });
        const text = this.extractTextFromResponse(res);
        if (!text) {
          throw new Error(`[LLMRouter] Empty JSON response for ${agentId}`);
        }
        return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as T;
      },
      undefined,
      mode
    );
  }

  private buildImageParts(prompt: string, base64Image: string, referenceImages: string[]) {
    const referenceParts = referenceImages.map((image) => ({
      inlineData: { mimeType: 'image/png', data: image.split(',')[1] }
    }));
    return [
      { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
      ...referenceParts,
      { text: prompt }
    ];
  }

  private async callImageGenWithSpec(
    agentId: AgentId,
    spec: ModelSpec,
    prompt: string,
    base64Image: string,
    referenceImages: string[],
    modeOverride?: Mode
  ): Promise<string | null> {
    return this.withRetries(
      agentId,
      spec,
      async () => {
        const parts = this.buildImageParts(prompt, base64Image, referenceImages);
        const res = await this.ai.models.generateContent({ model: spec.model, contents: [{ role: 'user', parts }], config: { temperature: spec.temperature, topP: spec.topP, topK: spec.topK } });
        for (const part of res.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
      },
      (image) => Boolean(image),
      modeOverride
    );
  }

  async callImageGen(prompt: string, base64Image: string, referenceImages: string[] = []): Promise<string | null> {
    const spec = this.getSpec('IMAGE_GEN');
    return this.callImageGenWithSpec('IMAGE_GEN', spec, prompt, base64Image, referenceImages);
  }

  async callImageGenWithMode(mode: Mode, prompt: string, base64Image: string, referenceImages: string[] = []): Promise<string | null> {
    const spec = this.getSpecForMode(mode, 'IMAGE_GEN');
    if (!spec) return null;
    return this.callImageGenWithSpec('IMAGE_GEN', spec, prompt, base64Image, referenceImages, mode);
  }
}
