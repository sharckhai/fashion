import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const OPENAI_IMAGE_MODEL = "gpt-image-2";

const TRYON_PROMPT = `Image 1 is a photo of a person. All following images are clothing items.
Generate a photorealistic photo of exactly this person wearing all of the clothing items.
Keep the person's face, identity, skin tone, hair, body shape, pose and background exactly the same.
Reproduce every garment faithfully: same color, pattern, fabric, cut, logos and details.
Fit each garment naturally to the person's body shape with realistic folds and lighting.
Do not add or remove any other clothing or accessories.`;

const feedbackPrompt = (feedback: string) =>
  `This is a photo of a person wearing an outfit.
Edit this image according to this feedback: "${feedback}".
Change only what the feedback asks for. Keep the person's face, identity, body shape, pose, background and everything else exactly the same.`;

type Body = { chatId: string; inputImageIds: string[]; feedback?: string };

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { supabase } = ctx;
    const userId = ctx.userClaims!.id;
    const { chatId, inputImageIds, feedback }: Body = await req.json();

    const { data: generation } = await supabase
      .from("generations")
      .insert({ chat_id: chatId, input_image_ids: inputImageIds, feedback: feedback ?? null })
      .select()
      .single()
      .throwOnError();

    const { data: images } = await supabase
      .from("images")
      .select("id, kind, storage_path")
      .in("id", inputImageIds)
      .throwOnError();
    const ordered = inputImageIds.map((id) => images.find((img) => img.id === id)!);

    const form = new FormData();
    form.append("model", OPENAI_IMAGE_MODEL);
    form.append("prompt", feedback ? feedbackPrompt(feedback) : TRYON_PROMPT);
    form.append("size", "1024x1536");
    form.append("quality", "medium");
    // JPEG statt PNG: ~5-10x kleiner, lädt in der App deutlich schneller
    form.append("output_format", "jpeg");
    form.append("output_compression", "85");
    for (const img of ordered) {
      const bucket = img.kind === "generated" ? "generations" : "uploads";
      const { data: file, error } = await supabase.storage.from(bucket).download(img.storage_path);
      if (error) throw error;
      form.append("image[]", file, img.storage_path.split("/").pop());
    }

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
      body: form,
    });
    if (!res.ok) {
      await supabase.from("generations").update({ status: "failed" }).eq("id", generation.id);
      throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    }
    const { data } = await res.json();
    const jpeg = Uint8Array.from(atob(data[0].b64_json), (c) => c.charCodeAt(0));

    const path = `${userId}/${chatId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("generations")
      .upload(path, jpeg, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const { data: output } = await supabase
      .from("images")
      .insert({ chat_id: chatId, kind: "generated", storage_path: path })
      .select()
      .single()
      .throwOnError();

    await supabase
      .from("generations")
      .update({ status: "done", output_image_id: output.id })
      .eq("id", generation.id)
      .throwOnError();

    return Response.json({ generationId: generation.id, imageId: output.id });
  }),
};
