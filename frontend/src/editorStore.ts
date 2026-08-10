// Lightweight hand-off store to seed the editor with a starting image
// without passing large base64 strings through router params.
type Seed = { uri?: string; base64?: string } | null;

let seed: Seed = null;

export function setEditorSeed(next: Seed) {
  seed = next;
}

export function takeEditorSeed(): Seed {
  const s = seed;
  seed = null;
  return s;
}
