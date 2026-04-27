import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// 1. registrácia tokenu
export async function registerForPush() {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
    .data;

  console.log("Push token:", token);
  return token;
}

// 2. TEST SEND PUSH (SEM TO DÁŠ)
export async function testPush(token: string) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: "Test",
      body: "Ahoj 👋",
    }),
  });

  const data = await res.json();

  console.log("🔥 PUSH RESPONSE:", JSON.stringify(data, null, 2));
}