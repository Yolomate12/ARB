import Button from '@/components/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function TabTwoScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PROFILE</Text>

      <Text style={styles.mail}>
        {session?.user?.email}
      </Text>

      <Image
        source={require('../../../assets/images/profile.jpg')}
        style={styles.image}
        resizeMode="cover"
      />

      <Button
        onPress={signOut}
        text="Sign out"
      />

      {/* Tlačidlo pre navigáciu na Menu */}
      <Button
        onPress={() => router.push("/(user)/menu")}
        text="Go to Menu"
        style={{ marginTop: 20 }}
      />

      {/* Tlačidlo pre navigáciu na Join Company */}
      <Button
        onPress={() => router.push("/(user)/menu/joinCompany")}
        text="Join Company"
        style={{ marginTop: 20 }}
      />
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
    marginTop: 10,
    fontSize: 16,
  },
});
