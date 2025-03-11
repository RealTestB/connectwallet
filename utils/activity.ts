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
    const existingLogs: ActivityLog[] = existingLogsStr 
      ? JSON.parse(existingLogsStr)
      : [];

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
    await SecureStore.setItemAsync('lastActiveTime', Date.now().toString());
  } catch (error) {
    console.error('Failed to update last active time:', error);
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