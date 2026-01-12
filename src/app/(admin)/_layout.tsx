import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

function TabBarIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={25} style={{ marginBottom: -3 }} name={name} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  // ✅ Redirect len po načítaní auth stavu
  useEffect(() => {
    if (loading) return; // čakáme, kým sa načíta
    if (!session && !redirected.current) {
      redirected.current = true;
      router.replace('/(auth)/sign-in');
    }
  }, [loading, session]);

  // ✅ Ak nie je admin, presmeruj bezpečne
  useEffect(() => {
    if (!loading && session && profile && !isAdmin && !redirected.current) {
      redirected.current = true;
      router.replace('/');
    }
  }, [loading, session, profile, isAdmin]);

  // 🔁 Počkáme, kým sa všetko načíta
  const ready = !loading && !!session && profile !== null;

  // 🧭 Debug info
  useEffect(() => {
    if (ready && isAdmin) {
      console.log('✅ Admin sa prihlásil:', session?.user?.email);
    }
  }, [ready, isAdmin, session]);

  // ⏳ Zobraz loading indikátor počas načítania
  if (loading || !ready) {
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

  // 🔒 Ak redirect prebieha, nerenderuj nič
  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.background,
        tabBarInactiveTintColor: 'gainsboro',
        tabBarStyle: { backgroundColor: Colors.light.tint },
        tabBarStyle: { display: 'none' }, // tab bar je skrytá
        headerShown: false,      
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
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
