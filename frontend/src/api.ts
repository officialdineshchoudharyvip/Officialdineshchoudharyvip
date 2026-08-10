const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Template = { id: string; url: string; title: string };
export type Creation = {
  id: string;
  type: "edited" | "ai";
  image_base64: string;
  prompt?: string | null;
  created_at: string;
};

async function handle(res: Response) {
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  async getTemplates(): Promise<Template[]> {
    return handle(await fetch(`${BASE}/templates`));
  },

  async generate(prompt: string, style: string): Promise<{ image_base64: string }> {
    return handle(
      await fetch(`${BASE}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      }),
    );
  },

  async edit(image_base64: string, prompt: string): Promise<{ image_base64: string }> {
    return handle(
      await fetch(`${BASE}/ai/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64, prompt }),
      }),
    );
  },

  async saveCreation(
    type: "edited" | "ai",
    image_base64: string,
    prompt?: string | null,
  ): Promise<Creation> {
    return handle(
      await fetch(`${BASE}/creations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, image_base64, prompt: prompt ?? null }),
      }),
    );
  },

  async listCreations(type?: "edited" | "ai"): Promise<Creation[]> {
    const q = type ? `?type=${type}` : "";
    return handle(await fetch(`${BASE}/creations${q}`));
  },

  async deleteCreation(id: string): Promise<{ success: boolean }> {
    return handle(await fetch(`${BASE}/creations/${id}`, { method: "DELETE" }));
  },
};
