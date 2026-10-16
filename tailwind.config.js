/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: token("card"),
        muted: token("muted"),
        "muted-foreground": token("muted-foreground"),
        ink: token("ink"),
        butter: token("butter"),
        blush: token("blush"),
        sage: token("sage"),
        lavender: token("lavender"),
        peach: token("peach"),
        destructive: token("destructive"),
      },
      fontFamily: {
        sans: ["PlusJakartaSans_500Medium"],
        semibold: ["PlusJakartaSans_600SemiBold"],
        bold: ["PlusJakartaSans_700Bold"],
        display: ["PlusJakartaSans_800ExtraBold"],
        serif: ["InstrumentSerif_400Regular_Italic"],
      },
    },
  },
  plugins: [],
};
