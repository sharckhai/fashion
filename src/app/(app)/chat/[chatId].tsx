import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowUp, Heart, MessageCircle, Sparkles, Star } from "lucide-react-native";
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { GeneratingOverlay } from "@/components/generating-overlay";
import { PopBubble } from "@/components/pop-bubble";
import { cn, Icon, IconButton, Image, PillButton, Text } from "@/components/ui";
import { useChangeStyle, useChat, useReviewImage, useToggleFavorite } from "@/lib/queries";

const RATINGS = [1, 2, 3, 4, 5];
// Abstand oben + Button-Höhe + Abstand zum Bild
const HEADER_HEIGHT = 12 + 44 + 12;

const PLACEHOLDERS = {
  style: "z. B. Farbe in kariertes Orange-Rot ändern",
  review: "Feedback\nWas gefällt dir, was nicht?",
};

export default function Chat() {
  const { chatId, imageId } = useLocalSearchParams<{ chatId: string; imageId?: string }>();
  const { data } = useChat(chatId);
  const changeStyle = useChangeStyle(chatId);
  const reviewImage = useReviewImage();
  const toggleFavorite = useToggleFavorite();
  // ausgewählte Version per Bild-ID; Start mit dem Bild, das auf Home/Galerie angetippt wurde
  const [selectedImageId, setSelectedImageId] = useState<string | null>(imageId ?? null);
  const [composerOpen, setComposerOpen] = useState(false);
  // Modus bleibt beim Schließen erhalten, damit die Bubble mit dem richtigen Inhalt ausblendet
  const [mode, setMode] = useState<"style" | "review">("style");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (composerOpen) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [composerOpen]);

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
    setComposerOpen(false);
  }

  function compose(next: "style" | "review") {
    if (composerOpen && mode === next) return closeOverlays();
    setRatingOpen(false);
    setText(next === "review" ? (current.image.review ?? "") : "");
    setMode(next);
    setComposerOpen(true);
  }

  // aktives Overlay; die übrigen Buttons der Leiste werden abgedunkelt
  const active = ratingOpen ? "rating" : composerOpen ? mode : null;
  const onPill = scrolled ? "text-ink-foreground" : "text-foreground";
  const dimmed = (key: "rating" | "style" | "review") => active !== null && active !== key;

  function rate(rating: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reviewImage.mutate({ imageId: current.image.id, rating });
    setRatingOpen(false);
  }

  function send() {
    const value = text.trim();
    setText("");
    setComposerOpen(false);
    if (mode === "review") {
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
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          scrollEventThrottle={16}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 8)}
          contentContainerClassName="mx-auto w-full max-w-screen-sm gap-4 px-5 pb-6"
          contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT }}
        >
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

        {/* Header ohne Balken: Pills werden erst beim Scrollen schwarz hinterlegt */}
        <View
          className="absolute inset-x-0 top-0"
          style={{ paddingTop: insets.top + 12 }}
          pointerEvents="box-none"
        >
          <View
            className="mx-auto w-full max-w-screen-sm flex-row items-center justify-between px-5"
            pointerEvents="box-none"
          >
            <Pressable
              accessibilityLabel="Zurück"
              hitSlop={8}
              className="active:opacity-70"
              onPress={() => router.dismissTo("/")}
            >
              <FloatingPill visible={scrolled} className="w-11 items-center">
                <Icon as={ArrowLeft} size={20} className={onPill} />
              </FloatingPill>
            </Pressable>
            <FloatingPill visible={scrolled} className="px-5">
              <Text className={cn("font-bold text-lg", onPill)}>Dein Look</Text>
            </FloatingPill>
            <Pressable
              accessibilityLabel="Favorit"
              hitSlop={8}
              className="active:opacity-70"
              onPress={() => {
                Haptics.selectionAsync();
                toggleFavorite.mutate({
                  imageId: current.image.id,
                  isFavorite: !current.image.isFavorite,
                });
              }}
            >
              <FloatingPill visible={scrolled} className="w-11 items-center">
                <Icon
                  as={Heart}
                  size={20}
                  fill={current.image.isFavorite ? "currentColor" : "none"}
                  className={current.image.isFavorite ? "text-destructive" : onPill}
                />
              </FloatingPill>
            </Pressable>
          </View>
        </View>

        {active && (
          <Pressable
            accessibilityLabel="Schließen"
            className="absolute inset-0"
            onPress={closeOverlays}
          />
        )}

        <View
          className={cn(
            "mx-auto w-full max-w-screen-sm items-end px-5 pb-3 pt-2",
            changeStyle.isPending && "opacity-40",
          )}
          pointerEvents={changeStyle.isPending ? "none" : "box-none"}
        >
          {/* Bewertung: Bubbles poppen nacheinander von links nach rechts auf */}
          <View
            className="absolute bottom-full right-5 mb-2 flex-row items-center gap-1.5"
            pointerEvents={ratingOpen ? "box-none" : "none"}
            accessibilityElementsHidden={!ratingOpen}
          >
            <PopBubble index={0} open={ratingOpen}>
              <View className="h-11 justify-center rounded-full bg-butter px-4">
                <Text className="font-bold text-ink">Vote</Text>
              </View>
            </PopBubble>
            {RATINGS.map((r) => (
              <PopBubble key={r} index={r} open={ratingOpen}>
                <Pressable
                  onPress={() => rate(r)}
                  accessibilityLabel={`${r} von 5`}
                  className={cn(
                    "h-11 w-11 items-center justify-center rounded-full border border-foreground/10 active:scale-90",
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

          {/* Feedback / Change Style: Text-Bubble + Senden poppen über der Leiste auf */}
          <View
            className="absolute inset-x-5 bottom-full mb-2"
            pointerEvents={composerOpen ? "box-none" : "none"}
            accessibilityElementsHidden={!composerOpen}
          >
            <View className="w-full flex-row items-end gap-1.5">
              <View className="flex-1">
                <PopBubble index={0} open={composerOpen}>
                  <TextInput
                    ref={inputRef}
                    multiline
                    value={text}
                    onChangeText={setText}
                    placeholder={PLACEHOLDERS[mode]}
                    className="max-h-32 min-h-11 rounded-3xl border border-foreground/10 bg-card px-5 py-3 outline-none font-sans text-base text-foreground placeholder:text-muted-foreground"
                  />
                </PopBubble>
              </View>
              <PopBubble index={1} open={composerOpen}>
                <IconButton
                  icon={ArrowUp}
                  accessibilityLabel="Senden"
                  disabled={!text.trim()}
                  className={cn("bg-foreground", !text.trim() && "opacity-40")}
                  iconClassName="text-background"
                  onPress={send}
                />
              </PopBubble>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                if (ratingOpen) return closeOverlays();
                closeOverlays();
                setRatingOpen(true);
              }}
              accessibilityLabel="Bewerten"
              className={cn(
                "h-14 min-w-14 flex-row items-center justify-center gap-1 rounded-full px-4 active:opacity-70",
                ratingOpen ? "bg-foreground" : "bg-card",
                dimmed("rating") && "opacity-40",
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
              className={cn(
                "h-14 w-14",
                active === "review" && "bg-foreground",
                dimmed("review") && "opacity-40",
              )}
              iconClassName={active === "review" ? "text-background" : undefined}
              onPress={() => compose("review")}
            />
            <PillButton
              label="Change Style"
              icon={Sparkles}
              className={cn(dimmed("style") && "opacity-40")}
              onPress={() => compose("style")}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Header-Element mit schwarzer Pill, die weich einblendet */
function FloatingPill({
  visible,
  className,
  children,
}: {
  visible: boolean;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 180 });
  }, [visible, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className={cn("h-11 justify-center", className)}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <View className="flex-1 rounded-full bg-ink" />
      </Animated.View>
      {/* eigene View, sonst malt das Web das absolute Pill-Layer über das SVG-Icon */}
      <View>{children}</View>
    </View>
  );
}
