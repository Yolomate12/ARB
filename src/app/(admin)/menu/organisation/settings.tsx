import { supabase } from "@/lib/supabase";
import { Alert, Pressable, Text, View } from "react-native";

export default function AdminSettings() {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout error", error.message);
    }
    // redirect rieši AuthProvider (onAuthStateChange)
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 24 }}>
        Settings
      </Text>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#b91c1c" : "#dc2626",
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 8,
        })}
      >
        <Text
          style={{ color: "white", fontWeight: "700", textAlign: "center" }}
        >
          Log out
        </Text>
      </Pressable>
    </View>
  );
}
