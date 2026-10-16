import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  return result.canceled ? null : result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  await ImagePicker.requestCameraPermissionsAsync();
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  return result.canceled ? null : result.assets[0].uri;
}

// Verkleinert auf max. 1536 px und lädt als JPEG in den uploads-Bucket
export async function uploadImage(uri: string, path: string) {
  const image = await ImageManipulator.manipulate(uri, {
    maxWidth: 1536,
    maxHeight: 1536,
  }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  const bytes = Uint8Array.from(atob(saved.base64!), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (error) throw error;
}
