import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function JoinCompanyScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinCompany = async () => {
    if (!code.trim()) return;

    setLoading(true);

    const { error } = await supabase.rpc('join_company', {
      p_code: code.toUpperCase(),
    });

    setLoading(false);

    if (error) {
      console.log(error.message);
      return;
    }

    // ✅ AUTO RELOAD APPKY
    router.replace('/(user)/menu');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pripojenie ku spoločnosti</Text>

      <TextInput
        style={styles.input}
        placeholder="Zadaj kód spoločnosti"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleJoinCompany}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Pripojiť sa</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF9627',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FF9627',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 3,
  },
  button: {
    backgroundColor: '#FF9627',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
