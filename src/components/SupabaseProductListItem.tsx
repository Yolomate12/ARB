// components/SupabaseDeviceListItem.tsx
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type DeviceItem = {
  id: string
  name: string
  status: string
  last_seen: string
  img: string
}

export default function SupabaseDeviceListItem() {
  const [items, setItems] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('id, name, status, last_seen, img')

      if (error) setError(error.message)
      else setItems(data ?? [])

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <ActivityIndicator size="large" color="#007AFF" />
  if (error) return <Text>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={{
            pathname: '/menu/[id]',
            params: { id: item.id },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <ImageBackground
              source={{ uri: item.img }}
              style={styles.image}
              imageStyle={styles.imageBorder}
            >
              {/* overlay pre lepšiu čitateľnosť textu */}
              <View style={styles.overlay} />

              <View style={styles.content}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.text}>Status: {item.status}</Text>
                <Text style={styles.text}>
                  Last seen: {new Date(item.last_seen).toLocaleString()}
                </Text>
              </View>
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
  },
  card: {
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageBorder: {
    borderRadius: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // stmavenie pozadia
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  text: {
    color: 'white',
    fontSize: 13,
  },
})

