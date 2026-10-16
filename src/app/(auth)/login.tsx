import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PillButton, Text } from "@/components/ui";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const inputClass =
  "h-14 rounded-full bg-card px-6 font-sans text-base text-foreground placeholder:text-muted-foreground";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    const credentials = { email: email.trim(), password };
    const { error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setLoading(false);
    if (error) setError(error.message);
  }

  async function google() {
    setError(null);
    await signInWithGoogle().catch((e: Error) => setError(e.message));
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-between gap-10 px-6 pb-6 pt-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-screen-sm gap-6">
            <View className="h-24 w-24 rotate-12 rounded-[32px] bg-butter" />
            <Text className="font-display text-5xl leading-[56px] tracking-tight">
              Probier alles an,{"\n"}
              <Text className="font-serif text-5xl leading-[56px]">bevor du's kaufst.</Text>
            </Text>
            <Text className="text-muted-foreground">
              Lade ein Foto von dir und deine Wunsch-Kleidung hoch – wir zeigen dir, wie es
              aussieht.
            </Text>
          </View>

          <View className="mx-auto w-full max-w-screen-sm gap-3">
            <Pressable
              onPress={google}
              className="h-14 flex-row items-center justify-center gap-3 rounded-full bg-card active:opacity-70"
            >
              <Text className="font-display text-xl">G</Text>
              <Text className="font-bold">Mit Google fortfahren</Text>
            </Pressable>
            <View className="flex-row items-center gap-3 py-2">
              <View className="h-px flex-1 bg-muted" />
              <Text className="text-sm text-muted-foreground">oder mit E-Mail</Text>
              <View className="h-px flex-1 bg-muted" />
            </View>
            <TextInput
              className={inputClass}
              placeholder="E-Mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              className={inputClass}
              placeholder="Passwort"
              secureTextEntry
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              textContentType={mode === "signIn" ? "password" : "newPassword"}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />
            {error && <Text className="px-6 text-destructive">{error}</Text>}
            <PillButton
              label={mode === "signIn" ? "Anmelden" : "Konto erstellen"}
              icon={ArrowRight}
              onPress={submit}
              disabled={loading || !email || password.length < 6}
              className="mt-2"
            />
            <Pressable
              hitSlop={8}
              className="h-11 items-center justify-center"
              onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            >
              <Text className="text-muted-foreground">
                {mode === "signIn" ? "Noch kein Konto? " : "Schon registriert? "}
                <Text className="font-bold">{mode === "signIn" ? "Registrieren" : "Anmelden"}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
