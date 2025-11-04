import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function TabTwoScreen() {

  const { session} = useAuth();
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Žiadny redirect — TabLayout sa o to postará
    } catch (err) {
      console.error('Chyba pri odhlasovaní:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PROFILE</Text>
      <Text style={styles.title}>ADMIN</Text>
      <Text style={styles.mail}>{session?.user?.email}</Text>
      <Image
        source={require('../../../assets/images/profile.jpg')}
        style={styles.image}
        resizeMode="cover"
      />
      <Button onPress={handleSignOut} text="Sign out" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 50,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginVertical: 20,
  },
  mail: {

  },
});
