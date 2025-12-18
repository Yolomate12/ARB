import { supabase } from '@/lib/supabase'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

type DeviceItem = {
  id: string        // ⬅️ UUID
  name: string
  status: string
  last_seen: string
  img: string
}

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [device, setDevice] = useState<DeviceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchDevice = async () => {
      const { data, error } = await supabase
        .from('devices')          // ⬅️ správna tabuľka
        .select('*')
        .eq('id', id)             // ⬅️ UUID ako string
        .single()

      if (error) {
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
  if (error) return <Text>Chyba: {error}</Text>
  if (!device) return <Text>Zariadenie sa nenašlo</Text>

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: device.name }} />

      <Text style={styles.title}>{device.name}</Text>
      <Text style={styles.label}>Status: {device.status}</Text>
      <Text style={styles.text}>
        Last seen: {new Date(device.last_seen).toLocaleString()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  text: {
    fontSize: 14,
    color: '#444',
  },
})
