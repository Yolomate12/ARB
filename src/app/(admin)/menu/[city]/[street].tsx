import { supabase } from '@/lib/supabase'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

type StreetItem = {
  name_street: string
}

export default function StreetListScreen() {
  const { city } = useLocalSearchParams<{ city: string }>()
  const [streets, setStreets] = useState<StreetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStreets = async () => {
      const { data, error } = await supabase
        .from('bin_full_info')
        .select('name_street')
        .eq('name_city', city)

      if (error) {
        setError(error.message)
      } else {
        const uniqueStreets = Array.from(new Set(data?.map(item => item.name_street)))
          .map(street => ({ name_street: street }))
        setStreets(uniqueStreets)
      }

      setLoading(false)
    }

    if (city) fetchStreets()
  }, [city])

  if (loading) return <ActivityIndicator size="large" />
  if (error) return <Text>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{city}</Text>
      {streets.map(street => (
        <Link
          key={street.name_street}
          href={{
            pathname: '/(admin)/menu/[city]/[street]/devices',
            params: { city, street: street.name_street },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <Text style={styles.title}>{street.name_street}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  card: {
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 12,
  },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
})
