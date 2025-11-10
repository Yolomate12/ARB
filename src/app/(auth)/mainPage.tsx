import WButton from '@/components/Button_white';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

export default function MainPage() {
  const router = useRouter();
 
  const LogIn = () => router.push('/(auth)/sign-in');
  const SignUp = () => router.push('/(auth)/sign-up');

  return (
  <View style={styles.container}>
    {/* Horná časť - logo a text */}
    <View style={styles.content}>
      <Image
        style={styles.logo}
        source={require('../../../assets/images/logo_des.png')}
      />
      <View style={styles.containerText}>
        <Text style={styles.text}>
          Automatic Recycle Bin recycles your waste quickly and efficiently.
        </Text>
      </View>
    </View>

    {/* Spodná časť - tlačidlo */}
    <View style={styles.footer}>
      <LinearGradient
        colors={['#F95A00', '#FFBB00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <WButton onPress={LogIn} text="Log In" style={styles.button_LogIn} />
      </LinearGradient>
      <View style={styles.containerSignUp}>
          <Text style={styles.textAccount}>Don’t have an account?</Text>
          <Link style={styles.link} href={'/(auth)/sign-up'}>Sign up</Link>
        </View>
    </View>
  </View>
);
}

const { width, height } = Dimensions.get('window');
const scale = width / 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between', // rozdelí horný a dolný blok
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: height * 0.05, // mierny okraj zhora a zdola
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // zaberie zvyšný priestor
  },
  containerSignUp: {
    flexDirection: 'row',
    gap: 5,
    fontSize: 15 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAccount: {
    fontWeight: 'regular',
  },
  link: {
    fontWeight: 'bold',
    color: '#F95E01',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.2,
    resizeMode: 'contain',
    marginBottom: 20,
  },

  containerText: {
    alignItems: 'center',
  },

  text: {
    textAlign: 'center',
    fontSize: 12 * scale,
    paddingHorizontal: 20,
    fontWeight: '300',
    width: width * 0.7,
  },

  footer: {
    width: '100%',
    gap: 13,
    alignItems: 'center',
    marginBottom: height * 0.05, // medzera od spodku obrazovky
  },

  gradientButton: {
    width: width * 0.85,
    height: width * 0.14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  button_LogIn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});