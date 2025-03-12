import * as SecureStore from 'expo-secure-store';

interface ActivityLog {
  type: 'login' | 'transaction' | 'import' | 'backup' | 'settings';
  timestamp: number;
  details: Record<string, any>;
}

export const logActivity = async (
  type: ActivityLog['type'],
  details: ActivityLog['details']
): Promise<void> => {
  try {
    const log: ActivityLog = {
      type,
      timestamp: Date.now(),
      details,
    };

    // Get existing logs
    const existingLogsStr = await SecureStore.getItemAsync('activityLogs');
    let existingLogs: ActivityLog[] = [];
    
    try {
      if (existingLogsStr) {
        const parsed = JSON.parse(existingLogsStr);
        existingLogs = Array.isArray(parsed) ? parsed : [];
      }
    } catch (parseError) {
      console.error('Failed to parse activity logs:', parseError);
      // Continue with empty array if parsing fails
    }

    // Add new log and keep only last 100 entries
    const updatedLogs = [log, ...existingLogs].slice(0, 100);

    // Store updated logs
    await SecureStore.setItemAsync('activityLogs', JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const getActivityLogs = async (): Promise<ActivityLog[]> => {
  try {
    const logsStr = await SecureStore.getItemAsync('activityLogs');
    return logsStr ? JSON.parse(logsStr) : [];
  } catch (error) {
    console.error('Failed to retrieve activity logs:', error);
    return [];
  }
};

export const clearActivityLogs = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('activityLogs');
  } catch (error) {
    console.error('Failed to clear activity logs:', error);
  }
};

export const updateLastActive = async (): Promise<void> => {
  try {
    const timestamp = Date.now().toString();
    
    // First, ensure we can access SecureStore
    try {
      await SecureStore.getItemAsync('test_key');
    } catch (e) {
      console.warn('SecureStore not ready yet');
      return;
    }

    // Then try to update the last active time
    await SecureStore.setItemAsync('lastActiveTime', timestamp);
    
    // Also update activity logs
    const log: ActivityLog = {
      type: 'login',
      timestamp: parseInt(timestamp),
      details: { action: 'update_last_active' }
    };

    // Get existing logs with proper error handling
    let existingLogs: ActivityLog[] = [];
    try {
      const existingLogsStr = await SecureStore.getItemAsync('activityLogs');
      if (existingLogsStr) {
        const parsed = JSON.parse(existingLogsStr);
        existingLogs = Array.isArray(parsed) ? parsed : [];
      }
    } catch (parseError) {
      console.warn('Failed to parse activity logs:', parseError);
      // Continue with empty array
    }

    // Safely create updated logs
    const updatedLogs = [log, ...existingLogs].slice(0, 100);
    await SecureStore.setItemAsync('activityLogs', JSON.stringify(updatedLogs));
  } catch (error) {
    console.warn('Failed to update last active time:', error);
    // Don't throw the error, just log it
  }
};

export const checkLastActive = async (minutes: number = 30): Promise<boolean> => {
  try {
    const lastActiveStr = await SecureStore.getItemAsync('lastActiveTime');
    if (!lastActiveStr) return false;

    const lastActive = parseInt(lastActiveStr);
    const now = Date.now();
    const diff = now - lastActive;
    const minutesDiff = diff / (1000 * 60);

    return minutesDiff <= minutes;
  } catch (error) {
    console.error('Failed to check last active time:', error);
    return false;
  }
}; 