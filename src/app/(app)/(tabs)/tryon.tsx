import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Camera, ImagePlus, Plus, Sparkles, UserRound, X } from "lucide-react-native";
import { useState } from "react";
import { ActionSheetIOS, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/floating-tab-bar";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { cn, Icon, IconButton, Image, PillButton, Text } from "@/components/ui";
import { useCreateTryOn } from "@/lib/queries";
import { pickImage, takePhoto } from "@/lib/upload";

const GARMENT_COLORS = ["bg-sage", "bg-peach", "bg-lavender", "bg-blush", "bg-butter"];

// iOS: Auswahl Kamera/Mediathek; sonst direkt Mediathek
function chooseImage(): Promise<string | null> {
  if (Platform.OS !== "ios") return pickImage();
  return new Promise((resolve) =>
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Foto aufnehmen", "Aus Mediathek wählen", "Abbrechen"], cancelButtonIndex: 2 },
      (i) => resolve(i === 0 ? takePhoto() : i === 1 ? pickImage() : null),
    ),
  );
}

export default function TryOn() {
  const [person, setPerson] = useState<string | null>(null);
  const [garments, setGarments] = useState<string[]>([]);
  const tryOn = useCreateTryOn();

  async function addGarment() {
    const uri = await chooseImage();
    if (uri) setGarments((g) => [...g, uri]);
  }

  // mutate statt mutateAsync: Fehler landen in tryOn.error und werden im Screen angezeigt
  function generate() {
    tryOn.mutate(
      { person: person!, garments },
      {
        onSuccess: (chatId) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPerson(null);
          setGarments([]);
          tryOn.reset();
          router.push(`/chat/${chatId}`);
        },
      },
    );
  }

  if (tryOn.isPending) {
    return <GeneratingOverlay className="flex-1" />;
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 120 }}>
        <View className="mx-auto w-full max-w-screen-sm gap-6 px-5 pt-2">
          <Text className="font-display text-5xl leading-[56px] tracking-tight">
            Anprobieren{"\n"}
            <Text className="font-serif text-5xl leading-[56px]">in zwei Schritten.</Text>
          </Text>

          <View className="gap-3">
            <Text className="font-bold text-xl">1 · Du</Text>
            <Pressable
              onPress={async () => setPerson((await chooseImage()) ?? person)}
              className="aspect-square w-full items-center justify-center overflow-hidden rounded-[32px] bg-blush active:opacity-90"
            >
              {person ? (
                <Image source={{ uri: person }} className="h-full w-full" contentFit="cover" />
              ) : (
                <View className="items-center gap-3">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-card">
                    <Icon as={UserRound} size={28} className="text-foreground" />
                  </View>
                  <Text className="font-bold text-lg text-ink">Foto von dir</Text>
                  <View className="flex-row items-center gap-2">
                    <Icon as={Camera} size={16} className="text-ink/70" />
                    <Text className="text-ink/70">Ganzkörper, gutes Licht</Text>
                  </View>
                </View>
              )}
            </Pressable>
          </View>

          <View className="gap-3">
            <Text className="font-bold text-xl">2 · Kleidung</Text>
            <View className="flex-row flex-wrap gap-3">
              {garments.map((uri, i) => (
                <View
                  key={uri}
                  className={cn(
                    "aspect-square w-[31%] overflow-hidden rounded-3xl",
                    GARMENT_COLORS[i % GARMENT_COLORS.length],
                  )}
                >
                  <Image source={{ uri }} className="h-full w-full" contentFit="cover" />
                  <IconButton
                    icon={X}
                    accessibilityLabel="Entfernen"
                    className="absolute right-1.5 top-1.5 h-8 w-8"
                    onPress={() => setGarments((g) => g.filter((x) => x !== uri))}
                  />
                </View>
              ))}
              <Pressable
                onPress={addGarment}
                className="aspect-square w-[31%] items-center justify-center gap-1 rounded-3xl bg-card active:opacity-70"
              >
                <Icon
                  as={garments.length ? Plus : ImagePlus}
                  size={26}
                  className="text-foreground"
                />
                <Text className="text-sm text-muted-foreground">Hinzufügen</Text>
              </Pressable>
            </View>
          </View>

          {tryOn.error && <Text className="text-destructive">{tryOn.error.message}</Text>}
        </View>
      </ScrollView>

      {person && garments.length > 0 && (
        <View
          className="absolute inset-x-5 mx-auto max-w-screen-sm"
          style={{ bottom: TAB_BAR_HEIGHT + 48 }}
        >
          <PillButton label="Outfit generieren" icon={Sparkles} onPress={generate} />
        </View>
      )}
    </SafeAreaView>
  );
}
