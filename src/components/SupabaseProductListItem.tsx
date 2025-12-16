// components/SupabaseProductListItem.tsx
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'

type KosItem = {
  id: number
  nazov: string
  miesto: string
  image_url?: string
}

export default function SupabaseProductListItem() {
  const [items, setItems] = useState<KosItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('Kos').select('*')
      if (error) setError(error.message)
      else setItems(data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <ActivityIndicator size="large" color="#007AFF" />
  if (error) return <Text>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Link key={item.id} href={`/menu/${item.id}`} asChild>
          <Pressable style={styles.card}>
            <ImageBackground
              source={{ uri: item.image_url }}
              style={styles.imageBackground}
              imageStyle={{ borderRadius: 12 }}
            >
              <View style={styles.overlay} />
              <Text style={styles.title}>{item.nazov}</Text>
              <Text style={styles.subtitle}>Miesto: {item.miesto}</Text>
            </ImageBackground>
          </Pressable>

        </Link>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    width: '95%',
    alignSelf: 'center',
  },
  card: {
    height: 150,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden', // ensures rounded corners
    elevation: 2,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // fills the entire ImageBackground
    backgroundColor: 'rgba(255, 150,39, 0.73)', // black with 30% opacity
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: '#fff',
  },
})
