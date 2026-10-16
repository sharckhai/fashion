import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";

import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/upload";

export type GalleryImage = { id: string; chatId: string; url: string; isFavorite: boolean };
export type Turn = {
  id: string;
  feedback: string | null;
  image: { id: string; url: string; isFavorite: boolean };
};

async function signedUrls(bucket: string, paths: string[]) {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return data.map((d) => d.signedUrl!);
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
        .select("id, chat_id, storage_path, is_favorite")
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
      }));
    },
  });
}

export function useChat(chatId: string) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data: generations } = await supabase
        .from("generations")
        .select("id, feedback, output:images(id, storage_path, is_favorite)")
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
        image: { id: outputs[i].id, url: urls[i], isFavorite: outputs[i].is_favorite },
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

export function useSendFeedback(chatId: string) {
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
