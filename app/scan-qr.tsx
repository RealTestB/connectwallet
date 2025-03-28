import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../styles/shared';

export default function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();
  const device = useCameraDevice('back');

  useEffect(() => {
    const getPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
    };
    getPermission();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      const data = codes[0]?.value;
      if (data && data.match(/^0x[a-fA-F0-9]{40}$/)) {
        router.push({
          pathname: '/pay',
          params: { scannedAddress: data }
        });
      } else {
        alert('Invalid Ethereum address QR code');
      }
    }
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={24} color={COLORS.white} />
      </TouchableOpacity>

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.instructions}>
          Scan a QR code containing an Ethereum address
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    marginBottom: SPACING.lg,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.lg,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    margin: SPACING.lg,
  },
  instructions: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: SPACING.lg,
    opacity: 0.8,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 