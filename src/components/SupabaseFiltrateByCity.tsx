import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native'

type CityItem = {
  nameOfCity: string
}

export default function SupabaseCityListItem() {
  const [cities, setCities] = useState<CityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('nameOfCity')

      if (error) {
        setError(error.message)
      } else {
        // odstránenie duplicít
        const uniqueCities = Array.from(
          new Set(data?.map((item) => item.nameOfCity))
        ).map((city) => ({ nameOfCity: city }))

        setCities(uniqueCities)
      }

      setLoading(false)
    }

    fetchCities()
  }, [])

  if (loading) return <ActivityIndicator size="large" />
  if (error) return <Text>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      {cities.map((city) => (
        <Link
          key={city.nameOfCity}
          href={{
            pathname: '/(admin)/menu/[city]',
            params: { city: city.nameOfCity },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <Text style={styles.title}>{city.nameOfCity}</Text>
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
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
