import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { testNetworkConnection } from '../api/supabaseApi';

export default function TestNetworkScreen() {
  const [networkData, setNetworkData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        const data = await testNetworkConnection();
        setNetworkData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch network data');
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Connection Test</Text>
      
      {loading && (
        <Text style={styles.text}>Loading network data...</Text>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {networkData && (
        <View style={styles.dataContainer}>
          <Text style={styles.subtitle}>Network Data:</Text>
          <Text style={styles.text}>
            {JSON.stringify(networkData, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
  },
  dataContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
}); 