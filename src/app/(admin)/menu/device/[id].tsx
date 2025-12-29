import { supabase } from '@/lib/supabase'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

type DeviceDetail = {
  device_id: string
  device_name: string
  status: string
  last_seen: string
  name_street: string
  name_city: string
}

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [device, setDevice] = useState<DeviceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDevice = async () => {
      const { data, error } = await supabase
        .from('bin_full_info')
        .select('*')
        .eq('device_id', id)
        .single()

      if (!error) setDevice(data)
      setLoading(false)
    }

    if (id) fetchDevice()
  }, [id])

  if (loading) return <ActivityIndicator size="large" />
  if (!device) return <Text>Zariadenie sa nenašlo</Text>

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{device.device_name}</Text>
      <Text>Status: {device.status}</Text>
      <Text>Ulica: {device.name_street}</Text>
      <Text>Mesto: {device.name_city}</Text>
      <Text>Last seen: {device.last_seen}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
})
