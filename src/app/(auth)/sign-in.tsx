import WButton from "@/components/Button_white";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "../../constants/Colors";

const SignInScreen = () => {
  const router = useRouter(); // nechávam, aj keď ho tu priamo nepoužívaš
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert("Please enter email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert(error.message);
    }

    // ❗ ŽIADEN router.push TU
    // AuthProvider + AuthGate to vyrieši
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Sign in" }} />

      <Text style={styles.welcomeText}>Welcome back!</Text>

      <View>
        <View style={styles.containerValue}></View>
        <Text style={styles.labelEmail}>Email Address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="jon@gmail.com"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View>
        <View style={styles.containerValuePassword}></View>
        <Text style={styles.labelPassword}>Password</Text>

        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder=""
            style={styles.input}
            secureTextEntry={!showPassword}
          />

          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eye}
            hitSlop={10}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#555"
            />
          </Pressable>
        </View>
      </View>

      {fetchingProfile ? (
        <ActivityIndicator
          size="large"
          color={Colors.light.tint}
          style={{ marginVertical: 20 }}
        />
      ) : (
        <LinearGradient
          colors={["#F95A00", "#FFBB00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          <WButton
            onPress={signInWithEmail}
            disabled={loading}
            style={styles.button}
            text={loading ? "Logging in..." : "Log in"}
          />
        </LinearGradient>
      )}

      <View style={styles.containerSignUp}>
        <Text style={styles.textAccount}>Don’t have an account?</Text>
        <Link style={styles.link} href={"/(auth)/sign-up"}>
          Sign up
        </Link>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");
const scale = width / 375;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: "center",
    flex: 1,
    backgroundColor: "white",
  },
  welcomeText: {
    textAlign: "center",
    fontSize: 32 * scale,
    fontWeight: "600",
    color: "#FA5F02",
    marginBottom: width * 0.3,
  },
  containerSignUp: {
    flexDirection: "row",
    gap: 5,
    fontSize: 15 * scale,
    alignItems: "center",
    marginTop: width * 0.025,
    justifyContent: "center",
  },
  textAccount: { fontWeight: "400" },
  link: { fontWeight: "700", color: "#F95E01" },
  button: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  gradientButton: {
    width: width * 0.9,
    height: width * 0.14,
    marginTop: width * 0.15,
    justifyContent: "center",
    alignItems: "center",
  },
  containerValue: {
    position: "absolute",
    width: width * 0.3,
    height: width * 0.05,
    left: width * 0.05,
    backgroundColor: "white",
    zIndex: 1,
  },
  containerValuePassword: {
    position: "absolute",
    width: width * 0.22,
    height: width * 0.05,
    left: width * 0.05,
    backgroundColor: "white",
    zIndex: 1,
  },
  labelEmail: {
    color: "#0A0A0A",
    position: "absolute",
    zIndex: 2,
    left: width * 0.08,
    top: -width * 0.01,
  },
  labelPassword: {
    position: "absolute",
    left: width * 0.08,
    top: -width * 0.01,
    zIndex: 2,
    color: "#0A0A0A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#0A0A0A",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 20,
    backgroundColor: "white",
    height: width * 0.14,
  },

  // 👁 wrapper + eye button
  passwordWrap: {
    position: "relative",
  },
  eye: {
    position: "absolute",
    right: 15,
    top: (width * 0.14) / 2 - 5.5,
  },
});

export default SignInScreen;
