import { supabase } from '@/lib/supabase'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { AnimatedCircularProgress } from 'react-native-circular-progress'

type Tank = {
  tank_id: number
  level: number | null
}

type DeviceItem = {
  device_id: string
  device_name: string
  status: string
  tanks: Tank[]
}

const TANK_TYPES: Record<number, string> = { 1: 'Plast', 2: 'Papier', 3: 'Sklo', 4: 'Komunál' }
const TANK_COLORS: Record<number, string> = { 1: '#FFA500', 2: '#FFA500', 3: '#FFA500', 4: '#FF0000' }

export default function StreetDevicesScreen() {
  const { city, street } = useLocalSearchParams<{ city: string; street: string }>()
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null)
  const slideAnim = useState(new Animated.Value(500))[0] // start off-screen

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { data: deviceData, error: deviceError } = await supabase
          .from('bin_full_info')
          .select('*')
          .eq('name_city', city)
          .eq('name_street', street)

        if (deviceError) {
          setError(deviceError.message)
          setLoading(false)
          return
        }

        const devicesWithTanks: DeviceItem[] = await Promise.all(
          (deviceData || []).map(async (device: any) => {
            const { data: tanksData } = await supabase
              .from('tank_status')
              .select('tank_id, level')
              .eq('device_id', device.device_id)

            return {
              device_id: device.device_id,
              device_name: device.device_name,
              status: device.status,
              tanks: tanksData || []
            }
          })
        )
        setDevices(devicesWithTanks)
      } catch (err) {
        console.error(err)
        setError('Chyba pri načítaní dát')
      } finally {
        setLoading(false)
      }
    }

    if (city && street) fetchDevices()
  }, [city, street])

  const openModal = (device: DeviceItem) => {
    setSelectedDevice(device)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start()
  }

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease)
    }).start(() => setSelectedDevice(null))
  }

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />
  if (error) return <Text style={styles.error}>Chyba: {error}</Text>

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{city} – {street}</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.device_id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openModal(item)}>
            <Text style={styles.title}>{item.device_name}</Text>
            <Text style={{ color: 'gray' }}>Status: {item.status}</Text>

            <View style={styles.progressContainer}>
              {item.tanks.map((tank) => (
                <View key={tank.tank_id} style={styles.progressItem}>
                  <AnimatedCircularProgress
                    size={75}
                    width={8}
                    fill={tank.level ?? 0}
                    tintColor={TANK_COLORS[tank.tank_id]}
                    backgroundColor="#FFE5B4"
                  >
                    {() => <Text>{tank.level ?? 0}%</Text>}
                  </AnimatedCircularProgress>
                  <Text style={{ fontSize: 12 }}>{TANK_TYPES[tank.tank_id]}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        )}
      />

      {/* Modal */}
      <Modal visible={!!selectedDevice} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            {selectedDevice && (
              <>
                <Text style={styles.modalTitle}>{selectedDevice.device_name}</Text>
                <Text>Status: {selectedDevice.status}</Text>

                <View style={styles.progressContainer}>
                  {selectedDevice.tanks.map((tank) => (
                    <View key={tank.tank_id} style={styles.progressItem}>
                      <AnimatedCircularProgress
                        size={70}
                        width={10}
                        fill={tank.level ?? 0}
                        tintColor={TANK_COLORS[tank.tank_id]}
                        backgroundColor="#FFE5B4"
                      >
                        {() => <Text>{tank.level ?? 0}%</Text>}
                      </AnimatedCircularProgress>
                      <Text style={{ fontSize: 14 }}>{TANK_TYPES[tank.tank_id]}</Text>
                    </View>
                  ))}
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <Pressable style={[styles.button, styles.editButton]} onPress={() => alert('Upraviť!')}>
                    <Text style={styles.buttonText}>Upraviť</Text>
                  </Pressable>
                  <Pressable style={[styles.button, styles.closeButton]} onPress={closeModal}>
                    <Text style={styles.buttonText}>Zatvoriť</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: 'black' },
  card: { padding: 15, backgroundColor: 'white', borderRadius: 12, marginBottom: 12 },
  title: { color: 'black', fontSize: 18, fontWeight: 'bold' },
  progressContainer: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap',alignItems: 'center', justifyContent: 'center', },
  progressItem: { alignItems: 'center', marginRight: 10, marginBottom: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 50,
    paddingTop: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 20
},
button: {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  alignItems: 'center',
  marginHorizontal: 5
},
editButton: {
  backgroundColor: '#007AFF'
},
closeButton: {
  backgroundColor: '#FF3B30'
},
buttonText: {
  color: 'white',
  fontWeight: 'bold'
}

})
