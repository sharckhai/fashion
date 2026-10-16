import { router } from "expo-router";
import { ArrowRight, ArrowUpRight, Images, Shirt } from "lucide-react-native";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/floating-tab-bar";
import { Icon, IconButton, Image, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { useGallery } from "@/lib/queries";

export default function Home() {
  const email = useAuth((s) => s.session!.user.email!);
  const { data: images = [] } = useGallery();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 48 }}>
        <View className="mx-auto w-full max-w-screen-sm gap-6 px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.push("/profile")}
              accessibilityLabel="Profil"
              className="h-11 w-11 items-center justify-center rounded-full bg-blush active:opacity-70"
            >
              <Text className="font-bold text-lg text-ink">{email[0].toUpperCase()}</Text>
            </Pressable>
            <IconButton icon={Images} onPress={() => router.push("/gallery")} />
          </View>

          <Text className="font-display text-5xl leading-[56px] tracking-tight">
            Dein Style,{"\n"}
            <Text className="font-serif text-5xl leading-[56px]">neu anprobiert.</Text>
          </Text>

          <Pressable
            onPress={() => router.push("/tryon")}
            className="min-h-64 justify-between overflow-hidden rounded-[32px] bg-butter p-6 active:opacity-90"
          >
            <View className="absolute -right-10 -top-10 h-44 w-44 rotate-12 rounded-[48px] bg-peach" />
            <View className="h-12 w-12 items-center justify-center rounded-full bg-card">
              <Icon as={Shirt} size={22} className="text-foreground" />
            </View>
            <View className="gap-4">
              <View>
                <Text className="font-display text-4xl tracking-tight text-ink">Anprobieren</Text>
                <Text className="text-ink/70">Foto von dir + Kleidung hochladen</Text>
              </View>
              <View className="h-12 flex-row items-center gap-2 self-start rounded-full bg-ink px-5">
                <Text className="font-bold text-butter">Start</Text>
                <Icon as={ArrowRight} size={18} className="text-butter" />
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/gallery")}
            className="flex-row items-center justify-between rounded-[32px] bg-lavender p-6 active:opacity-90"
          >
            <View>
              <Text className="font-display text-3xl tracking-tight text-ink">Galerie</Text>
              <Text className="text-ink/70">
                {images.length === 1 ? "1 Look" : `${images.length} Looks`}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-card">
              <Icon as={ArrowUpRight} size={22} className="text-foreground" />
            </View>
          </Pressable>
        </View>

        {images.length > 0 && (
          <View className="mx-auto w-full max-w-screen-sm gap-3 pt-8">
            <Text className="px-5 font-bold text-xl">Zuletzt</Text>
            <FlatList
              horizontal
              data={images.slice(0, 10)}
              keyExtractor={(img) => img.id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-5"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[chatId]",
                      params: { chatId: item.chatId, imageId: item.id },
                    })
                  }
                >
                  <Image
                    source={{ uri: item.url, cacheKey: item.id }}
                    cachePolicy="memory-disk"
                    className="h-48 w-36 rounded-3xl bg-muted"
                    contentFit="cover"
                    transition={200}
                  />
                </Pressable>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
