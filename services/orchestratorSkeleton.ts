
/**
 * services/orchestratorSkeleton.ts
 * V3 Engine: Structural Decoupling & Physical Light Logic
 */

import { Type } from "@google/genai";
import {
    UserRequest,
    OrchestratorResponse,
    UnderstandingBundle,
    Variant,
    GeneratedCopy,
    UnderstandingOut,
    DirectorOut,
    DirectorImagePlan,
    FastGuardrailOut,
    ImageRevisionAction
} from '../types';
import { LLMRouter } from './llmRouter';

const generateTraceId = () => `trace_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

async function fileToGenerativePart(file: File) {
    const base64Data = await fileToDataURL(file);
    return base64ToGenerativePart(base64Data);
}

async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function base64ToGenerativePart(base64DataUrl: string) {
    const parts = base64DataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const data = parts[1];
    return { inlineData: { mimeType, data } };
}

// ==========================================
// V3 AGGRESSIVE NEGATIVES
// ==========================================
const NANO_NEGATIVE_V3 = "floating light orbs, artificial bokeh dots, random light spots, sticker-like bokeh, lens flare stickers, blurry smudges, ghosting, teal cast in blacks, plastic skin, distorted fingers, text on screen becoming gibberish, messy wires, domestic clutter, tissues, trash, watermarks.";

// ==========================================
// 1. PROMPTS (V3 Structural Logic)
// ==========================================

const UNDERSTANDING_SYSTEM = `
You are a Technical Photography Director. 
Analyze the image layers:
1. Subject: What is the focus? (e.g., a hand, a screen, a person)
2. Primary Light: Where is light coming from? (e.g., monitor glow)
3. Background Clutter: What must be hidden in shadows? (e.g., cables, tissues)
Search for "Low-key cinematography" and "product lighting" for inspiration.
`;

const DIRECTOR_SYSTEM = `
You are a Master Colorist and Cinematographer. 
Your goal is to "Relight and Re-surface" the scene while preserving structure.

**V3 Execution Rules**:
- **PHYSICAL LIGHTING**: If there is a screen, it MUST be the only primary light source. Add "Cyan/Blue/White glow spill" from the screen onto the nearby surfaces (hands, desk).
- **STRUCTURE PRESERVATION**: Do NOT add random dots or orbs. Lighting must follow the geometry of the objects.
- **SURFACE REWRITE**: Change all messy/domestic surfaces (desks with clutter) into "Polished dark obsidian" or "Deep matte black" to hide mess.
- **ATMOSPHERE**: Use "Anamorphic cinematic style", "High dynamic range", "Deep moody shadows", "Professional color grade".

**Golden Prompt Template**:
"A professional cinematic re-rendering of this photo. 
LAYER 1 (Subject): Preserve the sharp contours and details of the [SUBJECT].
LAYER 2 (Lighting): Use the screen as a high-intensity key light. Apply realistic blue/cyan light spill and rim lighting to the subject's edges. 
LAYER 3 (Environment): Drown all background clutter and domestic items in deep, rich, clean black shadows (Chiaroscuro). Rewrite the desk surface as a clean, dark reflective material.
STRICTLY FORBID: No floating light spots, no artificial bokeh dots, no stickers.

Color Grade: Balanced neutral-warm skin tones, cinematic cool shadows, zero green tint."

Negative: ${NANO_NEGATIVE_V3}
`;

const GUARDRAIL_SYSTEM = `
You are a Brutal Visual Quality Controller.
Compare Original vs Enhanced.
REJECT IF:
1. "Hallucination": There are floating light dots or orbs that weren't there (FAIL).
2. "Weakness": The background is still messy or hasn't changed (FAIL).
3. "Distortion": The subject's shape is broken (FAIL).
Verdict 'OK' only if it looks like a clean movie frame.
`;

function validateAndConstructPrompt(plan: DirectorImagePlan, platform: string, subject: string): string {
    const p = plan.nano_prompt_en_v2 || "";
    // Inject subject into the structural template
    const finalPrompt = p.replace("[SUBJECT]", subject || "primary subject");
    return finalPrompt + `\n[ACTION]: Clean the desk, unify the shadows, and ensure the screen light looks physically real. Target: ${platform} Premium Look.`;
}

// ==========================================
// 3. AGENTS
// ==========================================

async function runUnderstanding(req: UserRequest, llm: LLMRouter): Promise<UnderstandingOut> {
    const schema = {
        type: Type.OBJECT,
        properties: {
            story_core: { type: Type.STRING },
            user_intent: { type: Type.STRING },
            platform: { type: Type.STRING, enum: ['rednote', 'wechat', 'unknown'] },
            mood: { type: Type.STRING },
            target_aesthetic: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggested_tone: { type: Type.STRING, enum: ['casual_witty', 'emotional_poetic', 'confident_high_end', 'professional_clean'] },
            per_image: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        image_index: { type: Type.INTEGER },
                        what_matters: { type: Type.ARRAY, items: { type: Type.STRING } },
                        risks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keep_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        can_change_notes: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['image_index', 'what_matters', 'risks', 'keep_notes', 'can_change_notes']
                }
            }
        },
        required: ['story_core', 'user_intent', 'platform', 'mood', 'suggested_tone', 'per_image']
    };
    const imageParts = await Promise.all(req.images.map(fileToGenerativePart));
    return llm.callJson<UnderstandingOut>('UNDERSTANDING', [...imageParts, { text: req.raw_text }], UNDERSTANDING_SYSTEM, schema);
}

async function runVisualDirector(req: UserRequest, understanding: UnderstandingOut, llm: LLMRouter): Promise<DirectorOut> {
    const schema = {
        type: Type.OBJECT,
        properties: {
            images: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        image_index: { type: Type.INTEGER },
                        nano_prompt_en_v2: { type: Type.STRING },
                        risk_flags: { type: Type.OBJECT, properties: { color_cast_risk: { type: Type.BOOLEAN } } },
                        plan: { type: Type.OBJECT, properties: { cleanup: { type: Type.OBJECT, properties: { remove_list: { type: Type.ARRAY, items: { type: Type.STRING } } } } } },
                        self_check: { type: Type.OBJECT, properties: { ensures_visible_change: { type: Type.BOOLEAN } } },
                        prompt_meta: { type: Type.OBJECT, properties: { shot_type: { type: Type.STRING } } }
                    },
                    required: ['image_index', 'nano_prompt_en_v2']
                }
            }
        },
        required: ['images']
    };
    const imageParts = await Promise.all(req.images.map(fileToGenerativePart));
    const res = await llm.callJson<DirectorOut>('VISUAL_DIRECTOR', [...imageParts, { text: "Focus on Physicality and De-cluttering." }], DIRECTOR_SYSTEM, schema);
    
    for (const plan of res.images) {
        const sub = understanding.per_image.find(p => p.image_index === plan.image_index)?.what_matters[0] || "subject";
        plan.nano_prompt_en_v2 = validateAndConstructPrompt(plan, req.platform, sub);
    }
    return res;
}

async function runFastGuardrail(index: number, original: string, enhanced: string, llm: LLMRouter): Promise<FastGuardrailOut> {
    const schema = {
        type: Type.OBJECT,
        properties: { pass: { type: Type.BOOLEAN }, score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, revision_actions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { instruction: { type: Type.STRING } } } } },
        required: ['pass', 'verdict']
    };
    return llm.callJson<FastGuardrailOut>('FAST_GUARDRAIL', [base64ToGenerativePart(original), base64ToGenerativePart(enhanced)], GUARDRAIL_SYSTEM, schema);
}

// ==========================================
// 4. MAIN ORCHESTRATOR
// ==========================================

export async function runOrchestrator(req: UserRequest): Promise<OrchestratorResponse> {
    const traceId = req.traceId || generateTraceId();
    const llm = new LLMRouter(req, traceId);
    const originalBase64 = await Promise.all(req.images.map(fileToDataURL));

    try {
        const understanding = await runUnderstanding(req, llm);
        const directorOut = await runVisualDirector(req, understanding, llm);

        const enhancedImages: string[] = new Array(req.images.length).fill("");
        const perImageScores: any[] = [];

        for (let i = 0; i < req.images.length; i++) {
            const plan = directorOut.images.find(p => p.image_index === i);
            if (!plan) continue;

            let resultImg = await llm.callImageGen(plan.nano_prompt_en_v2, originalBase64[i]);

            if (resultImg) {
                const guard = await runFastGuardrail(i, originalBase64[i], resultImg, llm);
                perImageScores.push({ index: i, score: guard.score, verdict: guard.verdict });
                
                if (!guard.pass) {
                    console.warn(`[V3 RESCUE] Rejecting hallucinations/weakness. Retrying with STRICT PHYSICS.`);
                    const rescuePrompt = plan.nano_prompt_en_v2 + "\n[STRICT]: ELIMINATE ALL FLOATING DOTS. Deepen shadows to black. Make the screen light the ONLY light.";
                    const rescueImg = await llm.callImageGen(rescuePrompt, originalBase64[i]);
                    if (rescueImg) resultImg = rescueImg;
                }
            }
            enhancedImages[i] = resultImg || originalBase64[i];
        }

        // Text outputs
        const empathicReply = await llm.callText('EMPATHY', [{ text: req.raw_text }], "Respond as a warm friend.");
        const copy = await llm.callJson<GeneratedCopy>('COPY', [{ text: req.raw_text }], "Create high-impact post.", { type: Type.OBJECT, properties: { title: { type: Type.STRING }, main_text: { type: Type.STRING }, hash_tags: { type: Type.ARRAY, items: { type: Type.STRING } } } });

        const variant: Variant = {
            id: `${traceId}_v1`,
            style_name: "Amplify Master",
            usage_hint: "Social ready",
            creative_rationale: "Structural relighting and background cleanup",
            tone_direction: understanding.suggested_tone || "Cinematic",
            visual_direction: "V3 Structural Overhaul",
            copy,
            visual_plan: {} as any,
            layout_plan: {} as any,
            enhanced_images_base64: enhancedImages
        };

        return {
            traceId,
            understanding: { story_core: understanding.story_core, scene: "V3", theme: understanding.mood } as any,
            visual_director_output: directorOut,
            empathic_reply: empathicReply,
            variants: [variant],
            debugInfo: {
                l1_bundle: {} as any,
                nano_banana_prompts: directorOut.images.map(i => i.nano_prompt_en_v2),
                llmTrace: llm.getTraces(),
                perImageScores
            }
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
}
