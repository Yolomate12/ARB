import { supabase } from '@/lib/supabase'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from 'react-native'

type DeviceItem = {
  device_id: string
  device_name: string
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
        .from('bin_full_info')
        .select('*')
        .eq('name_city', city)

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
        keyExtractor={(item) => item.device_id}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/(admin)/menu/device/[id]',
              params: { id: item.device_id }, // ✅ tu ID odovzdáš
            }}
            asChild
          >
            <Pressable
              style={({ pressed }) => ({
                padding: 15,
                backgroundColor: pressed ? '#333' : '#222',
                borderRadius: 10,
                marginBottom: 10,
              })}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>{item.device_name}</Text>
              <Text style={{ color: 'gray' }}>Status: {item.status}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  )
}
