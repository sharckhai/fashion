import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn, Icon, Text } from "@/components/ui";

const MESSAGES = [
  "Kleidung wird zugeschnitten…",
  "Stoff wird angepasst…",
  "Licht wird gesetzt…",
  "Letzter Feinschliff…",
];

/** Pulsierendes Overlay während die Generierung läuft (20–60 s) */
export function GeneratingOverlay({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      className={cn("items-center justify-center gap-4 bg-lavender", className)}
      style={style}
    >
      <Icon as={Sparkles} size={36} className="text-ink" />
      <Text className="font-bold text-lg text-ink">{MESSAGES[index]}</Text>
    </Animated.View>
  );
}
