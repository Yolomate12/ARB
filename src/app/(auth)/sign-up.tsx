import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import WButton from "../../components/Button";

const SignUpScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Vytvoriť učet</Text>

      <View>
        <View style={styles.containerValue}></View>
        <Text style={styles.labelEmail}>E-mail adresa</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="jon@gmail.com"
          style={styles.input}
        />
      </View>

      <View>
        <View style={styles.containerValuePassword}></View>
        <Text style={styles.labelPassword}>Heslo</Text>

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

      <WButton
        onPress={signUpWithEmail}
        disabled={loading}
        style={styles.button}
        text={loading ? "Vytváranie..." : "Vytvoriť učet"}
      />

      <View style={styles.containerSignUp}>
        <Text style={styles.textAccount}>Už máte vytvorené konto?</Text>
        <Link style={styles.link} href={"/(auth)/sign-in"}>
          Prihlásiť sa{" "}
        </Link>
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get("window");
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
    fontWeight: "semibold",
    color: "#FA5F02",
    alignItems: "center",
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
  textAccount: {
    fontWeight: "regular",
  },
  link: {
    fontWeight: "bold",
    color: "#F95E01",
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF9627",
    width: width * 0.9,
    height: width * 0.14,
    marginTop: width * 0.15,
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
    width: width * 0.16,
    height: width * 0.05,
    left: width * 0.05,
    backgroundColor: "white",
    zIndex: 1,
  },
  labelPassword: {
    position: "absolute",
    left: width * 0.08,
    top: -width * 0.01,
    zIndex: 2,
    color: "#0A0A0A",
  },
  labelEmail: {
    color: "#0A0A0A",
    position: "absolute",
    zIndex: 2,
    left: width * 0.08,
    top: -width * 0.01,
  },
  label: {
    color: "gray",
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
    top: (width * 0.14) / 2 - 5.5, // presný stred podľa výšky inputu
  },

  textButton: {
    alignSelf: "center",
    fontWeight: "bold",
    marginVertical: 10,
  },
});

export default SignUpScreen;
