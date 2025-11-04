import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, loading, isAdmin, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ⏳ Počkaj, kým sa načíta profil a skončí loading
    if (loading) return;

    // 🚪 Ak nie je používateľ prihlásený, pošli ho na sign-in
    if (!session) {
      router.replace('/sign-in');
      return;
    }

    // ⚙️ Keď profil ešte nie je načítaný, nepresmeruj
    if (!profile) return;

    // 👑 Presmeruj podľa roly
    if (isAdmin) {
      router.replace('/(admin)');
    } else {
      router.replace('/(user)');
    }
  }, [session, loading, profile, isAdmin]);

  // ⏱️ Zatiaľ zobraz loading
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
