

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


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE OR REPLACE FUNCTION "public"."create_wallet"("user_id" "uuid", "name" "text", "public_address" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure the user exists in auth.users before inserting
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Insert into wallets
  INSERT INTO wallets (user_id, name, public_address)
  VALUES (user_id, name, public_address);
END;
$$;


ALTER FUNCTION "public"."create_wallet"("user_id" "uuid", "name" "text", "public_address" "text") OWNER TO "postgres";


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
    "seed_phrase" "text",
    "encrypted_seed_phrase" "text",
    "password_hash" "text"
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
    "is_active" boolean DEFAULT true
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


CREATE TABLE IF NOT EXISTS "public"."temp_seed_phrases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seed_phrase" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expires_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '01:00:00'::interval)
);


ALTER TABLE "public"."temp_seed_phrases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid",
    "token_address" "text" NOT NULL,
    "balance" numeric NOT NULL,
    "usd_value" numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."token_balances" OWNER TO "postgres";


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
    "notification_preferences" "jsonb" DEFAULT '{"GAS_SPIKE": false, "LARGE_TRANSACTION": true, "SUSPICIOUS_ACTIVITY": true, "SMART_CONTRACT_INTERACTION": true}'::"jsonb"
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "theme" character varying(20) DEFAULT 'dark'::character varying,
    "language" character varying(10) DEFAULT 'en'::character varying,
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "alchemy_provider" "text",
    "public_address" "text" NOT NULL,
    "encrypted_private_key" "text",
    "salt" "text",
    "iv" "text",
    "auth_tag" "text",
    "chain_name" character varying(50),
    "decimals" integer DEFAULT 18,
    "mnemonic_validated" boolean DEFAULT false,
    "validation_date" timestamp with time zone
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."auth_accounts"
    ADD CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."temp_seed_phrases"
    ADD CONSTRAINT "temp_seed_phrases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_balances"
    ADD CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_balances"
    ADD CONSTRAINT "unique_balance_entry" UNIQUE ("wallet_id", "token_address", "timestamp");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_custom_tokens_network" ON "public"."custom_tokens" USING "btree" ("network_id");



CREATE INDEX "idx_custom_tokens_user_contract" ON "public"."custom_tokens" USING "btree" ("user_id", "contract_address");



CREATE INDEX "idx_nfts_contract_token" ON "public"."nfts" USING "btree" ("contract_address", "token_id");



CREATE INDEX "idx_nfts_wallet_id" ON "public"."nfts" USING "btree" ("wallet_id");



CREATE INDEX "idx_notification_logs_created_at" ON "public"."notification_logs" USING "btree" ("created_at");



CREATE INDEX "idx_notification_logs_type" ON "public"."notification_logs" USING "btree" ("type");



CREATE INDEX "idx_notification_logs_user" ON "public"."notification_logs" USING "btree" ("user_id");



CREATE INDEX "idx_security_logs_timestamp" ON "public"."security_logs" USING "btree" ("created_at");



CREATE INDEX "idx_security_logs_user_event" ON "public"."security_logs" USING "btree" ("user_id", "event_type");



CREATE INDEX "idx_temp_seed_phrases_expires_at" ON "public"."temp_seed_phrases" USING "btree" ("expires_at");



CREATE INDEX "idx_token_balances_wallet" ON "public"."token_balances" USING "btree" ("wallet_id");



CREATE INDEX "idx_transactions_hash" ON "public"."transactions" USING "btree" ("hash");



CREATE INDEX "idx_transactions_wallet" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_transactions_wallet_id" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_setup_status" ON "public"."auth_users" USING "btree" ("id", "setup_completed", "setup_step");



CREATE INDEX "idx_wallet_user" ON "public"."wallets" USING "btree" ("user_id");



CREATE INDEX "idx_wallets_user_validation" ON "public"."wallets" USING "btree" ("user_id", "mnemonic_validated");



ALTER TABLE ONLY "public"."custom_tokens"
    ADD CONSTRAINT "custom_tokens_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."temp_seed_phrases"
    ADD CONSTRAINT "temp_seed_phrases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_selected_network_fkey" FOREIGN KEY ("selected_network") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow users to read active networks" ON "public"."networks" FOR SELECT USING (("is_active" = true));



CREATE POLICY "User can access their own auth account" ON "public"."auth_accounts" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can access their own session" ON "public"."auth_sessions" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can access their own temp seed phrase" ON "public"."temp_seed_phrases" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can delete their own session" ON "public"."auth_sessions" FOR DELETE USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can delete their own temp seed phrase" ON "public"."temp_seed_phrases" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can manage their own auth account" ON "public"."auth_accounts" USING (("userId" = "auth"."uid"()));



CREATE POLICY "Users can insert their own custom tokens" ON "public"."custom_tokens" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own wallets" ON "public"."wallets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own data" ON "public"."auth_users" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own wallets" ON "public"."wallets" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own NFTs" ON "public"."nfts" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own custom tokens" ON "public"."custom_tokens" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own data" ON "public"."auth_users" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notification logs" ON "public"."notification_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own security logs" ON "public"."security_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own token balances" ON "public"."token_balances" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own wallets" ON "public"."wallets" FOR SELECT USING (("user_id" = "auth"."uid"()));



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


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_wallet"("user_id" "uuid", "name" "text", "public_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_wallet"("user_id" "uuid", "name" "text", "public_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_wallet"("user_id" "uuid", "name" "text", "public_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_token_balance"("wallet_id" "uuid", "token_address" "text", "balance" numeric, "usd_value" numeric) TO "service_role";


















GRANT ALL ON TABLE "public"."auth_accounts" TO "anon";
GRANT ALL ON TABLE "public"."auth_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."auth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."auth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."auth_users" TO "anon";
GRANT ALL ON TABLE "public"."auth_users" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users" TO "service_role";



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



GRANT ALL ON TABLE "public"."temp_seed_phrases" TO "anon";
GRANT ALL ON TABLE "public"."temp_seed_phrases" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_seed_phrases" TO "service_role";



GRANT ALL ON TABLE "public"."token_balances" TO "anon";
GRANT ALL ON TABLE "public"."token_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."token_balances" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



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
