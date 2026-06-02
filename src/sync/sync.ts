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
  const categories = await listPendingSyncRows('category', userId);
  const pushResults = await Promise.all(
    categories.map(async (category) => {
      try {
        const remoteCategory = await pushCategory(category);
        await markSyncStatus('category', userId, remoteCategory.id, 'synced', remoteCategory.updated_at);
        return true;
      } catch (error) {
        logger.error('category push failed', category.id, error);
        await markSyncStatus('category', userId, category.id, 'failed', null);
        result.failed += 1;
        return false;
      }
    })
  );

  return pushResults.filter(Boolean).length;
}

async function pushPendingTransactions(userId: string, result: SyncResult) {
  const transactions = await listPendingSyncRows('transaction', userId);
  const pushResults = await Promise.all(
    transactions.map(async (transaction) => {
      try {
        const remoteTransaction = await pushTransaction(transaction);
        await markSyncStatus('transaction', userId, remoteTransaction.id, 'synced', remoteTransaction.updated_at);
        return true;
      } catch (error) {
        logger.error('transaction push failed', transaction.id, error);
        await markSyncStatus('transaction', userId, transaction.id, 'failed', null);
        result.failed += 1;
        return false;
      }
    })
  );

  return pushResults.filter(Boolean).length;
}

async function pushPendingBudgets(userId: string, result: SyncResult) {
  const budgets = await listPendingSyncRows('budget', userId);
  const pushResults = await Promise.all(
    budgets.map(async (budget) => {
      try {
        const remoteBudget = await pushBudget(budget);
        await markSyncStatus('budget', userId, remoteBudget.id, 'synced', remoteBudget.updated_at);
        return true;
      } catch (error) {
        logger.error('budget push failed', budget.id, error);
        await markSyncStatus('budget', userId, budget.id, 'failed', null);
        result.failed += 1;
        return false;
      }
    })
  );

  return pushResults.filter(Boolean).length;
}

async function pushPendingAttachments(userId: string, result: SyncResult) {
  const attachments = await listPendingAttachmentSyncRows(userId);
  const pushResults = await Promise.all(
    attachments.map(async (attachment) => {
      try {
        if (!attachment.deleted_at && attachment.upload_status !== 'uploaded') {
          await markAttachmentUploadStatus(userId, attachment.id, 'uploading', null);
        }

        const remoteAttachment = await pushAttachment(attachment);
        await Promise.all([
          markAttachmentUploadStatus(userId, remoteAttachment.id, 'uploaded', nowIso()),
          markAttachmentSyncStatus(userId, remoteAttachment.id, 'synced', remoteAttachment.updated_at),
        ]);
        return true;
      } catch (error) {
        logger.error('attachment push failed', attachment.id, error);
        await Promise.all([
          markAttachmentUploadStatus(userId, attachment.id, 'failed', null),
          markAttachmentSyncStatus(userId, attachment.id, 'failed', null),
        ]);
        result.failed += 1;
        return false;
      }
    })
  );

  return pushResults.filter(Boolean).length;
}

async function pullRemoteCategories(userId: string) {
  const categories = await pullCategories(userId);
  const pullResults = await Promise.all(categories.map((category) => upsertPulledCategory(category)));

  return pullResults.filter(Boolean).length;
}

async function pullRemoteTransactions(userId: string) {
  const transactions = await pullTransactions(userId);
  const pullResults = await Promise.all(transactions.map((transaction) => upsertPulledTransaction(transaction)));

  return pullResults.filter(Boolean).length;
}

async function pullRemoteAttachments(userId: string) {
  const attachments = await pullAttachments(userId);
  const pullResults = await Promise.all(attachments.map((attachment) => upsertPulledAttachment(attachment)));

  return pullResults.filter(Boolean).length;
}

async function pullRemoteBudgets(userId: string) {
  const budgets = await pullBudgets(userId);
  const pullResults = await Promise.all(budgets.map((budget) => upsertPulledBudget(budget)));

  return pullResults.filter(Boolean).length;
}
