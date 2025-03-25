-- Grant necessary permissions to supabase_admin
ALTER ROLE supabase_admin SET statement_timeout = '30s';

-- Grant connection permissions
GRANT CONNECT ON DATABASE postgres TO supabase_admin;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO supabase_admin;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;

-- Enable connection pooling for supabase_admin
ALTER ROLE supabase_admin SET pooler.pool_mode = 'transaction';
ALTER ROLE supabase_admin SET pooler.default_pool_size = 20;
ALTER ROLE supabase_admin SET pooler.max_client_conn = 100;

-- Create pgbouncer pool entry if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'pgbouncer'
    ) THEN
        CREATE ROLE pgbouncer;
    END IF;
END
$$;

GRANT supabase_admin TO pgbouncer; 