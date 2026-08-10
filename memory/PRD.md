# InstaBloom — Product Requirements Document

## Original Problem Statement
Build a mobile app: a Flower Instagram photo maker to create floral posts for social media and help grow Instagram followers. (User is Hindi/English speaking.)

## User Choices (gathered)
- Main function: BOTH AI flower generation AND add flower frames/stickers/decorations
- Photo source: BOTH camera and gallery
- Editing: background remove/replace (AI), filters & text captions, flower stickers, frames & borders
- Save/share: save to device gallery AND share to social media
- Design: soft floral + bold colorful (agent decided details)

## Architecture
- Frontend: Expo (React Native) + expo-router, custom fonts (Figtree/Nunito), Phosphor icons, reanimated + gesture-handler for draggable stickers/text, react-native-view-shot for canvas capture.
- Backend: FastAPI + MongoDB (motor). Creations stored as base64.
- AI: Gemini Nano Banana (gemini-3.1-flash-image-preview) via emergentintegrations + EMERGENT_LLM_KEY for text-to-image generation and image-to-image editing.

## User Persona
Casual social-media creators / small creators who want beautiful flower-themed posts quickly without design skills, to grow their Instagram following.

## Core Requirements (static)
- AI generate floral images from a text prompt with style presets.
- Photo editor: pick from camera/gallery, add flower stickers, frames, filters, draggable text captions, AI background transform.
- Save to device + share to social apps.
- Personal gallery of AI + edited creations.

## Implemented (2026-06-10)
- Bottom tabs: Home, AI Bloom, Gallery. Editor as full-screen route.
- Home: brand header, AI Bloom / Photo Edit action cards, trending templates grid (tap → editor).
- AI Bloom: prompt input, inspiration chips, 5 style presets, Generate → image + auto-save to gallery, Save-to-device, Edit-in-Studio.
- Editor: camera/gallery pick (permission flow), square canvas, filters (5), frames (5), 8 flower stickers (drag/pinch/rotate), text captions with color swatches + quick caption presets, AI photo transform, Save (device + gallery) and Share.
- Gallery: segmented AI/Edited, grid, preview modal with Save/Share/Edit/Delete.
- Backend: /api/templates, /api/ai/generate, /api/ai/edit, /api/creations CRUD. 13/13 backend tests pass; frontend flows verified.

## Backlog / Remaining
- P1: Text caption editing after placement; layer reordering; undo/redo.
- P1: More frame designs (polaroid, floral corner PNG overlays).
- P2: Hashtag suggestion helper for follower growth; posting schedule tips.
- P2: Onboarding + light/dark theme toggle.

## Next Tasks
- Add hashtag/caption growth helper.
- Add sticker recolor + more sticker packs.
