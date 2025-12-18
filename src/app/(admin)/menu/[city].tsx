import { supabase } from '@/lib/supabase'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Text,
    View,
} from 'react-native'

type DeviceItem = {
  id: string
  name: string
  status: string
  last_seen: string
}

export default function CityDevicesScreen() {
  const { city } = useLocalSearchParams<{ city: string }>()
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDevices = async () => {
      const { data } = await supabase
        .from('devices')
        .select('id, name, status, last_seen')
        .eq('nameOfCity', city)

      setDevices(data ?? [])
      setLoading(false)
    }

    fetchDevices()
  }, [city])

  if (loading) return <ActivityIndicator size="large" />

  return (
    <View style={{ padding: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
        {city}
      </Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 15,
              backgroundColor: '#222',
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>
              {item.name}
            </Text>
            <Text style={{ color: 'gray' }}>
              Status: {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  )
}
