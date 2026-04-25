import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/providers/AuthProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

function TabBarIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={25} name={name} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  // 🔐 Neprihlásený → login
  useEffect(() => {
    if (loading) return;
    if (!session && !redirected.current) {
      redirected.current = true;
      router.replace("/(auth)/sign-in");
    }
  }, [loading, session]);

  // 🔒 Nie admin → domov
  useEffect(() => {
    if (!loading && session && profile && !isAdmin && !redirected.current) {
      redirected.current = true;
      router.replace("/");
    }
  }, [loading, session, profile, isAdmin]);

  const ready = !loading && !!session && profile !== null;

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarStyle: { display: "none" }, 
      }}
    >
      {/* root – skrytý */}
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* MENU */}
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      {/* PROFIL */}
      <Tabs.Screen
        name="two"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
