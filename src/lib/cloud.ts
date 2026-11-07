import type { AppData } from '../types';

const SYNC_KEY_STORAGE = 'momentum-cloud-sync-key';
const PENDING_STORAGE = 'momentum-cloud-sync-pending';
const API_PATH = '/api/sync';

export type CloudSyncStatus = 'disconnected' | 'syncing' | 'synced' | 'offline' | 'error';

let syncTimer: number | undefined;
let latestData: AppData | null = null;

function emitStatus(status: CloudSyncStatus) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CloudSyncStatus>('momentum-cloud-status', { detail: status }));
  }
}

function localStorageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getStoredSyncKey(): string {
  if (!localStorageAvailable()) return '';
  try {
    return window.localStorage.getItem(SYNC_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function disconnectCloudSync() {
  if (localStorageAvailable()) {
    window.localStorage.removeItem(SYNC_KEY_STORAGE);
    window.localStorage.removeItem(PENDING_STORAGE);
  }
  if (syncTimer !== undefined && typeof window !== 'undefined') {
    window.clearTimeout(syncTimer);
    syncTimer = undefined;
  }
  latestData = null;
  emitStatus('disconnected');
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return Array.isArray(data.tasks)
    && Array.isArray(data.habits)
    && Array.isArray(data.logs)
    && Array.isArray(data.activities)
    && Boolean(data.settings && typeof data.settings === 'object');
}

function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(item.id, item);
  for (const item of cloud) merged.set(item.id, item);
  return Array.from(merged.values());
}

export function mergeAppData(local: AppData, cloud: AppData): AppData {
  return {
    tasks: mergeById(local.tasks, cloud.tasks),
    habits: mergeById(local.habits, cloud.habits),
    logs: mergeById(local.logs, cloud.logs),
    activities: mergeById(local.activities, cloud.activities)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5000),
    settings: cloud.settings || local.settings,
  };
}

async function readCloudData(key: string): Promise<AppData | null> {
  const response = await fetch(API_PATH, {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 401) throw new Error('Invalid cloud sync key.');
  if (!response.ok) throw new Error('Cloud sync is temporarily unavailable.');
  const payload = await response.json() as { exists?: boolean; data?: unknown };
  if (!payload.exists) return null;
  if (!isAppData(payload.data)) throw new Error('The cloud workspace returned invalid data.');
  return payload.data;
}

async function writeCloudData(key: string, data: AppData): Promise<void> {
  const response = await fetch(API_PATH, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (response.status === 401) throw new Error('Invalid cloud sync key.');
  if (response.status === 413) throw new Error('The workspace is too large to sync.');
  if (!response.ok) throw new Error('Cloud sync failed. Your local data is still safe.');
}

export async function connectCloudSync(key: string, localData: AppData): Promise<AppData> {
  const normalizedKey = key.trim();
  if (normalizedKey.length < 32) {
    throw new Error('Enter the complete private sync key (at least 32 characters).');
  }

  emitStatus('syncing');
  const cloudData = await readCloudData(normalizedKey);
  const nextData = cloudData ? mergeAppData(localData, cloudData) : localData;
  await writeCloudData(normalizedKey, nextData);

  if (!localStorageAvailable()) throw new Error('Local browser storage is unavailable.');
  window.localStorage.setItem(SYNC_KEY_STORAGE, normalizedKey);
  window.localStorage.removeItem(PENDING_STORAGE);
  latestData = nextData;
  emitStatus('synced');
  return nextData;
}

export async function pullCloudData(localData: AppData): Promise<AppData> {
  const key = getStoredSyncKey();
  if (!key) {
    emitStatus('disconnected');
    return localData;
  }

  latestData = localData;
  emitStatus('syncing');
  try {
    const cloudData = await readCloudData(key);
    if (!cloudData) {
      await writeCloudData(key, localData);
      if (localStorageAvailable()) window.localStorage.removeItem(PENDING_STORAGE);
      emitStatus('synced');
      return localData;
    }

    const hasPendingLocalChanges = localStorageAvailable()
      && window.localStorage.getItem(PENDING_STORAGE) === '1';
    const nextData = hasPendingLocalChanges
      ? mergeAppData(localData, cloudData)
      : cloudData;

    if (hasPendingLocalChanges) await writeCloudData(key, nextData);
    if (localStorageAvailable()) window.localStorage.removeItem(PENDING_STORAGE);
    latestData = nextData;
    emitStatus('synced');
    return nextData;
  } catch (error) {
    console.warn('Momentum cloud sync is unavailable; continuing with local data.', error);
    emitStatus(navigator.onLine ? 'error' : 'offline');
    return localData;
  }
}

export function scheduleCloudSave(data: AppData) {
  const key = getStoredSyncKey();
  if (!key || !localStorageAvailable()) return;

  latestData = data;
  window.localStorage.setItem(PENDING_STORAGE, '1');
  emitStatus('syncing');

  if (syncTimer !== undefined) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    syncTimer = undefined;
    const snapshot = latestData;
    if (!snapshot) return;
    try {
      await writeCloudData(key, snapshot);
      if (latestData === snapshot) {
        window.localStorage.removeItem(PENDING_STORAGE);
        emitStatus('synced');
      }
    } catch (error) {
      console.warn('Momentum cloud save failed; changes remain stored locally.', error);
      emitStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, 800);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (latestData && getStoredSyncKey()) scheduleCloudSave(latestData);
  });
}
