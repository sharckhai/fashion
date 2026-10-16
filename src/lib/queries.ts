import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";

import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/upload";

export type GalleryImage = {
  id: string;
  chatId: string;
  url: string;
  isFavorite: boolean;
  rating: number | null;
  review: string | null;
};
export type Turn = {
  id: string;
  feedback: string | null;
  image: {
    id: string;
    url: string;
    isFavorite: boolean;
    rating: number | null;
    review: string | null;
  };
};

// Signed URLs pro Pfad wiederverwenden, solange sie noch >10 min gültig sind.
// Stabile URLs = Bild-Cache greift (Browser + expo-image), keine erneuten Downloads.
const URL_TTL = 60 * 60 * 1000;
const urlCache = new Map<string, { url: string; expires: number }>();

async function signedUrls(bucket: string, paths: string[]) {
  const key = (path: string) => `${bucket}/${path}`;
  const minValid = Date.now() + 10 * 60 * 1000;
  const missing = paths.filter((p) => (urlCache.get(key(p))?.expires ?? 0) < minValid);
  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(missing, URL_TTL / 1000);
    if (error) throw error;
    const expires = Date.now() + URL_TTL;
    for (const [i, d] of data.entries()) {
      urlCache.set(key(missing[i]), { url: d.signedUrl!, expires });
    }
  }
  return paths.map((p) => urlCache.get(key(p))!.url);
}

async function invokeTryOn(chatId: string, inputImageIds: string[], feedback?: string) {
  const { error } = await supabase.functions.invoke("tryon", {
    body: { chatId, inputImageIds, feedback },
  });
  if (error) throw error;
}

// Eine Query für alle Looks; der Favoriten-Filter passiert im Screen,
// damit ein gesetztes Herz sofort in beiden Tabs sichtbar ist
export function useGallery() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: async (): Promise<GalleryImage[]> => {
      const { data } = await supabase
        .from("images")
        .select("id, chat_id, storage_path, is_favorite, rating, review")
        .eq("kind", "generated")
        .order("created_at", { ascending: false })
        .throwOnError();
      const urls = await signedUrls(
        "generations",
        data.map((img) => img.storage_path),
      );
      return data.map((img, i) => ({
        id: img.id,
        chatId: img.chat_id,
        url: urls[i],
        isFavorite: img.is_favorite,
        rating: img.rating,
        review: img.review,
      }));
    },
  });
}

export function useChat(chatId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["chat", chatId],
    // Sofort-Anzeige aus dem Galerie-Cache (gleiche URLs/cacheKeys -> Bild ist schon lokal),
    // die echten Turns inkl. Change-Style-Texten kommen im Hintergrund nach
    placeholderData: () => {
      const images = queryClient
        .getQueryData<GalleryImage[]>(["gallery"])
        ?.filter((img) => img.chatId === chatId)
        .reverse();
      if (!images?.length) return undefined;
      return {
        turns: images.map(({ chatId: _, ...image }) => ({ id: image.id, feedback: null, image })),
      };
    },
    queryFn: async () => {
      const { data: generations } = await supabase
        .from("generations")
        .select("id, feedback, output:images(id, storage_path, is_favorite, rating, review)")
        .eq("chat_id", chatId)
        .eq("status", "done")
        .order("created_at")
        .throwOnError();
      const outputs = generations.map((g) => g.output!);
      const urls = await signedUrls(
        "generations",
        outputs.map((o) => o.storage_path),
      );
      const turns: Turn[] = generations.map((g, i) => ({
        id: g.id,
        feedback: g.feedback,
        image: {
          id: outputs[i].id,
          url: urls[i],
          isFavorite: outputs[i].is_favorite,
          rating: outputs[i].rating,
          review: outputs[i].review,
        },
      }));
      return { turns };
    },
  });
}

export function useCreateTryOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ person, garments }: { person: string; garments: string[] }) => {
      const userId = useAuth.getState().session!.user.id;
      const { data: chat } = await supabase
        .from("chats")
        .insert({})
        .select()
        .single()
        .throwOnError();

      const files = [
        { uri: person, kind: "person" },
        ...garments.map((uri) => ({ uri, kind: "garment" })),
      ].map((f) => ({ ...f, path: `${userId}/${chat.id}/${randomUUID()}.jpg` }));
      await Promise.all(files.map((f) => uploadImage(f.uri, f.path)));

      const { data: images } = await supabase
        .from("images")
        .insert(files.map((f) => ({ chat_id: chat.id, kind: f.kind, storage_path: f.path })))
        .select("id")
        .throwOnError();

      await invokeTryOn(
        chat.id,
        images.map((img) => img.id),
      );
      return chat.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery"] }),
  });
}

// Change Style: ausgewähltes Bild + Text an GPT, erzeugt eine neue Version
export function useChangeStyle(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ baseImageId, feedback }: { baseImageId: string; feedback: string }) => {
      // nur das ausgewählte Bild bearbeiten, ohne Original-Kleidung
      await invokeTryOn(chatId, [baseImageId], feedback);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat", chatId] }),
        queryClient.invalidateQueries({ queryKey: ["gallery"] }),
      ]),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, isFavorite }: { imageId: string; isFavorite: boolean }) => {
      await supabase
        .from("images")
        .update({ is_favorite: isFavorite })
        .eq("id", imageId)
        .throwOnError();
    },
    onMutate: ({ imageId, isFavorite }) => {
      queryClient.setQueriesData<GalleryImage[]>({ queryKey: ["gallery"] }, (old) =>
        old?.map((img) => (img.id === imageId ? { ...img, isFavorite } : img)),
      );
      queryClient.setQueriesData<{ turns: Turn[] }>(
        { queryKey: ["chat"] },
        (old) =>
          old && {
            ...old,
            turns: old.turns.map((t) =>
              t.image.id === imageId ? { ...t, image: { ...t.image, isFavorite } } : t,
            ),
          },
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gallery"] }),
        queryClient.invalidateQueries({ queryKey: ["chat"] }),
      ]),
  });
}

// Bewertung (1–5) und Feedback des Nutzers pro Bild; wird nur gespeichert, nicht an GPT geschickt
export function useReviewImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      imageId,
      ...review
    }: {
      imageId: string;
      rating?: number;
      review?: string;
    }) => {
      await supabase
        .from("images")
        .update({ ...review, reviewed_at: new Date().toISOString() })
        .eq("id", imageId)
        .throwOnError();
    },
    onMutate: ({ imageId, ...review }) => {
      queryClient.setQueriesData<{ turns: Turn[] }>(
        { queryKey: ["chat"] },
        (old) =>
          old && {
            ...old,
            turns: old.turns.map((t) =>
              t.image.id === imageId ? { ...t, image: { ...t.image, ...review } } : t,
            ),
          },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });
}
