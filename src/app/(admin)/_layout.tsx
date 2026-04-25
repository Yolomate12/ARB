import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Admin" }} />
      <Stack.Screen name="menu" options={{ headerShown: false }} />
    </Stack>
  );
}
