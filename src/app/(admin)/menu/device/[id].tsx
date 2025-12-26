import { supabase } from '@/lib/supabase'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

type DeviceDetail = {
  device_id: string
  device_name: string
  status: string
  last_seen: string
  name_city: string
  img?: string
}

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [device, setDevice] = useState<DeviceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchDevice = async () => {
      const { data, error } = await supabase
        .from('bin_full_info')
        .select('*')
        .eq('device_id', id) // ID musí byť presne string
        .single()

      if (error) {
        console.error('Chyba pri načítaní zariadenia:', error.message)
        setError(error.message)
        setDevice(null)
      } else {
        setDevice(data)
      }
      setLoading(false)
    }

    fetchDevice()
  }, [id])

  if (loading) return <ActivityIndicator size="large" color="#007AFF" />
  if (error) return <Text style={styles.error}>Chyba: {error}</Text>
  if (!device) return <Text style={styles.error}>Device nenájdený</Text>

  return (
    <View style={styles.container}>
      {/* Nastavenie názvu v stacku */}
      <Stack.Screen options={{ title: device.device_name }} />

      <Text style={styles.title}>{device.device_name}</Text>

      <Text style={styles.label}>
        Mesto: <Text style={styles.value}>{device.name_city}</Text>
      </Text>

      <Text style={styles.label}>
        Status: <Text style={styles.value}>{device.status}</Text>
      </Text>

      <Text style={styles.label}>
        Posledná aktivita:{' '}
        <Text style={styles.value}>
          {new Date(device.last_seen).toLocaleString()}
        </Text>
      </Text>

      {device.img && (
        <View style={{ marginTop: 10 }}>
          <Text>Obrázok: {device.img}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 6,
  },
  value: {
    color: 'black',
    fontWeight: '600',
  },
  error: {
    color: 'red',
    fontSize: 16,
    padding: 16,
  },
})
