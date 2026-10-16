import type { ReactNode } from "react";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

const STAGGER = 0.1;
const SPAN = 0.5;
const easeOutBack = Easing.out(Easing.back(1.4));

/**
 * Bubble, die aus einem gemeinsamen Fortschritt `open` (0 → 1) ihren eigenen,
 * versetzten Pop-in ableitet. Läuft komplett auf dem UI-Thread, kein Re-Mount.
 */
export function PopBubble({
  index,
  open,
  children,
}: {
  index: number;
  open: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const start = index * STAGGER;
    const t = interpolate(open.value, [start, start + SPAN], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: Math.min(1, t * 2),
      transform: [{ translateX: (1 - t) * -10 }, { scale: 0.5 + 0.5 * easeOutBack(t) }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
