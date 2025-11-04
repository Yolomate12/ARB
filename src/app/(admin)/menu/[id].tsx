import { supabase } from '@/lib/supabase'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

type KosItem = {
  id: number
  nazov: string
  miesto: string
  popis?: string
  stav?: string
}

export default function KosDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [kos, setKos] = useState<KosItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKos = async () => {
      const { data, error } = await supabase
        .from('Kos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) setError(error.message)
      else setKos(data)
      setLoading(false)
    }

    fetchKos()
  }, [id])

  if (loading) return <ActivityIndicator size="large" color="#007AFF" />
  if (error) return <Text>Chyba: {error}</Text>
  if (!kos) return <Text>Koš sa nenašiel</Text>

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: kos.nazov }} />
      <Text style={styles.title}>{kos.nazov}</Text>
      <Text style={styles.label}>Miesto: {kos.miesto}</Text>
      {kos.popis && <Text style={styles.text}>{kos.popis}</Text>}
      {kos.stav && <Text style={styles.text}>Stav: {kos.stav}</Text>}
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
