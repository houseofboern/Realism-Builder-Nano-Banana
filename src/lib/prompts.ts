export type Framing = 'close-up' | 'mid-shot' | 'full-body' | 'auto';

export function detectFraming(prompt: string): Framing {
  const lower = prompt.toLowerCase();
  if (/\b(close.?up|headshot|face\s?shot|portrait|from the neck up|head and shoulders)\b/.test(lower)) return 'close-up';
  if (/\b(full.?body|head.?to.?toe|standing|walking|full.?length)\b/.test(lower)) return 'full-body';
  if (/\b(mid.?shot|waist.?up|upper.?body|torso|half.?body)\b/.test(lower)) return 'mid-shot';
  return 'auto';
}

function bodyConstraints(framing: Framing): string {
  if (framing === 'close-up') return '- ABSOLUTELY NO TATTOOS on ANY visible skin (face, neck, ears). If tattoos exist in references, REMOVE THEM COMPLETELY.';
  return `- ABSOLUTELY NO TATTOOS: The subject MUST have 100% clear, unmarked skin. If EITHER source image contains tattoos, you MUST digitally erase ALL of them. ZERO ink allowed.
- FLAT CHEST: STRICTLY enforce an anatomically flat-chest baseline. DO NOT add or imply any chest volume. This is NON-NEGOTIABLE.`;
}

export function buildImg2ImgPrompt(opts: {
  clothingSource: 'target' | 'source';
  customPrompt: string;
  imageSize: string;
  hasBackground?: boolean;
  sourceImageCount?: number;
}) {
  const { clothingSource, customPrompt, imageSize } = opts;
  const srcCount = opts.sourceImageCount ?? 1;
  const framing = detectFraming(customPrompt);

  const srcLabel = srcCount === 1 ? '"SOURCE_IDENTITY_REFERENCE"' : `"SOURCE_IDENTITY_REFERENCE_1" through "SOURCE_IDENTITY_REFERENCE_${srcCount}"`;
  const srcClothingLabel = srcCount === 1 ? '"SOURCE_IDENTITY_REFERENCE"' : 'the "SOURCE_IDENTITY_REFERENCE" images';

  const clothingLine = framing === 'close-up'
    ? ''
    : `5. CLOTHING SPECIFICATION: ${
        clothingSource === 'target'
          ? 'The subject MUST wear the exact clothing, outfit, and accessories seen in the "TARGET_SCENE_CONTEXT".'
          : `The subject MUST wear the clothing and outfit seen in ${srcClothingLabel}.`
      }`;

  return `TASK: High-Fidelity Photorealistic Persona Transplantation.

PRIMARY GOAL: Replace the person in "TARGET_SCENE_CONTEXT" with the identity from ${srcLabel}${opts.hasBackground ? ', and reconstruct the scene so it takes place in the environment/setting shown in "BACKGROUND_IMAGE" — adapted to fit the target\'s pose, camera angle, and foreground context' : ''}.
${srcCount > 1 ? `\nMULTIPLE SOURCE REFERENCES: ${srcCount} images of the SAME person have been provided (${srcLabel}). These show the subject from different angles and/or lighting conditions. You MUST cross-reference ALL of them to build an accurate, comprehensive understanding of the subject's facial geometry, bone structure, skin texture, and features. More references = higher fidelity. Do NOT rely on just one — synthesize them all.` : ''}

CRITICAL QUALITY STANDARDS — YOU MUST FOLLOW ALL OF THESE. FAILURE ON ANY ONE IS A FAILED OUTPUT:
1. EXPRESSION MATCHING: You MUST synchronize the facial expression EXACTLY. The final subject MUST replicate the precise smile, eye-squint, brow-tension, and mouth position of the original person in "TARGET_SCENE_CONTEXT". DO NOT use a neutral or static expression from the reference. DO NOT default to a generic smile. MATCH THE EXACT EXPRESSION.
2. SKIN TONE FIDELITY: You MUST STRICTLY preserve the skin color and complexion of the "SOURCE_IDENTITY_REFERENCE". DO NOT lighten, darken, or shift the skin tone. The output subject MUST have the IDENTICAL skin tone as the source identity. NO EXCEPTIONS.
3. NEURAL BLENDING: Seamless integration is MANDATORY. Match skin pores, subsurface scattering (light through skin), and global illumination of the scene PERFECTLY. ABSOLUTELY NO sharp "cut-and-paste" edges. ABSOLUTELY NO "Microsoft Paint" artifacts. If the blending looks artificial, the output is FAILED.
4. PHOTOREALISM: The result MUST look like a raw, unedited photograph taken by a real camera. Maintain natural shadows and reflections from the target scene. DO NOT make it look AI-generated, smoothed, or synthetic.
${clothingLine}
${opts.hasBackground ? `6. BACKGROUND REPLACEMENT — CONTEXTUAL COMPOSITING:
   A "BACKGROUND_IMAGE" has been provided. Your job is NOT to naively paste the subject onto this background. You MUST:
   a) ANALYZE the "TARGET_SCENE_CONTEXT" first — understand the subject's pose, body position, interaction with objects (furniture, surfaces, props), camera angle, perspective, and depth of field.
   b) EXTRACT the environment, aesthetic, and setting from "BACKGROUND_IMAGE" — the location type, colors, textures, atmosphere, and ambient lighting. IGNORE any people in it.
   c) RECONSTRUCT the scene: Place the subject (with their pose and object interactions from the target) into a new environment that matches the VIBE and SETTING of the "BACKGROUND_IMAGE", but is adapted to be physically plausible given the subject's pose and camera angle. If the subject is sitting at a table, there must still be a table — but the surrounding environment changes.
   d) RE-LIGHT the subject to match the new environment's lighting conditions (color temperature, direction, intensity, ambient vs directional light ratio).
   e) The result must look like the photo was ORIGINALLY TAKEN in the background's environment — not composited after the fact.` : ''}

MANDATORY CONSTRAINTS — NON-NEGOTIABLE:
${bodyConstraints(framing)}

REFERENCE SCOPE — READ THIS CAREFULLY:
ONLY use the FACE and IDENTITY from ${srcLabel}. You MUST IGNORE the body, clothing, pose, and background of ${srcCount === 1 ? 'that image' : 'those images'}. DO NOT carry over ANY element from the source ${srcCount === 1 ? 'image' : 'images'} except the face and identity. This is CRITICAL.

INSTRUCTIONS: ${customPrompt}

EXECUTION: Analyze the labels. ${srcCount > 1 ? `Cross-reference ALL ${srcCount} source identity images to` : 'Use the source identity to'} transplant the subject into the "TARGET_SCENE". Match expressions PERFECTLY. Render at ${imageSize} resolution. The output MUST be a clean photograph with NO overlays, NO labels, NO banners, NO watermarks.`;
}

export const PROMPT_ENGINEER_SYSTEM = `You are a strict, precise prompt engineer for Gemini's image generation model. You craft detailed, unambiguous generation prompts. You are NOT chatty. You are NOT wishy-washy. You give clear, decisive direction.

LABELED IMAGES — HOW TO READ THEM:
Images have green banners at the bottom with white text labels:
- "Face 1", "Face 2" etc. = the subject's face from different angles (identity reference)
- "Edit Target" = the base image to modify
- "Inspiration 1", "Inspiration 2" etc. = expression, pose, or vibe references
- "Background Image" = the scene/setting/location to place the subject in

NOT all will always be present. ONLY reference what is actually provided. If there is NO Edit Target, you are creating from scratch using the face references and any inspiration images.

THE GREEN LABEL BANNERS ARE METADATA ONLY. THE GENERATED OUTPUT IMAGE MUST NEVER — UNDER ANY CIRCUMSTANCES — CONTAIN GREEN BANNERS, OVERLAYS, LABELS, TEXT WATERMARKS, OR ANY UI ELEMENTS. THE OUTPUT MUST BE A CLEAN, UNALTERED PHOTOGRAPH. THIS IS NON-NEGOTIABLE.

REFERENCE SCOPE — WHAT TO KEEP vs WHAT TO IGNORE:
This section is CRITICAL. You MUST include explicit "use X from Y" and "IGNORE Z from Y" instructions in EVERY prompt block. DO NOT leave this ambiguous. The generation model needs CLEAR direction on what to take from each reference.
- Face references: Use ONLY for facial identity (bone structure, features, skin tone). IGNORE clothing, body shape, pose, and background from these images. STATE THIS EXPLICITLY in your prompt.
- Edit Target: The primary image to modify. Keep its composition, lighting, and scene UNLESS the user says otherwise. STATE THIS EXPLICITLY.
- Inspiration: Use ONLY for the ONE specific quality the user references (e.g. pose, expression, vibe, angle). You MUST explicitly tell the generation model to IGNORE the background, setting, location, clothing, hair, skin tone, body shape, and ALL other elements from inspiration images. The background/setting of an inspiration image is NEVER relevant and MUST NEVER appear in the output. SPELL THIS OUT in the prompt block every time.
- Background Image: Use ONLY for the scene/setting/location. IGNORE any people in it. STATE THIS EXPLICITLY.
DO NOT assume the generation model will figure this out. SPELL IT OUT EVERY TIME.

FRAMING-AWARE CONSTRAINTS — FOLLOW THESE EXACTLY:
Body-related constraints MUST ONLY appear when the body is actually in frame. Match constraints to framing STRICTLY:
- Close-up / headshot / portrait: DO NOT mention chest, clothing, or body shape. ONLY mention "no tattoos on visible skin" if neck/shoulders are visible. DO NOT reference ANY body attribute — this WILL confuse the model into pulling the frame wider.
- Mid-shot (waist up): Include no tattoos, flat chest, and clothing details.
- Full-body: Include ALL constraints.
IF THE USER ASKS FOR A CLOSE-UP, YOUR PROMPT MUST FOCUS ENTIRELY ON FACE, EXPRESSION, LIGHTING, AND SKIN. ABSOLUTELY NO BODY ATTRIBUTES. VIOLATING THIS RULE RUINS THE OUTPUT.

REALISM — CAMERA ANGLE VARIATION:
Real photos are NOT perfectly framed. When the user wants realistic/candid shots, you MUST vary the camera perspective. USE these techniques:
- Slight camera tilt (1-5 degrees, NOT perfectly level)
- Shot from slightly above, below, or at an angle — NOT dead-on eye level
- Subject slightly off-center, NOT perfectly composed
- Natural perspective distortion from phone cameras at varying distances
- Subject sometimes looking slightly away from camera, or caught mid-turn
DO NOT force this on every prompt — ONLY when the user wants a natural/candid/realistic feel. If they want a clean studio shot, keep it clean.

RULES — YOU MUST FOLLOW ALL OF THESE WITHOUT EXCEPTION:
1. Keep responses SHORT. 1-2 sentences MAX for acknowledgements. DO NOT ramble. DO NOT over-explain.
2. Acknowledge briefly, then ask ONE clarifying question if needed. Example: "Got it, candid sushi restaurant vibe. Indoor or outdoor seating?"
3. When you have enough info, OUTPUT THE PROMPT IMMEDIATELY in a prompt block:

\`\`\`prompt
[the actual generation prompt here]
\`\`\`

4. Prompt blocks MUST be detailed and technical (lens, lighting, skin texture, camera angle, framing). Conversational text stays brief. DO NOT pad your prompt with filler words.
5. DO NOT add film grain, ISO noise, or vintage effects UNLESS the user SPECIFICALLY asks for it. NEVER add these by default.
6. If the user gives feedback, acknowledge in ONE sentence and output an UPDATED prompt block IMMEDIATELY. DO NOT ask unnecessary follow-up questions when the feedback is clear.
7. Reference labeled images by their EXACT label names in prompt blocks.
8. DO NOT lecture. DO NOT over-explain. Be DIRECT and DECISIVE.
9. Default constraints (no tattoos, flat chest) apply ONLY when the relevant body part is in frame. See FRAMING-AWARE CONSTRAINTS above.
10. EVERY prompt block MUST include explicit "IGNORE X from Y" instructions for each reference image. For Inspiration images specifically, ALWAYS include: "IGNORE the background, setting, location, clothing, and all non-referenced qualities from the Inspiration image(s)." DO NOT SKIP THIS.
11. The output image MUST be a clean photograph. NO overlays. NO labels. NO banners. NO text. NO UI elements. EVER.`;
