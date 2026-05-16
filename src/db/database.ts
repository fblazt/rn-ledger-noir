import * as SQLite from 'expo-sqlite';

import { createLogger } from '@/src/lib/logger';

import { CURRENT_SCHEMA_VERSION, DATABASE_NAME, MIGRATIONS } from './schema';

const logger = createLogger('sqlite');

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    logger.info('opening database', DATABASE_NAME);
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initializeDatabase() {
  initializePromise ??= migrateDatabase();

  return initializePromise;
}

async function migrateDatabase() {
  const db = await getDatabase();

  await db.execAsync('pragma foreign_keys = on;');
  await db.execAsync('create table if not exists local_schema_migrations (version integer primary key);');

  const row = await db.getFirstAsync<{ version: number }>(
    'select coalesce(max(version), 0) as version from local_schema_migrations'
  );

  const currentVersion = row?.version ?? 0;

  logger.info('schema version', currentVersion, 'target', CURRENT_SCHEMA_VERSION);

  for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
    const migration = MIGRATIONS[version];

    if (!migration) {
      throw new Error(`Missing local SQLite migration ${version}`);
    }

    logger.info('applying migration', version);

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
      await db.runAsync('insert into local_schema_migrations (version) values (?)', version);
    });
  }

  logger.info('database ready');

  return db;
}
