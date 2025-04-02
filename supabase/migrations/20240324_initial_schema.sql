-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create tables
CREATE TABLE IF NOT EXISTS "public"."auth_accounts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "type" text NOT NULL,
    "provider" text NOT NULL,
    "provider_account_id" text NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" bigint,
    "token_type" text,
    "scope" text,
    "id_token" text,
    "session_state" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."auth_sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "factor_id" uuid,
    "aal" aal_level,
    "not_after" timestamp with time zone,
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."auth_users" (
    "id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" text NOT NULL,
    "setup_completed" boolean DEFAULT false,
    "setup_step" text DEFAULT 'PASSWORD_CREATED',
    "wallet_created" boolean DEFAULT false,
    "wallet_encrypted" boolean DEFAULT false,
    "last_active" timestamp with time zone DEFAULT now(),
    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."auth_verification_token" (
    "identifier" text NOT NULL,
    "token" text NOT NULL,
    "expires" timestamp with time zone NOT NULL,
    CONSTRAINT "auth_verification_token_pkey" PRIMARY KEY ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "public"."custom_tokens" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "address" text NOT NULL,
    "symbol" text NOT NULL,
    "decimals" integer NOT NULL,
    "chain_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "custom_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."networks" (
    "id" integer NOT NULL,
    "name" text NOT NULL,
    "chain_id" integer NOT NULL,
    "rpc_url" text NOT NULL,
    "explorer_url" text NOT NULL,
    "native_currency" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."nfts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    "token_id" text NOT NULL,
    "contract_address" text NOT NULL,
    "chain_id" integer NOT NULL,
    "name" text,
    "description" text,
    "image_url" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "type" text NOT NULL,
    "message" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "event_type" text NOT NULL,
    "error_code" text NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."temp_seed_phrases" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "seed_phrase" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "temp_seed_phrases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."token_balances" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" uuid REFERENCES wallets(id) ON DELETE CASCADE,
    "public_address" text NOT NULL,
    "token_address" text NOT NULL,
    "balance" numeric NOT NULL,
    "usd_value" numeric NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "chain_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    "hash" text NOT NULL,
    "from_address" text NOT NULL,
    "to_address" text NOT NULL,
    "value" numeric NOT NULL,
    "status" text NOT NULL,
    "network_id" integer NOT NULL,
    "gas_price" numeric NOT NULL,
    "gas_used" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "theme" text DEFAULT 'dark',
    "notifications_enabled" boolean DEFAULT true,
    "biometric_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "public_address" text NOT NULL,
    "private_key" text NOT NULL,
    "name" text NOT NULL,
    "is_primary" boolean DEFAULT false,
    "imported" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- Create functions
CREATE OR REPLACE FUNCTION "public"."add_transaction"(
    "wallet_id" uuid,
    "hash" text,
    "from_address" text,
    "to_address" text,
    "value" numeric,
    "status" text,
    "network_id" integer,
    "gas_price" numeric,
    "gas_used" numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO transactions (
        wallet_id, hash, from_address, to_address, value, status, network_id, gas_price, gas_used
    ) VALUES (
        wallet_id, hash, from_address, to_address, value, status, network_id, gas_price, gas_used
    );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."create_default_token_balances"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only add default balances for non-imported wallets
    IF NOT NEW.imported THEN
        -- Insert ETH balance with both wallet_id and public_address
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
            NEW.id,
            NEW.public_address,
            '0x0000000000000000000000000000000000000000',
            '0',
            '0',
            NOW(),
            1,
            'ETH',
            'Ethereum',
            18
        );

        -- Insert WETH balance with both wallet_id and public_address
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
            NEW.id,
            NEW.public_address,
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            '0',
            '0',
            NOW(),
            1,
            'WETH',
            'Wrapped Ether',
            18
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("user_email" text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.auth_users WHERE id = NEW.id) THEN
        -- Profile exists, update last_active
        UPDATE public.auth_users
        SET last_active = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        
        INSERT INTO public.security_logs (
            user_id,
            event_type,
            error_code,
            metadata
        ) VALUES (
            NEW.id,
            'PROFILE_UPDATE',
            'SUCCESS',
            jsonb_build_object(
                'action', 'update_existing',
                'email', NEW.email
            )
        );
    ELSE
        -- Create new profile
        INSERT INTO public.auth_users (
            id,
            email,
            setup_completed,
            setup_step,
            wallet_created,
            wallet_encrypted,
            last_active
        ) VALUES (
            NEW.id,
            NEW.email,
            false,
            'PASSWORD_CREATED',
            false,
            false,
            CURRENT_TIMESTAMP
        );
        
        INSERT INTO public.security_logs (
            user_id,
            event_type,
            error_code,
            metadata
        ) VALUES (
            NEW.id,
            'PROFILE_CREATION',
            'SUCCESS',
            jsonb_build_object(
                'action', 'create_new',
                'email', NEW.email
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_token_balance"(
    "wallet_id" uuid,
    "token_address" text,
    "balance" numeric,
    "usd_value" numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE token_balances
    SET balance = update_token_balance.balance,
        usd_value = update_token_balance.usd_value,
        timestamp = NOW()
    WHERE wallet_id = update_token_balance.wallet_id
    AND token_address = update_token_balance.token_address;
END;
$$;

-- Create triggers
CREATE TRIGGER "wallet_after_insert"
    AFTER INSERT ON "public"."wallets"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."create_default_token_balances"();

-- Create RLS policies
ALTER TABLE "public"."auth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."auth_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."auth_verification_token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."networks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."nfts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."temp_seed_phrases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."token_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
    ON "public"."auth_users"
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
    ON "public"."auth_users"
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own wallets"
    ON "public"."wallets"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
    ON "public"."wallets"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
    ON "public"."wallets"
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
    ON "public"."wallets"
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own token balances"
    ON "public"."token_balances"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = token_balances.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own transactions"
    ON "public"."transactions"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own NFTs"
    ON "public"."nfts"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = nfts.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own custom tokens"
    ON "public"."custom_tokens"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom tokens"
    ON "public"."custom_tokens"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom tokens"
    ON "public"."custom_tokens"
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences"
    ON "public"."user_preferences"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON "public"."user_preferences"
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification logs"
    ON "public"."notification_logs"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own security logs"
    ON "public"."security_logs"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own temp seed phrases"
    ON "public"."temp_seed_phrases"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own temp seed phrases"
    ON "public"."temp_seed_phrases"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own temp seed phrases"
    ON "public"."temp_seed_phrases"
    FOR DELETE
    USING (auth.uid() = user_id);

-- Insert default networks
INSERT INTO networks (id, name, chain_id, rpc_url, explorer_url, native_currency)
VALUES 
(1, 'Ethereum Mainnet', 1, 'https://eth-mainnet.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://etherscan.io', '{"name":"Ether","symbol":"ETH","decimals":18}'),
(5, 'Goerli', 5, 'https://eth-goerli.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://goerli.etherscan.io', '{"name":"Goerli Ether","symbol":"ETH","decimals":18}'),
(137, 'Polygon Mainnet', 137, 'https://polygon-mainnet.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://polygonscan.com', '{"name":"MATIC","symbol":"MATIC","decimals":18}'),
(80001, 'Mumbai', 80001, 'https://polygon-mumbai.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://mumbai.polygonscan.com', '{"name":"MATIC","symbol":"MATIC","decimals":18}'),
(42161, 'Arbitrum One', 42161, 'https://arb-mainnet.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://arbiscan.io', '{"name":"Ether","symbol":"ETH","decimals":18}'),
(421613, 'Arbitrum Goerli', 421613, 'https://arb-goerli.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://goerli.arbiscan.io', '{"name":"Goerli Ether","symbol":"ETH","decimals":18}'),
(10, 'Optimism', 10, 'https://opt-mainnet.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://optimistic.etherscan.io', '{"name":"Ether","symbol":"ETH","decimals":18}'),
(420, 'Optimism Goerli', 420, 'https://opt-goerli.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://goerli-optimism.etherscan.io', '{"name":"Goerli Ether","symbol":"ETH","decimals":18}'),
(56, 'BNB Smart Chain', 56, 'https://bsc-dataseed.binance.org', 'https://bscscan.com', '{"name":"BNB","symbol":"BNB","decimals":18}'),
(97, 'BNB Smart Chain Testnet', 97, 'https://data-seed-prebsc-1-s1.binance.org:8545', 'https://testnet.bscscan.com', '{"name":"tBNB","symbol":"tBNB","decimals":18}'),
(43114, 'Avalanche C-Chain', 43114, 'https://api.avax.network/ext/bc/C/rpc', 'https://snowtrace.io', '{"name":"AVAX","symbol":"AVAX","decimals":18}'),
(43113, 'Avalanche Fuji', 43113, 'https://api.avax-test.network/ext/bc/C/rpc', 'https://testnet.snowtrace.io', '{"name":"AVAX","symbol":"AVAX","decimals":18}'),
(8453, 'Base', 8453, 'https://mainnet.base.org', 'https://basescan.org', '{"name":"Ether","symbol":"ETH","decimals":18}'),
(84531, 'Base Goerli', 84531, 'https://goerli.base.org', 'https://goerli.basescan.org', '{"name":"Goerli Ether","symbol":"ETH","decimals":18}'),
(11155111, 'Sepolia', 11155111, 'https://eth-sepolia.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://sepolia.etherscan.io', '{"name":"Sepolia Ether","symbol":"ETH","decimals":18}'),
(17000, 'Holesky', 17000, 'https://eth-holesky.g.alchemy.com/v2/JiNzxNhzZnrtaGun9u6fvkuhZCnAiQ8D', 'https://holesky.etherscan.io', '{"name":"Holesky Ether","symbol":"ETH","decimals":18}'); 