import { type ReactNode, useEffect } from "react";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const STAGGER_MS = 35;
// weiche iOS-artige Feder mit leichtem Überschwingen
const SPRING = { damping: 15, stiffness: 240, mass: 0.8 };

/**
 * Bubble mit federndem Pop-in, versetzt nach `index`. Bleibt gemountet,
 * animiert komplett auf dem UI-Thread. Kein Schatten auf animierten Views
 * (iOS rendert Schatten sonst in jedem Frame neu -> Ruckeln).
 */
export function PopBubble({
  index,
  open,
  children,
}: {
  index: number;
  open: boolean;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = open
      ? withDelay(index * STAGGER_MS, withSpring(1, SPRING))
      : withTiming(0, { duration: 120 });
  }, [open, index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [0, 1], "clamp"),
    transform: [{ translateY: (1 - progress.value) * 12 }, { scale: 0.6 + 0.4 * progress.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
