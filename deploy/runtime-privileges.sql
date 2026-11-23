-- Run as the migration owner after schema deployment, in the dedicated yearbook
-- database. Create the login separately using a secret manager; never put its
-- password in this file. New tables deliberately receive no automatic grants.
BEGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE yearbook TO anamnou_api;
GRANT USAGE ON SCHEMA public TO anamnou_api;
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anamnou_api', item.tablename);
    IF item.tablename IN ('AuditLog', 'ParticipationEvent') THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO anamnou_api', item.tablename);
    ELSIF item.tablename = 'ParticipationPolicy' THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO anamnou_api', item.tablename);
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anamnou_api', item.tablename);
    END IF;
  END LOOP;
END;
$$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anamnou_api;
COMMIT;
