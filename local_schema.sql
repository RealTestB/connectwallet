

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


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






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


CREATE OR REPLACE FUNCTION "public"."create_default_token_balances"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only add default balances for non-imported wallets
  IF NOT NEW.imported THEN
    -- Insert ETH balance with ONLY public_address
    INSERT INTO token_balances (
      public_address,
      token_address,
      balance,
      usd_value,
      timestamp,
      chain_id
    ) VALUES (
      NEW.public_address,
      '0x0000000000000000000000000000000000000000',
      '0',
      '0',
      NOW(),
      1
    );

    -- Insert WETH balance with ONLY public_address
    INSERT INTO token_balances (
      public_address,
      token_address,
      balance,
      usd_value,
      timestamp,
      chain_id
    ) VALUES (
      NEW.public_address,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0',
      '0',
      NOW(),
      1
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_token_balances"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    error_code,
    metadata
  ) VALUES (
    NEW.id,
    'PROFILE_ERROR',
    SQLSTATE,
    jsonb_build_object(
      'error', SQLERRM,
      'email', NEW.email
    )
  );
  RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "chain_id" integer DEFAULT 1 NOT NULL,
    "public_address" character varying(42),
    "user_id" "uuid",
    "decimals" integer DEFAULT 18 NOT NULL,
    "name" character varying(255),
    "symbol" character varying(50)
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
    "alchemy_provider" "text",
    "public_address" "text" NOT NULL,
    "encrypted_private_key" "text",
    "salt" "text",
    "iv" "text",
    "auth_tag" "text",
    "chain_name" character varying(50),
    "decimals" integer DEFAULT 18,
    "imported" boolean DEFAULT false NOT NULL,
    "account_index" integer DEFAULT 0
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


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



CREATE OR REPLACE TRIGGER "wallet_after_insert" AFTER INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_token_balances"();



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



ALTER TABLE ONLY "public"."temp_seed_phrases"
    ADD CONSTRAINT "temp_seed_phrases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_selected_network_fkey" FOREIGN KEY ("selected_network") REFERENCES "public"."networks"("id");



CREATE POLICY "Allow anon read" ON "public"."networks" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anonymous read access to auth_users" ON "public"."auth_users" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anonymous users to create user profiles" ON "public"."auth_users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow users to read active networks" ON "public"."networks" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Enable read access for all users" ON "public"."auth_users" FOR SELECT USING (true);



CREATE POLICY "Service role can manage all profiles" ON "public"."auth_users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "User can access their own auth account" ON "public"."auth_accounts" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can access their own session" ON "public"."auth_sessions" FOR SELECT USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can access their own temp seed phrase" ON "public"."temp_seed_phrases" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can delete their own session" ON "public"."auth_sessions" FOR DELETE USING (("userId" = "auth"."uid"()));



CREATE POLICY "User can delete their own temp seed phrase" ON "public"."temp_seed_phrases" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can manage their own auth account" ON "public"."auth_accounts" USING (("userId" = "auth"."uid"()));



CREATE POLICY "Users can delete their own token balances" ON "public"."token_balances" FOR DELETE USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert any wallet" ON "public"."wallets" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own custom tokens" ON "public"."custom_tokens" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert token balances for their wallets" ON "public"."token_balances" FOR INSERT WITH CHECK (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own data" ON "public"."auth_users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own token balances" ON "public"."token_balances" FOR UPDATE USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"())))) WITH CHECK (("wallet_id" IN ( SELECT "wallets"."id"
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



CREATE POLICY "Users can view their own token balances" ON "public"."token_balances" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
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





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallets";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_transaction"("wallet_id" "uuid", "hash" "text", "from_address" "text", "to_address" "text", "value" numeric, "status" "text", "network_id" integer, "gas_price" numeric, "gas_used" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_token_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_token_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_token_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



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
