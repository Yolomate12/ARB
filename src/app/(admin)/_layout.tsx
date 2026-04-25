import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Admin" }} />
      {/* menu je route group, header nech rieši menu screens (alebo ho vypni) */}
      <Stack.Screen name="menu" options={{ headerShown: false }} />
    </Stack>
  );
}
