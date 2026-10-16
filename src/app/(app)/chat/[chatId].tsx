import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowUp, Heart, MessageCircle, Sparkles, Star, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { GeneratingOverlay } from "@/components/generating-overlay";
import { PopBubble } from "@/components/pop-bubble";
import { cn, Icon, IconButton, Image, PillButton, Text } from "@/components/ui";
import { useChangeStyle, useChat, useReviewImage, useToggleFavorite } from "@/lib/queries";

const RATINGS = [1, 2, 3, 4, 5];

const PLACEHOLDERS = {
  style: "z. B. Farbe in kariertes Orange-Rot ändern",
  review: "Was gefällt dir, was nicht?",
};

export default function Chat() {
  const { chatId, imageId } = useLocalSearchParams<{ chatId: string; imageId?: string }>();
  const { data } = useChat(chatId);
  const changeStyle = useChangeStyle(chatId);
  const reviewImage = useReviewImage();
  const toggleFavorite = useToggleFavorite();
  // ausgewählte Version per Bild-ID; Start mit dem Bild, das auf Home/Galerie angetippt wurde
  const [selectedImageId, setSelectedImageId] = useState<string | null>(imageId ?? null);
  const [composing, setComposing] = useState<"style" | "review" | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [text, setText] = useState("");
  // ein gemeinsamer Fortschritt für alle Bewertungs-Bubbles (UI-Thread)
  const ratingProgress = useSharedValue(0);

  useEffect(() => {
    ratingProgress.value = withTiming(ratingOpen ? 1 : 0, {
      duration: ratingOpen ? 320 : 140,
      easing: Easing.linear,
    });
  }, [ratingOpen, ratingProgress]);

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const turns = data.turns;
  const current = turns.find((t) => t.image.id === selectedImageId) ?? turns[turns.length - 1];

  // Tipp neben ein offenes Overlay (Bewertung, Eingabe) schließt es
  function closeOverlays() {
    Keyboard.dismiss();
    setRatingOpen(false);
    setComposing(null);
  }

  function compose(mode: "style" | "review") {
    setRatingOpen(false);
    setText(mode === "review" ? (current.image.review ?? "") : "");
    setComposing(mode);
  }

  function rate(rating: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reviewImage.mutate({ imageId: current.image.id, rating });
    setRatingOpen(false);
  }

  function send() {
    const value = text.trim();
    setText("");
    setComposing(null);
    if (composing === "review") {
      reviewImage.mutate({ imageId: current.image.id, review: value });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    changeStyle.mutate(
      { baseImageId: current.image.id, feedback: value },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedImageId(null);
        },
      },
    );
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

        <ScrollView contentContainerClassName="mx-auto w-full max-w-screen-sm gap-4 px-5 pb-6">
          <View className="aspect-[2/3] w-full overflow-hidden rounded-[32px] bg-muted">
            <Image
              source={{ uri: current.image.url, cacheKey: current.image.id }}
              cachePolicy="memory-disk"
              className="h-full w-full"
              contentFit="cover"
              transition={250}
            />
            {changeStyle.isPending && <GeneratingOverlay className="absolute inset-0" />}
          </View>

          {current.feedback && (
            <View className="self-start rounded-3xl rounded-tl-md bg-lavender px-4 py-3">
              <Text className="text-ink">„{current.feedback}“</Text>
            </View>
          )}
          {current.image.review && (
            <Pressable
              onPress={() => compose("review")}
              className="gap-1 rounded-3xl bg-card px-4 py-3 active:opacity-70"
            >
              <Text className="font-bold text-sm text-muted-foreground">Dein Feedback</Text>
              <Text>{current.image.review}</Text>
            </Pressable>
          )}
          {changeStyle.error && (
            <Text className="text-destructive">{changeStyle.error.message}</Text>
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
                  onPress={() => {
                    setSelectedImageId(item.image.id);
                    setRatingOpen(false);
                  }}
                  accessibilityLabel={`Version ${index + 1}`}
                  className={cn(
                    "rounded-2xl border-2 p-0.5",
                    item.id === current.id ? "border-foreground" : "border-transparent",
                  )}
                >
                  <Image
                    source={{ uri: item.image.url, cacheKey: item.image.id }}
                    cachePolicy="memory-disk"
                    className="h-20 w-14 rounded-xl bg-muted"
                    contentFit="cover"
                  />
                </Pressable>
              )}
            />
          )}
        </ScrollView>

        {(ratingOpen || composing) && (
          <Pressable
            accessibilityLabel="Schließen"
            className="absolute inset-0"
            onPress={closeOverlays}
          />
        )}

        {composing ? (
          <View className="mx-auto w-full max-w-screen-sm flex-row items-end gap-2 px-5 pb-3">
            <IconButton
              icon={X}
              accessibilityLabel="Abbrechen"
              onPress={() => setComposing(null)}
            />
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder={PLACEHOLDERS[composing]}
              className="max-h-32 min-h-11 flex-1 rounded-3xl bg-card px-5 py-3 font-sans text-base text-foreground placeholder:text-muted-foreground"
            />
            <IconButton
              icon={ArrowUp}
              accessibilityLabel="Senden"
              disabled={!text.trim()}
              className={cn("bg-foreground", !text.trim() && "opacity-40")}
              iconClassName="text-background"
              onPress={send}
            />
          </View>
        ) : (
          <View
            className={cn(
              "mx-auto w-full max-w-screen-sm items-end px-5 pb-3 pt-2",
              changeStyle.isPending && "opacity-40",
            )}
            pointerEvents={changeStyle.isPending ? "none" : "auto"}
          >
            <View
              className="absolute bottom-full right-5 mb-2 flex-row items-center gap-1.5"
              pointerEvents={ratingOpen ? "box-none" : "none"}
              accessibilityElementsHidden={!ratingOpen}
            >
              {/* Bubbles poppen nacheinander von links nach rechts auf */}
              <PopBubble index={0} open={ratingProgress}>
                <View className="h-11 justify-center rounded-full bg-butter px-4 shadow-lg">
                  <Text className="font-bold text-ink">Vote</Text>
                </View>
              </PopBubble>
              {RATINGS.map((r) => (
                <PopBubble key={r} index={r} open={ratingProgress}>
                  <Pressable
                    onPress={() => rate(r)}
                    accessibilityLabel={`${r} von 5`}
                    className={cn(
                      "h-11 w-11 items-center justify-center rounded-full shadow-lg active:scale-90",
                      current.image.rating === r ? "bg-foreground" : "bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "font-bold text-lg",
                        current.image.rating === r && "text-background",
                      )}
                    >
                      {r}
                    </Text>
                  </Pressable>
                </PopBubble>
              ))}
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setRatingOpen(!ratingOpen);
                }}
                accessibilityLabel="Bewerten"
                className={cn(
                  "h-14 min-w-14 flex-row items-center justify-center gap-1 rounded-full px-4 active:opacity-70",
                  ratingOpen ? "bg-foreground" : "bg-card",
                )}
              >
                <Icon
                  as={Star}
                  size={20}
                  fill={current.image.rating ? "currentColor" : "none"}
                  className={ratingOpen ? "text-background" : "text-foreground"}
                />
                {current.image.rating && (
                  <Text className={cn("font-bold", ratingOpen && "text-background")}>
                    {current.image.rating}
                  </Text>
                )}
              </Pressable>
              <IconButton
                icon={MessageCircle}
                accessibilityLabel="Feedback"
                className="h-14 w-14"
                onPress={() => compose("review")}
              />
              <PillButton label="Change Style" icon={Sparkles} onPress={() => compose("style")} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
