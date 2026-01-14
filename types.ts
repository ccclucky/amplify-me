
/**
 * types.ts
 * AmplifyMe Core Data Contracts
 * Refactored for L1-L3 Architecture (Understanding, Generation, Quality)
 */

// ==========================================
// 0. Core Input/Output (L0 Orchestrator)
// ==========================================

export interface UserRequest {
  images: File[];
  reference_images?: File[];
  raw_text: string;
  platform: 'wechat_moments' | 'xiaohongshu';
  mood_user: 'happy' | 'tired' | 'sad' | 'calm' | 'anxious' | 'grateful' | 'proud';
  intent_user: 'just_record' | 'show_off' | 'seek_empathy' | 'vent';
  language?: 'zh' | 'en';

  // L4/Quality Loop Switch
  enable_l4_loop?: boolean;

  // Performance Mode
  performance_mode?: 'fast' | 'quality';

  // Action & Refine Context
  action?: 'create' | 'refine';
  traceId?: string; // For session continuity
  variant_id?: string | null;
  refine_mode?: 'none' | 'more_literary' | 'more_realistic' | 'lighter';
  refine_instruction?: string | null;
  refine_target?: 'copy' | 'image' | 'both';
  refine_from_original?: boolean;
  refine_image_index?: number;
}

// ==========================================
// NEW: Structured Schemas (Strict JSON)
// ==========================================

// 1. Understanding Schema
export interface UnderstandingPerImage {
  image_index: number;
  what_matters: string[];
  risks: Array<'skin_tone_risk' | 'artifact_risk' | 'glare_risk' | 'too_weak_change_risk' | 'identity_drift_risk' | 'color_cast_risk'>;
  keep_notes: string[];
  can_change_notes: string[];
}

export interface UnderstandingOut {
  story_core: string;
  user_intent: string;
  platform: 'rednote' | 'wechat' | 'unknown';
  mood: string;
  suggested_tone?: 'casual_witty' | 'emotional_poetic' | 'confident_high_end' | 'professional_clean';
  target_aesthetic: string[];
  per_image: UnderstandingPerImage[];
}

// 2. Visual Director Schema

export interface DirectorPromptMeta {
  shot_type: string;
  aspect_ratio: string;
  lens_hint: string;
  lighting_hint: string;
  wb_policy: string;
  has_skin_lock: boolean;
}

export interface DirectorImagePlan {
  image_index: number;
  goal: string;
  risk_flags: {
    skin_tone_risk: boolean;
    artifact_risk: boolean;
    glare_risk: boolean;
    too_weak_change_risk: boolean;
    identity_drift_risk: boolean;
    color_cast_risk: boolean;
  };
  plan: {
    crop: {
      ratio: '4:5' | '3:4' | '1:1' | '16:9';
      subject_scale: number;
      subject_position: 'center' | 'upper' | 'left' | 'right';
      notes: string[];
    };
    lighting: {
      key_light: string;
      fill: string;
      vignette: string;
      local_dodge_burn: string[];
    };
    color_grade: {
      wb: string;
      contrast_curve: string;
      saturation: string;
      highlight_rolloff: string;
      shadow_tint: string;
      skin_tone_protection: boolean;
    };
    cleanup: {
      remove_list: string[];
      simplify_background: string;
      fix_reflection: string;
    };
    detail: {
      texture_keep: string;
      sharpen_strategy: string;
      grain: string;
      portrait_retouch: string;
      hand_preserve: string;
    };
  };
  nano_prompt_en_v2: string; // The "Golden Paragraph"
  prompt_meta: DirectorPromptMeta;
  self_check: {
    has_keep: boolean;
    has_actions_min4: boolean;
    has_negatives: boolean;
    has_skin_lock_if_needed: boolean;
    ensures_visible_change: boolean;
    required_fields_ok: boolean;
  };
}

export interface DirectorOut {
  images: DirectorImagePlan[];
}

// 3. Guardrail & QA Schemas
export interface ImageRevisionAction {
  action: 'CROP' | 'CLEAN' | 'LIGHT' | 'COLOR' | 'DETAIL';
  instruction: string;
}

export interface FastGuardrailOut {
  image_index: number;
  pass: boolean;
  score: number;
  verdict: 'OK' | 'COLOR_CAST' | 'ARTIFACTS' | 'TOO_WEAK_CHANGE' | 'WORSE_THAN_ORIGINAL';
  reasons: string[];
  revision_actions: ImageRevisionAction[];
}

export interface ImageQAOut {
  image_index: number;
  pass: boolean;
  score: number;
  breakdown: {
    shareability: number;
    aesthetic: number;
    subject_clarity: number;
    realism: number;
    artifact_risk: number;
  };
  verdict: 'OK' | 'COLOR_CAST' | 'ARTIFACTS' | 'TOO_WEAK_CHANGE' | 'NEEDS_RECOMPOSE' | 'NEEDS_CLEANUP';
  reasons: string[];
  revision_actions: ImageRevisionAction[];
}

// ==========================================
// Orchestrator Response
// ==========================================

export interface LLMTraceRecord {
  agent: string;
  mode: 'fast' | 'quality';
  model: string;
  temperature: number;
  responseMimeType?: string;
  retriesUsed: number;
  durationMs: number;
  ok: boolean;
  fallbackUsed?: boolean;
  fallbackModel?: string;
  error?: string;
}

export interface OrchestratorResponse {
  traceId: string;
  understanding: UnderstandingBundle;
  visual_director_output?: DirectorOut;
  empathic_reply: string;
  variants: Variant[];

  debugInfo?: {
    l1_bundle: UnderstandingBundle;
    nano_banana_prompts: string[];
    mode_preset_used?: string;
    llmTrace?: LLMTraceRecord[];
    qualityDegradedReason?: string;
    perImageScores?: Array<{ index: number; type: 'guardrail' | 'qa'; score: number; verdict: string; iter?: number }>;
    directorPlans?: DirectorOut;
    prompt_validation?: Array<{ image_index: number; ok: boolean; missing_markers: string[] }>;
  };

  // Legacy fields
  content_understanding?: ContentUnderstandingOutput;
  emotion_state?: EmotionDetectionOutput;
  tone_profile?: ToneProfileOutput;
}

// ==========================================
// L1. Understanding Bundle (Legacy Wrapper)
// ==========================================

export interface UnderstandingBundle {
  story_core: string;
  scene: string;
  theme: string;
  time_of_day?: string;

  images_meta: {
    index: number;
    rough_description: string;
    role: 'primary' | 'secondary' | 'detail';
    scene: string;
    technical_flaws: string[];
    key_entities: string[];
  }[];

  subject_consistency_constraints: {
    must_preserve_entities: string[];
    must_preserve_scene_type: string;
    notes?: string;
  };

  emotion_primary: string;
  emotion_intensity: string;
  intent_tag: string;
  user_mood_respected: boolean;

  tone_profile: {
    persona_ratio: {
      literary: number;
      psychological: number;
      observer: number;
    };
    tone_keywords: string[];
    amplification_strategy: string;
    platform_adaptation_notes: string;
  };

  platform: UserRequest['platform'];
  share_trigger: string;

  copy_brief: {
    narrative_angle: string;
    must_mention: string[];
    avoid_tone: string[];
  };

  user_raw_text: string;
  user_mood: UserRequest['mood_user'];
  user_intent: UserRequest['intent_user'];
}

// ==========================================
// Legacy Types (Preserved for Frontend)
// ==========================================

export interface KeyEntity {
  type: 'person' | 'pet' | 'object' | 'place';
  role: string;
  importance: 'main' | 'secondary';
}

export interface ImageMeta {
  index: number;
  rough_description: string;
  role: 'primary' | 'secondary' | 'detail';
  scene: string;
  technical_flaws: string[];
  key_entities: string[];
}

export interface ContentUnderstandingOutput {
  story_core: string;
  scene: string;
  theme: string;
  time_of_day: string;
  key_entities: KeyEntity[];
  images_meta: ImageMeta[];
  summary: string;
  subject_consistency_constraints: {
    must_preserve_entities: string[];
    must_preserve_scene_type: string;
    notes: string;
  };
}

export interface EmotionDetectionOutput {
  emotion_primary: string;
  emotion_intensity: string;
  intent_tag: string;
  user_mood_respected: boolean;
  notes: string;
}

export interface ToneProfileOutput {
  persona_ratio: {
    literary: number;
    psychological: number;
    observer: number;
  };
  tone_keywords: string[];
  amplification_strategy: string;
  platform_adaptation_notes: string;
}

// ==========================================
// L2/L3 Generation & Quality Types
// ==========================================

export interface GeneratedCopy {
  title: string;
  main_text: string;
  hash_tags: string[];
}

export interface VisualCreativeBrief {
  story_logline: string;
  emotion_goal: string;
  composition_intent: {
    primary_subject: string;
    desired_focus: string;
    framing: string;
  };
  light_and_atmosphere: {
    time_feeling: string;
    light_style: string;
    contrast_and_saturation: string;
  };
  color_palette_hint: string;
  allowed_creative_freedom: string[];
  hard_constraints: string[];
}

export interface VisualPlan {
  color_mood: string;
  atmosphere: string;
  must_preserve_entities: string[];
  must_preserve_scene_type: string;
  creative_brief?: VisualCreativeBrief;
}

export interface LayoutPlan {
  layout_type: 'single_card' | 'collage_3' | 'long_xhs';
  image_generation_request: any;
}

export interface QualityAnalysis {
  emotion_consistency_pass: boolean;
  tone_safety_pass: boolean;
  combined_issues: string[];
  revision_suggestion?: string;
  iteration_count: number;
  final_verdict: string;
}

export interface ImageQualityAnalysis {
  pass: boolean;
  scores: {
    shareability: number;
    aesthetic: number;
    subject_clarity: number;
    realism: number;
    artifact_risk: number;
  };
  verdict: 'OK' | 'TOO_WEAK_CHANGE' | 'COLOR_CAST' | 'ARTIFACTS' | 'NEEDS_RECOMPOSE';
  reasons: string[];
  revision_actions: ImageRevisionAction[];
  issues: string[];
  actions?: any[];
}

export interface Variant {
  id: string;
  style_name: string;
  usage_hint: string;
  creative_rationale: string;
  tone_direction: string;
  visual_direction: string;

  copy: GeneratedCopy;
  visual_plan: VisualPlan;
  layout_plan: LayoutPlan;

  enhanced_images_base64?: string[];
  quality_analysis?: QualityAnalysis;
  image_quality_analysis?: ImageQualityAnalysis;
}
