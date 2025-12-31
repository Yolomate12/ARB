import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type CityItem = {
  name_city: string
  img_city: string | null
  streets: string[]
}

export default function CityListScreen() {
  const [cities, setCities] = useState<CityItem[]>([])
  const [filteredCities, setFilteredCities] = useState<CityItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from('bin_full_info')
        .select('name_city, img_city, name_street')

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data) {
        // Zgrupuj ulice podľa mesta
        const cityMap = new Map<string, CityItem>()

        data.forEach(item => {
          const existing = cityMap.get(item.name_city)
          if (existing) {
            if (item.name_street && !existing.streets.includes(item.name_street)) {
              existing.streets.push(item.name_street)
            }
          } else {
            cityMap.set(item.name_city, {
              name_city: item.name_city,
              img_city: item.img_city,
              streets: item.name_street ? [item.name_street] : [],
            })
          }
        })

        const uniqueCities = Array.from(cityMap.values())
        setCities(uniqueCities)
        setFilteredCities(uniqueCities)
      }

      setLoading(false)
    }

    fetchCities()
  }, [])

  // Filter podľa mesta alebo ulíc
  useEffect(() => {
    const filtered = cities.filter(city =>
      city.name_city.toLowerCase().includes(search.toLowerCase()) ||
      city.streets.some(street =>
        street.toLowerCase().includes(search.toLowerCase())
      )
    )
    setFilteredCities(filtered)
  }, [search, cities])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Chyba: {error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* SearchBar */}
      <TextInput
        placeholder="Hľadaj mesto alebo ulicu..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        placeholderTextColor="#999"
      />

      {/* Zoznam miest */}
      {filteredCities.map(city => (
        <Link
          key={city.name_city}
          href={{
            pathname: '/(admin)/menu/[city]/[street]',
            params: { city: city.name_city },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <Image
              source={{ uri: city.img_city ?? 'https://via.placeholder.com/600' }}
              style={styles.image}
            />
            <View style={styles.overlay} />
            <View style={styles.textBox}>
              <Text style={styles.title}>{city.name_city}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}

const { width, height } = Dimensions.get('window')
const scale = width / 375

const styles = StyleSheet.create({
  container: {
    padding: 12,
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBar: {
    height: 50,
    backgroundColor: '#1e1e1e',
    borderRadius: 0,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 16,
    marginBottom: 12,
  },

  textBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },

  card: {
    height: height * 0.132,
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF9627',
    opacity: 0.73,
  },

  title: {
    color: 'white',
    fontSize: 32 * scale,
    fontWeight: '800',
  },
})
