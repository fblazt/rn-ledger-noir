import { listPendingAttachmentSyncRows, markAttachmentSyncStatus, markAttachmentUploadStatus, upsertPulledAttachment } from '@/src/attachments/local';
import { isOnline } from '@/src/lib/network';
import { nowIso } from '@/src/lib/date';
import { createLogger } from '@/src/lib/logger';

import {
  listPendingSyncRows,
  markSyncStatus,
  upsertPulledBudget,
  upsertPulledCategory,
  upsertPulledTransaction,
} from './local';
import { pullAttachments, pullBudgets, pullCategories, pullTransactions, pushAttachment, pushBudget, pushCategory, pushTransaction } from './remote';
import type { SyncResult } from './types';

const logger = createLogger('sync');

export async function syncLocalData(userId: string): Promise<SyncResult> {
  const online = await isOnline();

  if (!online) {
    throw new Error('You appear to be offline. Local changes are safe and will sync later.');
  }

  const result: SyncResult = { failed: 0, pulled: 0, pushed: 0 };

  result.pushed += await pushPendingCategories(userId, result);
  result.pushed += await pushPendingTransactions(userId, result);
  result.pushed += await pushPendingBudgets(userId, result);
  result.pushed += await pushPendingAttachments(userId, result);

  result.pulled += await pullRemoteCategories(userId);
  result.pulled += await pullRemoteTransactions(userId);
  result.pulled += await pullRemoteBudgets(userId);
  result.pulled += await pullRemoteAttachments(userId);

  logger.info('completed', result);

  return result;
}

async function pushPendingCategories(userId: string, result: SyncResult) {
  let pushed = 0;
  const categories = await listPendingSyncRows('category', userId);

  for (const category of categories) {
    try {
      const remoteCategory = await pushCategory(category);
      await markSyncStatus('category', userId, remoteCategory.id, 'synced', remoteCategory.updated_at);
      pushed += 1;
    } catch (error) {
      logger.error('category push failed', category.id, error);
      await markSyncStatus('category', userId, category.id, 'failed', null);
      result.failed += 1;
    }
  }

  return pushed;
}

async function pushPendingTransactions(userId: string, result: SyncResult) {
  let pushed = 0;
  const transactions = await listPendingSyncRows('transaction', userId);

  for (const transaction of transactions) {
    try {
      const remoteTransaction = await pushTransaction(transaction);
      await markSyncStatus('transaction', userId, remoteTransaction.id, 'synced', remoteTransaction.updated_at);
      pushed += 1;
    } catch (error) {
      logger.error('transaction push failed', transaction.id, error);
      await markSyncStatus('transaction', userId, transaction.id, 'failed', null);
      result.failed += 1;
    }
  }

  return pushed;
}

async function pushPendingBudgets(userId: string, result: SyncResult) {
  let pushed = 0;
  const budgets = await listPendingSyncRows('budget', userId);

  for (const budget of budgets) {
    try {
      const remoteBudget = await pushBudget(budget);
      await markSyncStatus('budget', userId, remoteBudget.id, 'synced', remoteBudget.updated_at);
      pushed += 1;
    } catch (error) {
      logger.error('budget push failed', budget.id, error);
      await markSyncStatus('budget', userId, budget.id, 'failed', null);
      result.failed += 1;
    }
  }

  return pushed;
}

async function pushPendingAttachments(userId: string, result: SyncResult) {
  let pushed = 0;
  const attachments = await listPendingAttachmentSyncRows(userId);

  for (const attachment of attachments) {
    try {
      if (!attachment.deleted_at && attachment.upload_status !== 'uploaded') {
        await markAttachmentUploadStatus(userId, attachment.id, 'uploading', null);
      }

      const remoteAttachment = await pushAttachment(attachment);
      await markAttachmentUploadStatus(userId, remoteAttachment.id, 'uploaded', nowIso());
      await markAttachmentSyncStatus(userId, remoteAttachment.id, 'synced', remoteAttachment.updated_at);
      pushed += 1;
    } catch (error) {
      logger.error('attachment push failed', attachment.id, error);
      await markAttachmentUploadStatus(userId, attachment.id, 'failed', null);
      await markAttachmentSyncStatus(userId, attachment.id, 'failed', null);
      result.failed += 1;
    }
  }

  return pushed;
}

async function pullRemoteCategories(userId: string) {
  let pulled = 0;
  const categories = await pullCategories(userId);

  for (const category of categories) {
    if (await upsertPulledCategory(category)) {
      pulled += 1;
    }
  }

  return pulled;
}

async function pullRemoteTransactions(userId: string) {
  let pulled = 0;
  const transactions = await pullTransactions(userId);

  for (const transaction of transactions) {
    if (await upsertPulledTransaction(transaction)) {
      pulled += 1;
    }
  }

  return pulled;
}

async function pullRemoteAttachments(userId: string) {
  let pulled = 0;
  const attachments = await pullAttachments(userId);

  for (const attachment of attachments) {
    if (await upsertPulledAttachment(attachment)) {
      pulled += 1;
    }
  }

  return pulled;
}

async function pullRemoteBudgets(userId: string) {
  let pulled = 0;
  const budgets = await pullBudgets(userId);

  for (const budget of budgets) {
    if (await upsertPulledBudget(budget)) {
      pulled += 1;
    }
  }

  return pulled;
}
