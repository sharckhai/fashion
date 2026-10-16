import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "nativewind";
import { Pressable, type PressableProps, Text as RNText, type TextProps } from "react-native";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: (string | false | null | undefined)[]) =>
  twMerge(classes.filter(Boolean).join(" "));

export function Text({ className, ...props }: TextProps) {
  return <RNText className={cn("font-sans text-base text-foreground", className)} {...props} />;
}

// Lucide-Icons über className färben (text-*), statt Farbwerte zu übergeben
function IconImpl({ as: Component, ...props }: LucideProps & { as: LucideIcon }) {
  return <Component {...props} />;
}
cssInterop(IconImpl, {
  className: { target: "style", nativeStyleToProp: { color: true } },
});
export const Icon = IconImpl as (
  props: LucideProps & { as: LucideIcon; className?: string },
) => React.JSX.Element;

export const Image = cssInterop(ExpoImage, { className: "style" });

type ButtonProps = PressableProps & { className?: string };

function pressWithHaptics(onPress: PressableProps["onPress"]): PressableProps["onPress"] {
  return (e) => {
    Haptics.selectionAsync();
    onPress?.(e);
  };
}

/** Runder Icon-Button, 44 pt Touch-Target */
export function IconButton({
  icon,
  className,
  iconClassName,
  filled,
  onPress,
  ...props
}: ButtonProps & { icon: LucideIcon; iconClassName?: string; filled?: boolean }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={pressWithHaptics(onPress)}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-full bg-card active:opacity-70",
        className,
      )}
      {...props}
    >
      <Icon
        as={icon}
        size={20}
        fill={filled ? "currentColor" : "none"}
        className={cn("text-foreground", iconClassName)}
      />
    </Pressable>
  );
}

/** Schwarzer Pill-CTA */
export function PillButton({
  label,
  icon,
  className,
  onPress,
  disabled,
  ...props
}: ButtonProps & { label: string; icon?: LucideIcon }) {
  return (
    <Pressable
      onPress={pressWithHaptics(onPress)}
      disabled={disabled}
      className={cn(
        "h-14 flex-row items-center justify-center gap-2 rounded-full bg-foreground px-7 active:opacity-80",
        disabled && "opacity-40",
        className,
      )}
      {...props}
    >
      <Text className="font-bold text-background">{label}</Text>
      {icon && <Icon as={icon} size={18} className="text-background" />}
    </Pressable>
  );
}
