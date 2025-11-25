import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { useAuthListener } from "@app/hooks/useAuthListener";

export default function RootLayout() {
  useAuthListener();

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
