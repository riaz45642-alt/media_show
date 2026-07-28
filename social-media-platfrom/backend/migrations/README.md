# Database migrations

These migrations target Supabase PostgreSQL and are applied in filename order by
`npm run migrate`. Applied filenames are recorded in `schema_migrations`.

Use the Supabase direct connection string for migrations. Keep that string and
the service-role key server-side only. The browser should receive only the
project URL and anonymous key.

- `001_initial_schema.sql`: normalized application schema, constraints, indexes,
  triggers, and all storage required by the current feature set.
- `002_supabase_rls.sql`: row-level security policies for optional direct
  Supabase client access, including verification requirements for interactions.
- `003_seed_reference_data.sql`: intentionally contains no fake production
  accounts or content.

For an existing database that used the earlier prototype tables, back up the
database and migrate data into the normalized schema in a staging project before
switching production traffic.
