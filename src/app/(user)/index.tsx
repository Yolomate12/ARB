import { Redirect } from 'expo-router';

export default function TabIndex() {
  return <Redirect href={'/(user)/menu'} />;  // relatívna cesta podľa layoutu
}
