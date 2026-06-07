import { get, ref, set } from "firebase/database";
import { getFirebaseServices } from "./firebase";
import type { AdminActivityLog, CustomerUser, DeskOrder, DeskSettings } from "./types";

const root = "coinveraDesk";
const storageKey = "usdt-inr-desk-orders";
const settingsStorageKey = "coinvera-desk-settings";
const activityLogStorageKey = "coinvera-admin-activity-log";
const usersStorageKey = "coinvera-customer-users";

function safeLocalSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Firebase remains the source of truth when browser storage is full or blocked.
  }
}

function objectValues<T>(value: unknown): T[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, T>);
}

export async function syncFirebaseToLocal(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;

  try {
    const snapshot = await get(ref(services.db, root));
    const data = snapshot.val() as {
      activityLogs?: Record<string, AdminActivityLog>;
      orders?: Record<string, DeskOrder>;
      settings?: { main?: DeskSettings };
      users?: Record<string, CustomerUser>;
    } | null;

    if (!data) return;

    const orders = objectValues<DeskOrder>(data.orders).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const users = objectValues<CustomerUser>(data.users).sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
    const logs = objectValues<AdminActivityLog>(data.activityLogs).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const settings = data.settings?.main;

    if (orders.length) safeLocalSet(storageKey, orders);
    if (users.length) safeLocalSet(usersStorageKey, users);
    if (logs.length) safeLocalSet(activityLogStorageKey, logs);
    if (settings) safeLocalSet(settingsStorageKey, settings);

    window.dispatchEvent(new Event("desk-orders-updated"));
    window.dispatchEvent(new Event("coinvera-users-updated"));
    window.dispatchEvent(new Event("coinvera-activity-log-updated"));
    window.dispatchEvent(new Event("desk-settings-updated"));
  } catch (error) {
    console.warn("Firebase sync failed", error);
  }
}

export async function saveOrdersToFirebase(orders: DeskOrder[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(orders.map((order) => set(ref(services.db, `${root}/orders/${order.id}`), order)));
}

export async function saveSettingsToFirebase(settings: DeskSettings): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await set(ref(services.db, `${root}/settings/main`), settings);
}

export async function saveUsersToFirebase(users: CustomerUser[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(users.map((user) => set(ref(services.db, `${root}/users/${user.id}`), user)));
}

export async function saveActivityLogsToFirebase(logs: AdminActivityLog[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(logs.map((log) => set(ref(services.db, `${root}/activityLogs/${log.id}`), log)));
}
