import { supabase } from '../api/supabaseService';

export const updateLastActive = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('user_activity')
        .upsert({ 
          user_id: user.id,
          last_active: new Date().toISOString()
        });

      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update last active:', error);
    return false;
  }
}; 