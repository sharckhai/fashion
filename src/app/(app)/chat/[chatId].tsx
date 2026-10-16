import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowUp, Heart, MessageCircle, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GeneratingOverlay } from "@/components/generating-overlay";
import { cn, Icon, IconButton, Image, Text } from "@/components/ui";
import { useChat, useSendFeedback, useToggleFavorite } from "@/lib/queries";

export default function Chat() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { data } = useChat(chatId);
  const sendFeedback = useSendFeedback(chatId);
  const toggleFavorite = useToggleFavorite();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const turns = data.turns;
  const current = turns.find((t) => t.id === selectedId) ?? turns[turns.length - 1];

  async function send() {
    const text = feedback.trim();
    setFeedback("");
    setComposing(false);
    await sendFeedback.mutateAsync({ baseImageId: current.image.id, feedback: text });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedId(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="mx-auto w-full max-w-screen-sm flex-row items-center justify-between px-5 pb-3">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Zurück"
            onPress={() => router.dismissTo("/")}
          />
          <Text className="font-bold text-lg">Dein Look</Text>
          <IconButton
            icon={Heart}
            accessibilityLabel="Favorit"
            filled={current.image.isFavorite}
            iconClassName={current.image.isFavorite ? "text-destructive" : undefined}
            onPress={() =>
              toggleFavorite.mutate({
                imageId: current.image.id,
                isFavorite: !current.image.isFavorite,
              })
            }
          />
        </View>

        <ScrollView contentContainerClassName="mx-auto w-full max-w-screen-sm gap-4 px-5 pb-32">
          <View className="aspect-[2/3] w-full overflow-hidden rounded-[32px] bg-muted">
            <Image
              source={{ uri: current.image.url, cacheKey: current.image.id }}
              className="h-full w-full"
              contentFit="cover"
              transition={250}
            />
            {sendFeedback.isPending && <GeneratingOverlay className="absolute inset-0" />}
          </View>

          {current.feedback && (
            <View className="self-start rounded-3xl rounded-tl-md bg-lavender px-4 py-3">
              <Text className="text-ink">„{current.feedback}“</Text>
            </View>
          )}
          {sendFeedback.error && (
            <Text className="text-destructive">{sendFeedback.error.message}</Text>
          )}

          {turns.length > 1 && (
            <FlatList
              horizontal
              data={turns}
              keyExtractor={(t) => t.id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  accessibilityLabel={`Version ${index + 1}`}
                  className={cn(
                    "rounded-2xl border-2 p-0.5",
                    item.id === current.id ? "border-foreground" : "border-transparent",
                  )}
                >
                  <Image
                    source={{ uri: item.image.url, cacheKey: item.image.id }}
                    className="h-20 w-14 rounded-xl bg-muted"
                    contentFit="cover"
                  />
                </Pressable>
              )}
            />
          )}
        </ScrollView>

        {composing ? (
          <View className="mx-auto w-full max-w-screen-sm flex-row items-end gap-2 px-5 pb-3">
            <IconButton
              icon={X}
              accessibilityLabel="Abbrechen"
              onPress={() => setComposing(false)}
            />
            <TextInput
              autoFocus
              multiline
              value={feedback}
              onChangeText={setFeedback}
              placeholder="z. B. Farbe in kariertes Orange-Rot ändern"
              className="max-h-32 min-h-11 flex-1 rounded-3xl bg-card px-5 py-3 font-sans text-base text-foreground placeholder:text-muted-foreground"
            />
            <IconButton
              icon={ArrowUp}
              accessibilityLabel="Senden"
              disabled={!feedback.trim()}
              className={cn("bg-foreground", !feedback.trim() && "opacity-40")}
              iconClassName="text-background"
              onPress={send}
            />
          </View>
        ) : (
          <Pressable
            disabled={sendFeedback.isPending}
            onPress={() => {
              Haptics.selectionAsync();
              setComposing(true);
            }}
            className={cn(
              "absolute bottom-8 right-5 h-14 flex-row items-center gap-2 rounded-full bg-foreground px-6 active:opacity-80",
              sendFeedback.isPending && "opacity-40",
            )}
          >
            <Icon as={MessageCircle} size={20} className="text-background" />
            <Text className="font-bold text-background">Feedback</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
