import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={25} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const router = useRouter();

  // 🔒 Redirect neprihláseného používateľa
  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/sign-in');
    }
  }, [loading, session]);

  // Počkáme, kým sa auth stav načíta
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // Ak sa redirect práve deje
  if (!session) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
