import { Tabs } from "expo-router/js-tabs";

import { FloatingTabBar } from "@/components/floating-tab-bar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="tryon" options={{ title: "Anprobieren" }} />
      <Tabs.Screen name="gallery" options={{ title: "Galerie" }} />
    </Tabs>
  );
}
