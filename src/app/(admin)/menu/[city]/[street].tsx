import { supabase } from '@/lib/supabase'
import { Image } from 'expo-image'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type StreetItem = {
  name_street: string
  img_street: string | null
}

export default function StreetListScreen() {
  const { city } = useLocalSearchParams<{ city: string }>()

  const [streets, setStreets] = useState<StreetItem[]>([])
  const [cityImage, setCityImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!city) return

    const fetchData = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('bin_full_info')
        .select('name_street, img_street, img_city')
        .eq('name_city', city)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        // unikátne ulice s obrázkami
        const uniqueStreets: StreetItem[] = Array.from(
          new Map(data.map(item => [item.name_street, item])).values()
        ).map(item => ({
          name_street: item.name_street,
          img_street: item.img_street ?? null,
        }))

        setStreets(uniqueStreets)

        // obrázok mesta (z prvého záznamu)
        setCityImage(data[0].img_city ?? null)
      }

      setLoading(false)
    }

    fetchData()
  }, [city])

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
        <Text style={styles.error}>Chyba: {error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* HEADER mesta */}
      <View style={styles.headerContainer}>
        <Image
          source={{ uri: cityImage ?? 'https://via.placeholder.com/600' }}
          style={styles.image}
        />
        <View style={styles.overlay} />
        <View style={styles.textBox}>
          <Text style={styles.headerTitle}>{city}</Text>
        </View>
      </View>

      {/* STREETS */}
      <View style={styles.list}>
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
              <Image
                source={{ uri: street.img_street ?? 'https://via.placeholder.com/600' }}
                style={styles.image}
              />
              <View style={styles.overlay_street} />
              <View style={styles.textBox}>
                <Text style={styles.cardTitle}>{street.name_street}</Text>
                <Text style={styles.textCity}>{city}</Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  )
}

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  headerContainer: {
    height: 0.18 * height,
    width: '100%',
    position: 'relative',
    marginBottom: 12,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlay_street: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF9627',
    opacity: 0.73,
  },
  textCity: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'medium'
  },
  textBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  card: {
    height: height * 0.15,
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
})
