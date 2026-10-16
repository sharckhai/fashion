import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { House, Images, type LucideIcon, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn, Icon } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = { index: House, tryon: Plus, gallery: Images };

export const TAB_BAR_HEIGHT = 64;

/** Schwebende Pill-Tab-Bar, „+“ (Anprobieren) hervorgehoben in der Mitte */
export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-0 items-center"
      style={{ bottom: Math.max(insets.bottom, 16) }}
      pointerEvents="box-none"
    >
      <View
        className="flex-row items-center gap-3 rounded-full bg-foreground px-3"
        style={{ height: TAB_BAR_HEIGHT }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isAction = route.name === "tryon";
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                Haptics.selectionAsync();
                if (!focused) navigateToTab(route.key);
              }}
              className={cn(
                "h-12 items-center justify-center rounded-full active:opacity-70",
                isAction ? "w-16 bg-butter" : "w-12",
                focused && !isAction && "bg-background/15",
              )}
            >
              <Icon
                as={ICONS[route.name]}
                size={isAction ? 26 : 22}
                strokeWidth={isAction ? 2.5 : 2}
                className={cn(
                  isAction ? "text-ink" : "text-background",
                  !focused && !isAction && "opacity-60",
                )}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
