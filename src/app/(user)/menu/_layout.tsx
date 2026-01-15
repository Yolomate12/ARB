import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";

export default function MenuStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '', // nechceme default title, môžeme použiť vlastný headerLeft
          

         
          // Logo vľavo
          headerLeft: () => (
            <View style={styles.logoContainer}>
              <Image
                source={require('@assets/images/logo.png')} // uprav podľa cesty k tvojmu logu
                style={styles.logo}
              />
            </View>
          ),

          // Options tlačidlo vpravo
          headerRight: () => (
            <Link href="/(user)/two" asChild>
              <Pressable>
                {({ pressed }) => (
                  <View style={{ flexDirection: 'column', justifyContent: 'space-between', height: 12, paddingRight: 0, }}>
                    <View style={{ height: 4, width: 23, backgroundColor: Colors.orange.background, borderRadius: 20, }} />
                    <View style={{ height: 4, width: 23, backgroundColor: Colors.orange.background, borderRadius: 20, }} />
                  </View>
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    marginLeft: 0,
    marginTop: 0,
    justifyContent: 'center',
  },
  logo: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },
});
