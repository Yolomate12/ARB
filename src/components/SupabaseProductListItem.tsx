// components/SupabaseProductListItem.tsx
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

type KosItem = {
  id: number
  nazov: string
  miesto: string
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
            <Text style={styles.title}>{item.nazov}</Text>
            <Text>Miesto: {item.miesto}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    padding: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
})
