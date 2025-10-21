import { Redirect } from 'expo-router';

export default function TabIndex() {
  return <Redirect href={'/(tabs)/menu'} />;  // relatívna cesta podľa layoutu
}
