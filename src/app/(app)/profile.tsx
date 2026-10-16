import { LogOut } from "lucide-react-native";
import { View } from "react-native";

import { PillButton, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const email = useAuth((s) => s.session?.user.email);

  return (
    <View className="flex-1 gap-6 bg-background px-6 pt-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-blush">
        <Text className="font-display text-2xl text-ink">{email?.[0].toUpperCase()}</Text>
      </View>
      <View>
        <Text className="font-display text-4xl tracking-tight">Profil</Text>
        <Text className="text-muted-foreground">{email}</Text>
      </View>
      <PillButton label="Abmelden" icon={LogOut} onPress={() => supabase.auth.signOut()} />
    </View>
  );
}
