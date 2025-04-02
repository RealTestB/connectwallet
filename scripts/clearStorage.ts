import AsyncStorage from '@react-native-async-storage/async-storage';

async function main() {
  try {
    console.log('🧹 Starting storage cleanup...');
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('Found keys:', keys);
    
    // Remove all keys
    await AsyncStorage.multiRemove(keys);
    
    console.log('✅ Storage cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear storage:', error);
    process.exit(1);
  }
}

main(); 