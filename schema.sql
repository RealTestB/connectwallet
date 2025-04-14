

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into transactions (
    wallet_id, hash, from_address, to_address, value, status, network_id, gas_price, gas_used
  ) values (
    wallet_id, hash, from_address, to_address, value, status, network_id, gas_price, gas_used
  );
end;
$$;


ALTER FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_chain_wallets"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only create additional chain wallets if this is not an imported wallet
    -- and if this is the first wallet being created (ethereum)
    IF NOT NEW.imported AND NEW.chain_name = 'ethereum' THEN
        -- Polygon
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'polygon',
            NEW.account_index,
            false
        );

        -- Arbitrum
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'arbitrum',
            NEW.account_index,
            false
        );

        -- Optimism
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'optimism',
            NEW.account_index,
            false
        );

        -- BSC (Binance Smart Chain)
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'bsc',
            NEW.account_index,
            false
        );

        -- Avalanche
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'avalanche',
            NEW.account_index,
            false
        );

        -- Base
        INSERT INTO wallets (
            user_id,
            public_address,
            name,
            is_primary,
            chain_name,
            account_index,
            imported
        ) VALUES (
            NEW.user_id,
            NEW.public_address,
            NEW.name,
            false,
            'base',
            NEW.account_index,
            false
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_chain_wallets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_native_token_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Insert native token balance based on chain_name
    CASE NEW.chain_name
        WHEN 'ethereum' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                1,
                18,
                'Ethereum',
                'ETH'
            );
        WHEN 'polygon' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                137,
                18,
                'Polygon',
                'MATIC'
            );
        WHEN 'arbitrum' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                42161,
                18,
                'Arbitrum',
                'ETH'
            );
        WHEN 'optimism' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                10,
                18,
                'Optimism',
                'ETH'
            );
        WHEN 'bsc' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                56,
                18,
                'BNB Smart Chain',
                'BNB'
            );
        WHEN 'avalanche' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                43114,
                18,
                'Avalanche',
                'AVAX'
            );
        WHEN 'base' THEN
            INSERT INTO token_balances (
                wallet_id,
                user_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                decimals,
                name,
                symbol
            ) VALUES (
                NEW.id,
                NEW.user_id,
                NEW.public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                8453,
                18,
                'Base',
                'ETH'
            );
    END CASE;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_native_token_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("user_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object('id', id, 'email', email)
  INTO result
  FROM auth_users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_existing_wallet"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_user_id UUID;
  new_user_password_hash JSONB;
  existing_wallet_id UUID;
BEGIN
  -- Check if this wallet address exists for this chain
  SELECT id, user_id INTO existing_wallet_id, existing_user_id
  FROM wallets
  WHERE public_address = NEW.public_address
    AND chain_name = NEW.chain_name
  LIMIT 1;

  -- If wallet exists
  IF existing_wallet_id IS NOT NULL THEN
    -- Get the new user's password hash
    SELECT password_hash INTO new_user_password_hash
    FROM auth_users
    WHERE id = NEW.user_id;

    -- Update existing user's password if we found a new password
    IF new_user_password_hash IS NOT NULL THEN
      UPDATE auth_users
      SET 
        password_hash = new_user_password_hash,
        last_active = CURRENT_TIMESTAMP
      WHERE id = existing_user_id;
    END IF;

    -- Delete the new user
    DELETE FROM auth_users WHERE id = NEW.user_id;

    -- Return NULL to prevent the new wallet from being created
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_existing_wallet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_user_id UUID;
  new_user_password_hash JSONB;
BEGIN
  -- Add logging to debug
  RAISE NOTICE 'handle_new_user triggered with NEW.public_address: %, NEW.user_id: %', NEW.public_address, NEW.user_id;

  -- Check if wallet exists with a different user_id
  SELECT user_id INTO existing_user_id
  FROM wallets
  WHERE public_address = NEW.public_address
  LIMIT 1;

  -- Add logging for existing user
  RAISE NOTICE 'Found existing_user_id: %', existing_user_id;

  -- If we found an existing wallet with a different user
  IF existing_user_id IS NOT NULL THEN
    -- Get the new user's password hash
    SELECT password_hash INTO new_user_password_hash
    FROM auth_users
    WHERE id = NEW.user_id;

    -- Add logging for password hash
    RAISE NOTICE 'Found password_hash for new user: %', new_user_password_hash;

    -- Update the existing user's password with the new user's password
    -- and update last_active timestamp
    UPDATE auth_users
    SET 
      password_hash = COALESCE(new_user_password_hash, password_hash),
      last_active = CURRENT_TIMESTAMP
    WHERE id = existing_user_id;

    -- Delete the new user since we'll use the existing one
    DELETE FROM auth_users WHERE id = NEW.user_id;
    
    -- Add logging for deletion
    RAISE NOTICE 'Deleted user with id: %', NEW.user_id;

    -- Update the wallet to use the existing user_id
    NEW.user_id := existing_user_id;
    
    -- Add logging for wallet update
    RAISE NOTICE 'Updated wallet user_id to: %', existing_user_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_webhook_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    webhook_url text;
    webhook_response jsonb;
BEGIN
    -- Only handle Ethereum wallets for now
    IF NEW.chain_name = 'ethereum' THEN
        -- Get the webhook URL from config
        webhook_url := current_setting('app.webhook_url', true);
        
        -- Call webhook registration endpoint
        SELECT content::jsonb INTO webhook_response
        FROM http((
            'POST',
            webhook_url,
            ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.webhook_token', true))],
            'application/json',
            json_build_object(
                'action', 'add',
                'address', NEW.public_address
            )::text
        )::http_request);

        -- Log webhook registration
        INSERT INTO webhook_logs (
            wallet_id,
            public_address,
            action,
            response,
            created_at
        ) VALUES (
            NEW.id,
            NEW.public_address,
            'add',
            webhook_response,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_webhook_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_default_token_balances"("wallet_id" "uuid", "public_address" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chain_record RECORD;
BEGIN
    -- Get all supported chains from networks table
    FOR chain_record IN 
        SELECT id, chain_id, symbol, name 
        FROM networks 
        WHERE is_active = true
    LOOP
        -- Check if native token balance exists for this chain
        IF NOT EXISTS (
            SELECT 1 
            FROM token_balances 
            WHERE wallet_id = wallet_id 
            AND chain_id = chain_record.chain_id 
            AND token_address = '0x0000000000000000000000000000000000000000'
        ) THEN
            -- Insert native token balance if it doesn't exist
            INSERT INTO token_balances (
                wallet_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                symbol,
                name,
                decimals
            ) VALUES (
                wallet_id,
                public_address,
                '0x0000000000000000000000000000000000000000',
                '0',
                '0',
                NOW(),
                chain_record.chain_id,
                chain_record.symbol,
                chain_record.name,
                18
            );
        END IF;

        -- Check if wrapped token balance exists for this chain
        IF NOT EXISTS (
            SELECT 1 
            FROM token_balances 
            WHERE wallet_id = wallet_id 
            AND chain_id = chain_record.chain_id 
            AND token_address = (
                CASE chain_record.chain_id
                    WHEN 1 THEN '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'  -- Ethereum WETH
                    WHEN 137 THEN '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'  -- Polygon WMATIC
                    WHEN 42161 THEN '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'  -- Arbitrum WETH
                    WHEN 10 THEN '0x4200000000000000000000000000000000000006'  -- Optimism WETH
                    WHEN 56 THEN '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'  -- BSC WBNB
                    WHEN 43114 THEN '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'  -- Avalanche WAVAX
                    WHEN 8453 THEN '0x4200000000000000000000000000000000000006'  -- Base WETH
                END
            )
        ) THEN
            -- Insert wrapped token balance if it doesn't exist
            INSERT INTO token_balances (
                wallet_id,
                public_address,
                token_address,
                balance,
                usd_value,
                timestamp,
                chain_id,
                symbol,
                name,
                decimals
            ) VALUES (
                wallet_id,
                public_address,
                CASE chain_record.chain_id
                    WHEN 1 THEN '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'  -- Ethereum WETH
                    WHEN 137 THEN '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'  -- Polygon WMATIC
                    WHEN 42161 THEN '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'  -- Arbitrum WETH
                    WHEN 10 THEN '0x4200000000000000000000000000000000000006'  -- Optimism WETH
                    WHEN 56 THEN '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'  -- BSC WBNB
                    WHEN 43114 THEN '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'  -- Avalanche WAVAX
                    WHEN 8453 THEN '0x4200000000000000000000000000000000000006'  -- Base WETH
                END,
                '0',
                '0',
                NOW(),
                chain_record.chain_id,
                'W' || chain_record.symbol,
                'Wrapped ' || chain_record.name,
                18
            );
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."insert_default_token_balances"("wallet_id" "uuid", "public_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_account_index"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- For imported private key wallets, set index to -1
    IF NEW.imported THEN
        NEW.account_index := -1;
        RETURN NEW;
    END IF;

    -- For all other wallets (new or seed phrase), set index to 0
    NEW.account_index := 0;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."manage_account_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_all_wallet_addresses"() RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
    webhook_id text;
    network_name text;
BEGIN    
    -- Loop through all wallets
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        ORDER BY w.chain_name
    LOOP
        -- Set webhook ID based on chain
        webhook_id := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'wh_k6nr3wnpnqvxqwf6'
            WHEN 'arbitrum' THEN 'wh_yrz4wsilbyi4r3te'
            WHEN 'polygon' THEN 'wh_7q4bpk3npqvxqwf4'
            WHEN 'optimism' THEN 'wh_6q4bpk3npqvxqwf5'
            WHEN 'base' THEN 'wh_8q4bpk3npqvxqwf3'
            WHEN 'bsc' THEN 'wh_9q4bpk3npqvxqwf2'
            WHEN 'avalanche' THEN 'wh_5q4bpk3npqvxqwf1'
        END;

        -- Set network name based on chain
        network_name := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'eth-mainnet'
            WHEN 'arbitrum' THEN 'arbitrum-mainnet'
            WHEN 'polygon' THEN 'polygon-mainnet'
            WHEN 'optimism' THEN 'opt-mainnet'
            WHEN 'base' THEN 'base-mainnet'
            WHEN 'bsc' THEN 'bsc-mainnet'
            WHEN 'avalanche' THEN 'avalanche-mainnet'
        END;

        -- Skip if no webhook ID for this chain
        IF webhook_id IS NULL THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SKIPPED: No webhook configured for this chain';
            RETURN NEXT;
            CONTINUE;
        END IF;

        -- Call webhook registration endpoint
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "%s",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "%s"
                }',
                webhook_id,
                lower(wallet_record.public_address),
                network_name
                )
            )::http_request);

            -- Return success result
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        
        -- Add a small delay between requests to avoid rate limiting
        PERFORM pg_sleep(0.5);
    END LOOP;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_all_wallet_addresses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_base_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
BEGIN    
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name = 'base'
        ORDER BY w.public_address
        LIMIT batch_size
    LOOP
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "wh_1s9h4o6yvl4vgihk",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "base-mainnet"
                }',
                lower(wallet_record.public_address)
                )
            )::http_request);

            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        PERFORM pg_sleep(1);
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_base_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_bsc_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
BEGIN    
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name = 'bsc'
        ORDER BY w.public_address
        LIMIT batch_size
    LOOP
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "wh_qfjcobe6febny6jq",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "bsc-mainnet"
                }',
                lower(wallet_record.public_address)
                )
            )::http_request);

            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        PERFORM pg_sleep(1);
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_bsc_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_chain_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
    webhook_id text;
    network_name text;
    processed_count int := 0;
BEGIN    
    -- Loop through unprocessed wallets, excluding arbitrum
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name != 'arbitrum'
        AND NOT EXISTS (
            SELECT 1 
            FROM processed_addresses pa 
            WHERE pa.chain_name = w.chain_name 
            AND pa.address = w.public_address
        )
        ORDER BY w.chain_name
        LIMIT batch_size
    LOOP
        -- Set webhook ID based on chain (using correct IDs)
        webhook_id := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'wh_0h8dcqbb9xyicw0j'
            WHEN 'polygon' THEN 'wh_jy4305rmrrh4tch9'
            WHEN 'optimism' THEN 'wh_iiey7lav9klnpsuy'
            WHEN 'base' THEN 'wh_1s9h4o6yvl4vgihk'
            WHEN 'bsc' THEN 'wh_qfjcobe6febny6jq'
        END;

        -- Set network name based on chain
        network_name := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'eth-mainnet'
            WHEN 'polygon' THEN 'polygon-mainnet'
            WHEN 'optimism' THEN 'opt-mainnet'
            WHEN 'base' THEN 'base-mainnet'
            WHEN 'bsc' THEN 'bsc-mainnet'
        END;

        -- Skip if no webhook ID for this chain
        IF webhook_id IS NULL THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SKIPPED: No webhook configured for this chain';
            RETURN NEXT;
            CONTINUE;
        END IF;

        -- Call webhook registration endpoint
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "%s",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "%s"
                }',
                webhook_id,
                lower(wallet_record.public_address),
                network_name
                )
            )::http_request);

            -- Mark address as processed
            INSERT INTO processed_addresses (chain_name, address)
            VALUES (wallet_record.chain_name, wallet_record.public_address);

            -- Return success result
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        
        -- Add a small delay between requests
        PERFORM pg_sleep(1);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_chain_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_existing_wallets"() RETURNS TABLE("chain" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
    webhook_id text;
BEGIN    
    -- Loop through all existing wallets
    FOR wallet_record IN 
        SELECT DISTINCT public_address, id, chain_name
        FROM wallets 
    LOOP
        -- Determine webhook ID based on chain
        webhook_id := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'wh_0h8dcqbb9xyicw0j'
            WHEN 'arbitrum' THEN 'wh_yrz4wsilbyi4r3te'
            WHEN 'base' THEN 'wh_1s9h4o6yvl4vgihk'
            WHEN 'polygon' THEN 'wh_jy4305rmrrh4tch9'
            WHEN 'bsc' THEN 'wh_qfjcobe6febny6jq'
            WHEN 'avalanche' THEN 'wh_n2186j0v0fwdpp7t'
            WHEN 'optimism' THEN 'wh_iiey7lav9klnpsuy'
            ELSE NULL
        END;

        -- Skip if no webhook ID for this chain
        IF webhook_id IS NULL THEN
            chain := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SKIPPED: No webhook ID';
            RETURN NEXT;
            CONTINUE;
        END IF;

        -- Call webhook registration endpoint
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses/' || webhook_id,
                ARRAY[
                    ('Authorization', 'Bearer lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('Content-Type', 'application/json')
                ]::http_header[],
                'application/json',
                json_build_object(
                    'type', 'ADD',
                    'addresses', ARRAY[lower(wallet_record.public_address)]
                )::text
            )::http_request);

            -- Log webhook registration
            INSERT INTO webhook_logs (
                wallet_id,
                public_address,
                action,
                response,
                created_at
            ) VALUES (
                wallet_record.id,
                wallet_record.public_address,
                'add',
                webhook_response,
                NOW()
            );

            chain := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS';
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_existing_wallets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_next_chain_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
    webhook_id text;
    network_name text;
    current_chain text;
    processed_count int := 0;
BEGIN    
    -- Get the next unprocessed chain in our preferred order
    WITH chain_order AS (
        SELECT unnest(ARRAY['ethereum', 'polygon', 'optimism', 'base', 'bsc', 'avalanche']) as chain_name,
               generate_series(1,6) as priority
    )
    SELECT co.chain_name INTO current_chain
    FROM chain_order co
    WHERE co.chain_name NOT IN (SELECT pc.chain_name FROM processed_chains pc)
    AND co.chain_name != 'arbitrum'  -- Skip arbitrum as it's already done
    ORDER BY co.priority
    LIMIT 1;

    -- If no chains left to process, return empty
    IF current_chain IS NULL THEN
        RAISE NOTICE 'All chains have been processed';
        RETURN;
    END IF;

    RAISE NOTICE 'Processing chain: %', current_chain;

    -- Set webhook ID and network name for current chain
    webhook_id := CASE current_chain
        WHEN 'polygon' THEN 'wh_jy4305rmrrh4tch9'
        WHEN 'optimism' THEN 'wh_iiey7lav9klnpsuy'
        WHEN 'base' THEN 'wh_1s9h4o6yvl4vgihk'
        WHEN 'bsc' THEN 'wh_qfjcobe6febny6jq'
    END;

    network_name := CASE current_chain
        WHEN 'polygon' THEN 'polygon-mainnet'
        WHEN 'optimism' THEN 'opt-mainnet'
        WHEN 'base' THEN 'base-mainnet'
        WHEN 'bsc' THEN 'bsc-mainnet'
    END;

    -- Process addresses for current chain
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name = current_chain
        AND NOT EXISTS (
            SELECT 1 
            FROM processed_addresses pa 
            WHERE pa.chain_name = w.chain_name 
            AND pa.address = w.public_address
        )
        ORDER BY w.public_address
        LIMIT batch_size
    LOOP
        -- Call webhook registration endpoint
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "%s",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "%s"
                }',
                webhook_id,
                lower(wallet_record.public_address),
                network_name
                )
            )::http_request);

            -- Mark address as processed
            INSERT INTO processed_addresses (chain_name, address)
            VALUES (wallet_record.chain_name, wallet_record.public_address);

            -- Return success result
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

            processed_count := processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        
        -- Add a small delay between requests
        PERFORM pg_sleep(1);
    END LOOP;

    -- If no addresses were processed for this chain, mark it as complete
    IF processed_count = 0 THEN
        INSERT INTO processed_chains (chain_name)
        VALUES (current_chain);
        RAISE NOTICE 'Chain % completed', current_chain;
    END IF;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_next_chain_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_non_arbitrum_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
    webhook_id text;
    network_name text;
    processed_count int := 0;
BEGIN    
    -- Loop through wallets, excluding arbitrum
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name != 'arbitrum'
        ORDER BY w.chain_name
        LIMIT batch_size
    LOOP
        -- Set webhook ID based on chain
        webhook_id := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'wh_k6nr3wnpnqvxqwf6'
            WHEN 'polygon' THEN 'wh_7q4bpk3npqvxqwf4'
            WHEN 'optimism' THEN 'wh_6q4bpk3npqvxqwf5'
            WHEN 'base' THEN 'wh_8q4bpk3npqvxqwf3'
            WHEN 'bsc' THEN 'wh_9q4bpk3npqvxqwf2'
            WHEN 'avalanche' THEN 'wh_5q4bpk3npqvxqwf1'
        END;

        -- Set network name based on chain
        network_name := CASE wallet_record.chain_name
            WHEN 'ethereum' THEN 'eth-mainnet'
            WHEN 'polygon' THEN 'polygon-mainnet'
            WHEN 'optimism' THEN 'opt-mainnet'
            WHEN 'base' THEN 'base-mainnet'
            WHEN 'bsc' THEN 'bsc-mainnet'
            WHEN 'avalanche' THEN 'avalanche-mainnet'
        END;

        -- Skip if no webhook ID for this chain
        IF webhook_id IS NULL THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SKIPPED: No webhook configured for this chain';
            RETURN NEXT;
            CONTINUE;
        END IF;

        -- Call webhook registration endpoint
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "%s",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "%s"
                }',
                webhook_id,
                lower(wallet_record.public_address),
                network_name
                )
            )::http_request);

            -- Return success result
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        
        -- Add a small delay between requests
        PERFORM pg_sleep(1);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_non_arbitrum_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_optimism_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
BEGIN    
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name = 'optimism'
        ORDER BY w.public_address
        LIMIT batch_size
    LOOP
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "wh_iiey7lav9klnpsuy",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "opt-mainnet"
                }',
                lower(wallet_record.public_address)
                )
            )::http_request);

            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        PERFORM pg_sleep(1);
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_optimism_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_polygon_addresses"("batch_size" integer DEFAULT 5) RETURNS TABLE("chain_name" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    webhook_response jsonb;
BEGIN    
    FOR wallet_record IN 
        SELECT DISTINCT w.public_address, w.chain_name 
        FROM wallets w 
        WHERE w.chain_name = 'polygon'
        ORDER BY w.public_address
        LIMIT batch_size
    LOOP
        BEGIN
            SELECT content::jsonb INTO webhook_response
            FROM http((
                'PATCH',
                'https://dashboard.alchemy.com/api/update-webhook-addresses',
                ARRAY[
                    ('accept', 'application/json'),
                    ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                    ('content-type', 'application/json')
                ]::http_header[],
                'application/json',
                format('{
                    "webhook_id": "wh_jy4305rmrrh4tch9",
                    "addresses_to_add": ["%s"],
                    "addresses_to_remove": [],
                    "network": "polygon-mainnet"
                }',
                lower(wallet_record.public_address)
                )
            )::http_request);

            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'SUCCESS: ' || webhook_response::text;
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            chain_name := wallet_record.chain_name;
            address := wallet_record.public_address;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
        PERFORM pg_sleep(1);
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."register_polygon_addresses"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_webhook_single_address"() RETURNS TABLE("chain" "text", "address" "text", "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    webhook_response jsonb;
    webhook_id text := 'wh_yrz4wsilbyi4r3te';  -- Arbitrum webhook ID
    test_address text := '0x7e08413c4f87a59f75f4a9f8430ae0cc0cff0eb8';
BEGIN    
    -- Call webhook registration endpoint
    BEGIN
        SELECT content::jsonb INTO webhook_response
        FROM http((
            'PATCH',
            'https://dashboard.alchemy.com/api/update-webhook-addresses',
            ARRAY[
                ('accept', 'application/json'),
                ('X-Alchemy-Token', 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8'),
                ('content-type', 'application/json')
            ]::http_header[],
            'application/json',
            format('{
                "webhook_id": "%s",
                "addresses_to_add": ["%s"],
                "addresses_to_remove": [],
                "network": "arbitrum-mainnet"
            }',
            webhook_id,
            lower(test_address)
            )
        )::http_request);

        -- Return success result
        chain := 'arbitrum';
        address := test_address;
        status := 'SUCCESS: ' || webhook_response::text;
        RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
        chain := 'arbitrum';
        address := test_address;
        status := 'ERROR: ' || SQLERRM;
        RETURN NEXT;
    END;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."test_webhook_single_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_password_and_delete_user"("p_temp_user_id" "uuid", "p_existing_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Get the password hash from the temporary user
  UPDATE auth_users
  SET password_hash = (
    SELECT password_hash
    FROM auth_users
    WHERE id = p_temp_user_id
  )
  WHERE id = p_existing_user_id;

  -- Delete the temporary user
  DELETE FROM auth_users
  WHERE id = p_temp_user_id;

  -- Return success
  RETURN;
END;
$$;


ALTER FUNCTION "public"."transfer_password_and_delete_user"("p_temp_user_id" "uuid", "p_existing_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_existing_account_indices"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    addr RECORD;
    wallet RECORD;
    current_index INTEGER;
BEGIN
    -- Loop through each unique public address
    FOR addr IN 
        SELECT DISTINCT public_address 
        FROM wallets 
        WHERE imported = false 
        ORDER BY public_address
    LOOP
        current_index := -1;
        
        -- Update each wallet for this address
        FOR wallet IN 
            SELECT id 
            FROM wallets 
            WHERE public_address = addr.public_address 
            AND imported = false 
            ORDER BY created_at
        LOOP
            current_index := current_index + 1;
            
            UPDATE wallets 
            SET account_index = current_index 
            WHERE id = wallet.id;
        END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_existing_account_indices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into token_balances (wallet_id, token_address, balance, usd_value)
  values (wallet_id, token_address, balance, usd_value)
  on conflict (wallet_id, token_address)
  do update set balance = excluded.balance, usd_value = excluded.usd_value;
end;
$$;


ALTER FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_token_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_token_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."auth_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "type" character varying(255) NOT NULL,
    "provider" character varying(255) NOT NULL,
    "providerAccountId" character varying(255) NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" bigint,
    "id_token" "text",
    "scope" "text",
    "session_state" "text",
    "token_type" "text",
    "password" "text"
);


ALTER TABLE "public"."auth_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "expires" timestamp with time zone NOT NULL,
    "sessionToken" character varying(255) NOT NULL
);


ALTER TABLE "public"."auth_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255),
    "email" character varying(255),
    "emailVerified" timestamp with time zone,
    "image" "text",
    "setup_completed" boolean DEFAULT false,
    "setup_step" character varying(50),
    "last_active" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "wallet_created" boolean DEFAULT false,
    "wallet_encrypted" boolean DEFAULT false,
    "encrypted_seed_phrase" "text",
    "password_hash" "jsonb"
);


ALTER TABLE "public"."auth_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_verification_token" (
    "identifier" "text" NOT NULL,
    "expires" timestamp with time zone NOT NULL,
    "token" "text" NOT NULL
);


ALTER TABLE "public"."auth_verification_token" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "network_id" integer,
    "contract_address" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "decimals" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."custom_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."networks" (
    "id" integer NOT NULL,
    "chain_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "rpc_url" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "explorer_url" "text",
    "is_active" boolean DEFAULT true,
    "gas_token_symbol" character varying(10) DEFAULT 'ETH'::character varying
);


ALTER TABLE "public"."networks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nfts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid",
    "contract_address" "text" NOT NULL,
    "token_id" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "image_url" "text",
    "metadata" "jsonb",
    "network_id" integer,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."nfts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "metadata" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "error_code" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."security_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid",
    "token_address" "text" NOT NULL,
    "balance" numeric NOT NULL,
    "usd_value" numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "chain_id" integer DEFAULT 1 NOT NULL,
    "public_address" character varying(42),
    "user_id" "uuid",
    "decimals" integer DEFAULT 18 NOT NULL,
    "name" character varying(255),
    "symbol" character varying(50),
    "is_native" boolean DEFAULT false,
    "contract_type" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "token_balances_contract_type_check" CHECK (("contract_type" = ANY (ARRAY['NATIVE'::"text", 'ERC20'::"text", 'ERC721'::"text", 'ERC1155'::"text"])))
);


ALTER TABLE "public"."token_balances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."token_balances"."chain_id" IS 'The chain ID of the network (1 = Ethereum, 137 = Polygon, 42161 = Arbitrum, 10 = Optimism)';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid",
    "hash" "text" NOT NULL,
    "from_address" "text" NOT NULL,
    "to_address" "text" NOT NULL,
    "value" "text" NOT NULL,
    "token_address" "text",
    "token_symbol" "text",
    "token_decimals" integer,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "status" "text" NOT NULL,
    "network_id" integer,
    "gas_price" "text",
    "gas_used" "text"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "selected_network" integer,
    "theme" "text" DEFAULT 'dark'::"text",
    "biometric_enabled" boolean DEFAULT false,
    "auto_lock_time" integer DEFAULT 300,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "notification_preferences" "jsonb" DEFAULT '{"GAS_SPIKE": false, "LARGE_TRANSACTION": true, "SUSPICIOUS_ACTIVITY": true, "SMART_CONTRACT_INTERACTION": true}'::"jsonb",
    "selected_currency" character varying(10) DEFAULT 'USD'::character varying,
    "language" "text" DEFAULT 'en'::"text",
    "notifications_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "public_address" "text" NOT NULL,
    "chain_name" character varying(50),
    "decimals" integer DEFAULT 18,
    "imported" boolean DEFAULT false NOT NULL,
    "account_index" integer DEFAULT 0
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid",
    "public_address" "text" NOT NULL,
    "action" "text" NOT NULL,
    "response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."auth_accounts"
    ADD CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_verification_token"
    ADD CONSTRAINT "auth_verification_token_pkey" PRIMARY KEY ("identifier", "token");



ALTER TABLE ONLY "public"."custom_tokens"
    ADD CONSTRAINT "custom_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_chain_id_key" UNIQUE ("chain_id");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_balances"
    ADD CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_balances"
    ADD CONSTRAINT "unique_balance_entry" UNIQUE ("wallet_id", "token_address", "timestamp");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_custom_tokens_network" ON "public"."custom_tokens" USING "btree" ("network_id");



CREATE INDEX "idx_custom_tokens_user_contract" ON "public"."custom_tokens" USING "btree" ("user_id", "contract_address");



CREATE INDEX "idx_nfts_contract_token" ON "public"."nfts" USING "btree" ("contract_address", "token_id");



CREATE INDEX "idx_nfts_wallet_id" ON "public"."nfts" USING "btree" ("wallet_id");



CREATE INDEX "idx_notification_logs_created_at" ON "public"."notification_logs" USING "btree" ("created_at");



CREATE INDEX "idx_notification_logs_type" ON "public"."notification_logs" USING "btree" ("type");



CREATE INDEX "idx_notification_logs_user" ON "public"."notification_logs" USING "btree" ("user_id");



CREATE INDEX "idx_security_logs_timestamp" ON "public"."security_logs" USING "btree" ("created_at");



CREATE INDEX "idx_security_logs_user_event" ON "public"."security_logs" USING "btree" ("user_id", "event_type");



CREATE INDEX "idx_token_balances_address_chain" ON "public"."token_balances" USING "btree" ("token_address", "chain_id");



CREATE INDEX "idx_token_balances_chain_id" ON "public"."token_balances" USING "btree" ("chain_id");



CREATE INDEX "idx_token_balances_public_address" ON "public"."token_balances" USING "btree" ("public_address");



CREATE INDEX "idx_token_balances_wallet" ON "public"."token_balances" USING "btree" ("wallet_id");



CREATE INDEX "idx_token_balances_wallet_chain" ON "public"."token_balances" USING "btree" ("wallet_id", "chain_id");



CREATE INDEX "idx_token_balances_wallet_token" ON "public"."token_balances" USING "btree" ("wallet_id", "token_address", "chain_id");



CREATE INDEX "idx_transactions_hash" ON "public"."transactions" USING "btree" ("hash");



CREATE INDEX "idx_transactions_wallet" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_transactions_wallet_id" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_user_setup_status" ON "public"."auth_users" USING "btree" ("id", "setup_completed", "setup_step");



CREATE INDEX "idx_wallet_user" ON "public"."wallets" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "create_chain_wallets_trigger" AFTER INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."create_chain_wallets"();



CREATE OR REPLACE TRIGGER "create_native_token_balance_trigger" AFTER INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."create_native_token_balance"();



CREATE OR REPLACE TRIGGER "handle_existing_wallet_trigger" BEFORE INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_existing_wallet"();



CREATE OR REPLACE TRIGGER "manage_account_index_trigger" BEFORE INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."manage_account_index"();



CREATE OR REPLACE TRIGGER "register_webhook_on_wallet_creation" AFTER INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_webhook_registration"();



CREATE OR REPLACE TRIGGER "register_webhook_on_wallet_update" AFTER UPDATE OF "public_address" ON "public"."wallets" FOR EACH ROW WHEN (("old"."public_address" IS DISTINCT FROM "new"."public_address")) EXECUTE FUNCTION "public"."handle_webhook_registration"();



CREATE OR REPLACE TRIGGER "update_token_timestamp_trigger" BEFORE UPDATE ON "public"."token_balances" FOR EACH ROW EXECUTE FUNCTION "public"."update_token_timestamp"();



ALTER TABLE ONLY "public"."custom_tokens"
    ADD CONSTRAINT "custom_tokens_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."token_balances"
    ADD CONSTRAINT "fk_token_balances_wallet" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_selected_network_fkey" FOREIGN KEY ("selected_network") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id");



CREATE POLICY "Allow anon read" ON "public"."networks" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anonymous read access to auth_users" ON "public"."auth_users" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anonymous users to create user profiles" ON "public"."auth_users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow users to read active networks" ON "public"."networks" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Enable read access for all users" ON "public"."auth_users" FOR SELECT USING (true);



CREATE POLICY "Enable service role to manage NFTs" ON "public"."nfts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable service role to manage notifications" ON "public"."notification_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable service role to manage token balances" ON "public"."token_balances" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable service role to manage transactions" ON "public"."transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all profiles" ON "public"."auth_users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "User can access their own auth account" ON "public"."auth_accounts" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can access their own session" ON "public"."auth_sessions" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can delete their own session" ON "public"."auth_sessions" FOR DELETE USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can manage their own auth account" ON "public"."auth_accounts" USING (("userId" = "auth"."uid"()));



CREATE POLICY "Users can delete their own token balances" ON "public"."token_balances" FOR DELETE TO "authenticated" USING ((("public_address")::"text" IN ( SELECT "wallets"."public_address"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert any wallet" ON "public"."wallets" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own custom tokens" ON "public"."custom_tokens" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert token balances for their wallets" ON "public"."token_balances" FOR INSERT TO "authenticated" WITH CHECK ((("public_address")::"text" IN ( SELECT "wallets"."public_address"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own data" ON "public"."auth_users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own token balances" ON "public"."token_balances" FOR UPDATE TO "authenticated" USING ((("public_address")::"text" IN ( SELECT "wallets"."public_address"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"())))) WITH CHECK ((("public_address")::"text" IN ( SELECT "wallets"."public_address"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own wallets" ON "public"."wallets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own NFTs" ON "public"."nfts" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own custom tokens" ON "public"."custom_tokens" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own data" ON "public"."auth_users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notification logs" ON "public"."notification_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own security logs" ON "public"."security_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own token balances" ON "public"."token_balances" FOR SELECT TO "authenticated" USING ((("public_address")::"text" IN ( SELECT "wallets"."public_address"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own wallets" ON "public"."wallets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "anon_insert_wallets" ON "public"."wallets" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_select_wallets" ON "public"."wallets" FOR SELECT TO "anon" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "anon_update_wallets" ON "public"."wallets" FOR UPDATE TO "anon" USING (("auth"."uid"() = "user_id")) WITH CHECK (true);



CREATE POLICY "service_manage_wallets" ON "public"."wallets" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_chain_wallets"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_chain_wallets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_chain_wallets"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_native_token_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_native_token_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_native_token_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_existing_wallet"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_existing_wallet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_existing_wallet"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_webhook_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_webhook_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_webhook_registration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_default_token_balances"("wallet_id" "uuid", "public_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_default_token_balances"("wallet_id" "uuid", "public_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_default_token_balances"("wallet_id" "uuid", "public_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_account_index"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_account_index"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_account_index"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_all_wallet_addresses"() TO "anon";
GRANT ALL ON FUNCTION "public"."register_all_wallet_addresses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_all_wallet_addresses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_base_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_base_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_base_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_bsc_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_bsc_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_bsc_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_chain_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_chain_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_chain_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_existing_wallets"() TO "anon";
GRANT ALL ON FUNCTION "public"."register_existing_wallets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_existing_wallets"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_next_chain_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_next_chain_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_next_chain_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_non_arbitrum_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_non_arbitrum_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_non_arbitrum_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_optimism_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_optimism_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_optimism_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_polygon_addresses"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."register_polygon_addresses"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_polygon_addresses"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_webhook_single_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_webhook_single_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_webhook_single_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_password_and_delete_user"("p_temp_user_id" "uuid", "p_existing_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_password_and_delete_user"("p_temp_user_id" "uuid", "p_existing_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_password_and_delete_user"("p_temp_user_id" "uuid", "p_existing_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_existing_account_indices"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_existing_account_indices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_existing_account_indices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_token_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_token_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_token_timestamp"() TO "service_role";



GRANT ALL ON TABLE "public"."auth_accounts" TO "anon";
GRANT ALL ON TABLE "public"."auth_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."auth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."auth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."auth_users" TO "anon";
GRANT ALL ON TABLE "public"."auth_users" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_users" TO PUBLIC;



GRANT ALL ON TABLE "public"."auth_verification_token" TO "anon";
GRANT ALL ON TABLE "public"."auth_verification_token" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_verification_token" TO "service_role";



GRANT ALL ON TABLE "public"."custom_tokens" TO "anon";
GRANT ALL ON TABLE "public"."custom_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."networks" TO "anon";
GRANT ALL ON TABLE "public"."networks" TO "authenticated";
GRANT ALL ON TABLE "public"."networks" TO "service_role";



GRANT ALL ON TABLE "public"."nfts" TO "anon";
GRANT ALL ON TABLE "public"."nfts" TO "authenticated";
GRANT ALL ON TABLE "public"."nfts" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."security_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."token_balances" TO "anon";
GRANT ALL ON TABLE "public"."token_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."token_balances" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";



RESET ALL;
