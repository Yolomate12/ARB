import { defaultPizzaImage } from '@/components/ProductListItem';
import products from '@assets/data/products';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const sizes = ['S', 'M', 'L', 'XL'];

const ProductDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const addToCart = () => {
    console.warn('adding to cart, size', selectedSize)
  }

  const [selectedSize, setSelectedSize] = useState('XL')

  const product = products.find((p) => p.id.toString() === id);

  if (!product) {
    return <Text>Not find</Text>
  }
  

  return (
    <View style={styles.container}>
      <Stack.Screen options={{title: product?.name}} />

      <Image source={{ uri: product.image || defaultPizzaImage}} style={styles.image} />

      

      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>{product.price}</Text>
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
    padding: 10,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
 
})

export default ProductDetailsScreen;