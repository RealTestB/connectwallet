import { supabase } from '../lib/supabase';

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...');
    
    // List all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }
    
    console.log('Found tables:', tables?.map(t => t.table_name));
    
    // For each table, get its columns
    for (const table of tables || []) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);
        
      if (columnsError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        continue;
      }
      
      console.log(`\nTable: ${table.table_name}`);
      console.log('Columns:', columns);
    }
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDatabaseStructure(); 