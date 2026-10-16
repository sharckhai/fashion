import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/floating-tab-bar";
import { cn, IconButton, Image, Text } from "@/components/ui";
import { useGallery, useToggleFavorite } from "@/lib/queries";

const FILTERS = [
  { label: "Alle", favoritesOnly: false },
  { label: "Favoriten", favoritesOnly: true },
];

export default function Gallery() {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { data: images = [], isLoading } = useGallery(favoritesOnly);
  const toggleFavorite = useToggleFavorite();
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <FlatList
        key={columns}
        data={images}
        numColumns={columns}
        keyExtractor={(img) => img.id}
        className="mx-auto w-full max-w-screen-md"
        contentContainerClassName="gap-3 px-5"
        columnWrapperClassName="gap-3"
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 48 }}
        ListHeaderComponent={
          <View className="gap-5 pb-2 pt-2">
            <Text className="font-display text-5xl tracking-tight">Galerie</Text>
            <View className="flex-row gap-1 self-start rounded-full bg-card p-1">
              {FILTERS.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setFavoritesOnly(f.favoritesOnly)}
                  className={cn(
                    "h-11 justify-center rounded-full px-5",
                    favoritesOnly === f.favoritesOnly && "bg-foreground",
                  )}
                >
                  <Text
                    className={cn(
                      "font-bold",
                      favoritesOnly === f.favoritesOnly
                        ? "text-background"
                        : "text-muted-foreground",
                    )}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? undefined : (
            <View className="items-center rounded-[32px] bg-sage p-8">
              <Text className="text-center font-bold text-lg text-ink">
                {favoritesOnly
                  ? "Noch keine Favoriten. Tippe auf das Herz bei einem Look."
                  : "Noch keine Looks. Starte mit dem + unten."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.chatId}`)}
            className="flex-1 active:opacity-90"
            style={{ maxWidth: `${100 / columns}%` }}
          >
            <Image
              source={{ uri: item.url, cacheKey: item.id }}
              className="aspect-[2/3] w-full rounded-3xl bg-muted"
              contentFit="cover"
              transition={200}
            />
            <IconButton
              icon={Heart}
              accessibilityLabel={item.isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className="absolute bottom-2 right-2"
              filled={item.isFavorite}
              iconClassName={item.isFavorite ? "text-destructive" : undefined}
              onPress={() =>
                toggleFavorite.mutate({ imageId: item.id, isFavorite: !item.isFavorite })
              }
            />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
