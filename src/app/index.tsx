import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { session, loading, isAdmin, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    
    if (loading) return;

    
    if (!session) {
      router.replace("/mainPage");
      return;
    }

    
    if (!profile) return;

    
    if (isAdmin) {
      router.replace("/(admin)/menu/items");
    } else {
      router.replace("/(user)");
    }
  }, [session, loading, profile, isAdmin]);


  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
