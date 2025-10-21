import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

const ProductDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log('params:', useLocalSearchParams());

  return (
    <View>
      <Stack.Screen options={{title: 'Details' + id}}/>
      <Text style={{ fontSize: 20 }}>Product details for id: {id}</Text>
    </View>
  );
};

export default ProductDetailsScreen;