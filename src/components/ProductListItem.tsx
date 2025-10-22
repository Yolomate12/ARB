import { Link, useSegments } from 'expo-router';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import Colors from '../constants/Colors';
import { Product } from '../types';

export const defaultPizzaImage =
    'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/food/default.png'


type ProductListItemProps = {
    product: Product;
}


const ProductListItem = ({ product }: ProductListItemProps) => {

  const segments = useSegments();
  

  return (
    <Link href={`/${segments[0]}/menu/${product.id}`} asChild>
      <Pressable style={styles.container}>
        <Image
          source={{ uri: product.image || defaultPizzaImage }}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
      </Pressable>
    </Link>
  );
};

export default ProductListItem;



const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    overflow: 'hidden',
    flex: 1,
    maxWidth: "50%",
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
  },
  title: {
    fontWeight: '600',
    fontSize: 18,
    marginVertical: 10,
  },
  price: {
    color: Colors.light.tint,
    fontWeight: 'bold',
    marginTop: 'auto',
  },
});