import { supabase } from '@/lib/supabase'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

type DeviceItem = {
  device_id: string
  device_name: string
  status: string
}

export default function StreetDevicesScreen() {
  const { city, street } = useLocalSearchParams<{ city: string; street: string }>()
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('bin_full_info')
        .select('*')
        .eq('name_city', city)
        .eq('name_street', street)

      if (error) {
        setError(error.message)
      } else {
        setDevices(data ?? [])
      }
      setLoading(false)
    }

    if (city && street) fetchDevices()
  }, [city, street])

  if (loading) return <ActivityIndicator size="large" />
  if (error) return <Text>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{city} – {street}</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.device_id}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/(admin)/menu/device/[id]',
              params: { id: item.device_id },
            }}
            asChild
          >
            <Pressable style={styles.card}>
              <Text style={styles.title}>{item.device_name}</Text>
              <Text style={{ color: 'gray' }}>Status: {item.status}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: 'white' },
  card: { padding: 20, backgroundColor: '#1e1e1e', borderRadius: 12, marginBottom: 12 },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
})
