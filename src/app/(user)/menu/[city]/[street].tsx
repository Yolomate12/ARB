import { supabase } from '@/lib/supabase'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type StreetItem = {
  name_street: string
  onlineCount: number
  offlineCount: number
}

export default function StreetListScreen() {
  const { city } = useLocalSearchParams<{ city: string }>()
  const [streets, setStreets] = useState<StreetItem[]>([])
  const [filteredStreets, setFilteredStreets] = useState<StreetItem[]>([])
  const [organisationName, setOrganisationName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!city) return

    const fetchData = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('bin_full_info')
        .select('name_street, status, nazov_org')
        .eq('name_city', city)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        // Nastavenie názvu organizácie
        const firstOrg = data.find(d => d.nazov_org)?.nazov_org ?? null
        setOrganisationName(firstOrg)

        // Spočítanie online/offline zariadení pre každú ulicu
        const streetCounts: Record<string, { onlineCount: number; offlineCount: number }> = {}

        data.forEach(item => {
          if (!streetCounts[item.name_street]) {
            streetCounts[item.name_street] = { onlineCount: 0, offlineCount: 0 }
          }
          if (item.status === 'online') {
            streetCounts[item.name_street].onlineCount += 1
          } else {
            streetCounts[item.name_street].offlineCount += 1
          }
        })

        const uniqueStreets: StreetItem[] = Object.entries(streetCounts).map(([name_street, counts]) => ({
          name_street,
          onlineCount: counts.onlineCount,
          offlineCount: counts.offlineCount,
        }))

        setStreets(uniqueStreets)
        setFilteredStreets(uniqueStreets)
      }

      setLoading(false)
    }

    fetchData()
  }, [city])

  // Filter ulíc podľa search inputu
  useEffect(() => {
    if (!search) {
      setFilteredStreets(streets)
    } else {
      const filtered = streets.filter(street =>
        street.name_street.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredStreets(filtered)
    }
  }, [search, streets])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF9627" />
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Hľadaj ulicu..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* HEADER: Organizácia / Mesto */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {organisationName ? `${organisationName} / ${city}` : city}
        </Text>
      </View>

      {/* Zoznam ulíc */}
      <View style={styles.list}>
        {filteredStreets.map(street => (
          <Link
            key={street.name_street}
            href={{
              pathname: '/(user)/menu/[city]/[street]/devices',
              params: { city, street: street.name_street },
            }}
            asChild
          >
            <Pressable style={styles.card}>
              {/* Ľavá časť s ikonou */}
              <View style={styles.leftBox}>
                <FontAwesome name="map-marker" size={24} color="white" />
              </View>

              {/* Pravá časť s info */}
              <View style={styles.rightBox}>
                <Text style={styles.streetName}>{street.name_street}</Text>
                <Text style={styles.statusText}>
                  Online: {street.onlineCount} | Offline: {street.offlineCount}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  )
}

const { width, height } = Dimensions.get('window')
const scale = width / 375

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'white',
    paddingBottom: 20,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    height: 50,
    fontSize: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    paddingHorizontal: 16,
    backgroundColor: '#F6F6F6',
    color: '#1E1E1E',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E',
    opacity: 0.5,
  },
  list: {
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    height: height * 0.10,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f3f3f3',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  leftBox: {
    width: '25%',
    backgroundColor: '#FF9627',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightBox: {
    width: '75%',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  streetName: {
    fontSize: 16 * scale,
    fontWeight: '800',
    color: 'black',
  },
  statusText: {
    fontSize: 14 * scale,
    color: '#666',
    marginTop: 2,
  },
})
