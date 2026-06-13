import { collection, doc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";
import type { AdminActivityLog, AdminStaffAccount, CustomerPreferences, CustomerUser, DeskOrder, DeskSettings, WalletDeposit, WalletLedgerEntry, WalletWithdrawal } from "./types";

const root = "CoinveraData";
const storageKey = "usdt-inr-desk-orders";
const settingsStorageKey = "coinvera-desk-settings";
const activityLogStorageKey = "coinvera-admin-activity-log";
const usersStorageKey = "coinvera-customer-users";
const preferencesStorageKey = "coinvera-customer-preferences";
const walletDepositsStorageKey = "coinvera-wallet-deposits";
const walletLedgerStorageKey = "coinvera-wallet-ledger";
const walletWithdrawalsStorageKey = "coinvera-wallet-withdrawals";
const staffAccountsStorageKey = "coinvera-admin-staff-accounts";

function safeLocalSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Firebase remains the source of truth when browser storage is full or blocked.
  }
}

export async function syncFirebaseToLocal(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;

  try {
    const [orderSnap, userSnap, logSnap, settingsSnap, preferenceSnap, depositSnap, ledgerSnap, withdrawalSnap, staffSnap] = await Promise.all([
      getDocs(query(collection(services.db, root, "orders", "items"), orderBy("createdAt", "desc"), limit(500))),
      getDocs(query(collection(services.db, root, "users", "items"), orderBy("lastLoginAt", "desc"), limit(500))),
      getDocs(query(collection(services.db, root, "activityLogs", "items"), orderBy("at", "desc"), limit(300))),
      getDocs(query(collection(services.db, root, "settings", "items"), limit(1))),
      getDocs(query(collection(services.db, root, "customerPreferences", "items"), limit(500))),
      getDocs(query(collection(services.db, root, "walletDeposits", "items"), orderBy("createdAt", "desc"), limit(500))),
      getDocs(query(collection(services.db, root, "walletLedger", "items"), orderBy("at", "desc"), limit(800))),
      getDocs(query(collection(services.db, root, "walletWithdrawals", "items"), orderBy("createdAt", "desc"), limit(500))),
      getDocs(query(collection(services.db, root, "staff", "items"), orderBy("updatedAt", "desc"), limit(500)))
    ]);

    const orders = orderSnap.docs.map((item) => item.data() as DeskOrder);
    const users = userSnap.docs.map((item) => item.data() as CustomerUser);
    const logs = logSnap.docs.map((item) => item.data() as AdminActivityLog);
    const settings = settingsSnap.docs[0]?.data() as DeskSettings | undefined;
    const preferences = preferenceSnap.docs.map((item) => item.data() as CustomerPreferences);
    const deposits = depositSnap.docs.map((item) => item.data() as WalletDeposit);
    const ledger = ledgerSnap.docs.map((item) => item.data() as WalletLedgerEntry);
    const withdrawals = withdrawalSnap.docs.map((item) => item.data() as WalletWithdrawal);
    const staffAccounts = staffSnap.docs.map((item) => item.data() as AdminStaffAccount);

    if (orders.length) safeLocalSet(storageKey, orders);
    if (users.length) safeLocalSet(usersStorageKey, users);
    if (logs.length) safeLocalSet(activityLogStorageKey, logs);
    if (settings) safeLocalSet(settingsStorageKey, settings);
    if (preferences.length) safeLocalSet(preferencesStorageKey, preferences);
    if (deposits.length) safeLocalSet(walletDepositsStorageKey, deposits);
    if (ledger.length) safeLocalSet(walletLedgerStorageKey, ledger);
    if (withdrawals.length) safeLocalSet(walletWithdrawalsStorageKey, withdrawals);
    if (staffAccounts.length) safeLocalSet(staffAccountsStorageKey, staffAccounts);

    window.dispatchEvent(new Event("desk-orders-updated"));
    window.dispatchEvent(new Event("coinvera-users-updated"));
    window.dispatchEvent(new Event("coinvera-activity-log-updated"));
    window.dispatchEvent(new Event("coinvera-customer-preferences-updated"));
    window.dispatchEvent(new Event("coinvera-wallet-updated"));
    window.dispatchEvent(new Event("coinvera-staff-accounts-updated"));
    window.dispatchEvent(new Event("desk-settings-updated"));
  } catch (error) {
    console.warn("Firebase sync failed", error);
  }
}

export async function saveOrdersToFirebase(orders: DeskOrder[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(orders.map((order) => setDoc(doc(services.db, root, "orders", "items", order.id), order, { merge: true })));
}

export async function saveSettingsToFirebase(settings: DeskSettings): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await setDoc(doc(services.db, root, "settings", "items", "main"), settings, { merge: true });
}

export async function saveUsersToFirebase(users: CustomerUser[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(users.map((user) => setDoc(doc(services.db, root, "users", "items", user.id), user, { merge: true })));
}

export async function saveActivityLogsToFirebase(logs: AdminActivityLog[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(logs.map((log) => setDoc(doc(services.db, root, "activityLogs", "items", log.id), log, { merge: true })));
}

export async function saveCustomerPreferencesToFirebase(preferences: CustomerPreferences[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(preferences.map((preference) => setDoc(doc(services.db, root, "customerPreferences", "items", preference.mobile), preference, { merge: true })));
}

export async function saveWalletDepositsToFirebase(deposits: WalletDeposit[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(deposits.map((deposit) => setDoc(doc(services.db, root, "walletDeposits", "items", deposit.id), deposit, { merge: true })));
}

export async function saveWalletLedgerToFirebase(entries: WalletLedgerEntry[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(entries.map((entry) => setDoc(doc(services.db, root, "walletLedger", "items", entry.id), entry, { merge: true })));
}

export async function saveWalletWithdrawalsToFirebase(withdrawals: WalletWithdrawal[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(withdrawals.map((withdrawal) => setDoc(doc(services.db, root, "walletWithdrawals", "items", withdrawal.id), withdrawal, { merge: true })));
}

export async function saveStaffAccountsToFirebase(accounts: AdminStaffAccount[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.all(accounts.map((account) => setDoc(doc(services.db, root, "staff", "items", account.id), account, { merge: true })));
}
