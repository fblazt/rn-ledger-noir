import type { EntityType } from '@/src/db';

export type SyncPhase = 'idle' | 'pushing' | 'pulling' | 'synced' | 'failed';

export type SyncEntityCount = {
  entityType: EntityType;
  failed: number;
  pending: number;
};

export type SyncSummary = {
  failed: number;
  pending: number;
  rows: SyncEntityCount[];
  status: 'idle' | 'pending' | 'synced' | 'failed';
};

export type SyncResult = {
  failed: number;
  pulled: number;
  pushed: number;
};
