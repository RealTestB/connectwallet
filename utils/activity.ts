import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface ActivityLog {
  type: 'login' | 'transaction' | 'import' | 'backup' | 'settings';
  timestamp: number;
  details: Record<string, any>;
}

export const logActivity = async (
  type: ActivityLog['type'],
  details: ActivityLog['details']
): Promise<void> => {
  console.log('[Activity] Logging new activity:', { type, details });
  try {
    const log: ActivityLog = {
      type,
      timestamp: Date.now(),
      details,
    };

    // Get existing logs
    console.log('[Activity] Fetching existing logs from storage');
    const existingLogsStr = await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVITY_LOGS);
    console.log('[Activity] Existing logs found:', !!existingLogsStr);
    
    let existingLogs: ActivityLog[] = [];
    
    try {
      if (existingLogsStr) {
        const parsed = JSON.parse(existingLogsStr);
        if (Array.isArray(parsed)) {
          existingLogs = parsed;
          console.log('[Activity] Successfully parsed existing logs, count:', existingLogs.length);
        } else {
          console.warn('[Activity] Parsed data is not an array, using empty array instead');
        }
      }
    } catch (parseError) {
      console.error('[Activity] Failed to parse activity logs:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        stack: parseError instanceof Error ? parseError.stack : undefined
      });
      // Continue with empty array if parsing fails
    }

    // Add new log and keep only last 100 entries
    // Ensure existingLogs is an array before using spread operator
    const safeExistingLogs = Array.isArray(existingLogs) ? existingLogs : [];
    const updatedLogs = [log, ...safeExistingLogs].slice(0, 100);
    console.log('[Activity] Created updated logs array, count:', updatedLogs.length);

    // Store updated logs
    await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(updatedLogs));
    console.log('[Activity] Successfully stored updated logs');
  } catch (error) {
    console.error('[Activity] Failed to log activity:', error);
    throw error;
  }
};

export const getActivityLogs = async (): Promise<ActivityLog[]> => {
  console.log('[Activity] Retrieving activity logs');
  try {
    const logsStr = await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVITY_LOGS);
    console.log('[Activity] Retrieved logs from storage:', !!logsStr);
    
    if (!logsStr) {
      console.log('[Activity] No logs found in storage, returning empty array');
      return [];
    }

    try {
      const parsed = JSON.parse(logsStr);
      if (Array.isArray(parsed)) {
        console.log('[Activity] Successfully parsed logs, count:', parsed.length);
        return parsed;
      } else {
        console.warn('[Activity] Parsed data is not an array, returning empty array');
        return [];
      }
    } catch (parseError) {
      console.error('[Activity] Failed to parse stored logs:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        stack: parseError instanceof Error ? parseError.stack : undefined
      });
      return [];
    }
  } catch (error) {
    console.error('[Activity] Failed to retrieve activity logs:', error);
    return [];
  }
};

export const clearActivityLogs = async (): Promise<void> => {
  console.log('[Activity] Clearing activity logs');
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVITY_LOGS);
    console.log('[Activity] Successfully cleared activity logs');
  } catch (error) {
    console.error('[Activity] Failed to clear activity logs:', error);
    throw error;
  }
};

export const updateLastActive = async (): Promise<void> => {
  console.log('[Activity] Updating last active time');
  try {
    const timestamp = Date.now().toString();
    
    // First, ensure we can access SecureStore
    try {
      await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
      console.log('[Activity] SecureStore access verified');
    } catch (e) {
      console.warn('[Activity] SecureStore not ready:', {
        error: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined
      });
      return;
    }

    // Then try to update the last active time
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE, timestamp);
    console.log('[Activity] Updated last active timestamp:', timestamp);
    
    // Also update activity logs
    const log: ActivityLog = {
      type: 'login',
      timestamp: parseInt(timestamp),
      details: { action: 'update_last_active' }
    };

    // Get existing logs with proper error handling
    console.log('[Activity] Fetching existing logs for update');
    let existingLogs: ActivityLog[] = [];
    try {
      const existingLogsStr = await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVITY_LOGS);
      if (existingLogsStr) {
        const parsed = JSON.parse(existingLogsStr);
        if (Array.isArray(parsed)) {
          existingLogs = parsed;
          console.log('[Activity] Successfully parsed existing logs for update, count:', existingLogs.length);
        } else {
          console.warn('[Activity] Parsed update data is not an array, using empty array');
        }
      }
    } catch (parseError) {
      console.warn('[Activity] Failed to parse activity logs during update:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        stack: parseError instanceof Error ? parseError.stack : undefined
      });
      // Continue with empty array
    }

    // Safely create updated logs
    const safeExistingLogs = Array.isArray(existingLogs) ? existingLogs : [];
    const updatedLogs = [log, ...safeExistingLogs].slice(0, 100);
    console.log('[Activity] Created updated logs array for update, count:', updatedLogs.length);

    await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(updatedLogs));
    console.log('[Activity] Successfully stored updated activity logs');
  } catch (error) {
    console.warn('[Activity] Failed to update last active time:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't throw the error, just log it
  }
};

export const checkLastActive = async (minutes: number = 30): Promise<boolean> => {
  console.log('[Activity] Checking last active time, threshold minutes:', minutes);
  try {
    const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
    console.log('[Activity] Retrieved last active time:', !!lastActiveStr);
    
    if (!lastActiveStr) {
      console.log('[Activity] No last active time found, returning false');
      return false;
    }

    const lastActive = parseInt(lastActiveStr);
    if (isNaN(lastActive)) {
      console.warn('[Activity] Invalid last active timestamp:', lastActiveStr);
      return false;
    }

    const now = Date.now();
    const diff = now - lastActive;
    const minutesDiff = diff / (1000 * 60);

    console.log('[Activity] Time difference calculation:', {
      lastActive,
      now,
      diffMinutes: minutesDiff,
      isActive: minutesDiff <= minutes
    });

    return minutesDiff <= minutes;
  } catch (error) {
    console.error('[Activity] Failed to check last active time:', {
      minutes,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}; 