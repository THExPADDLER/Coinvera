import { loadStaffAccounts } from "./adminStaff";
import type { AdminRole } from "./types";

export interface AdminSession {
  username: string;
  role: AdminRole;
  label: string;
  staffId: string;
  expiresAt: string;
}

const adminSessionKey = "coinvera-admin-session";
const adminSessionTtlMs = 8 * 60 * 60 * 1000;

export function saveAdminSession(session: Omit<AdminSession, "expiresAt">): AdminSession {
  const nextSession: AdminSession = {
    ...session,
    expiresAt: new Date(Date.now() + adminSessionTtlMs).toISOString()
  };
  localStorage.setItem(adminSessionKey, JSON.stringify(nextSession));
  window.dispatchEvent(new Event("coinvera-admin-session-updated"));
  return nextSession;
}

export function loadAdminSession(): AdminSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(adminSessionKey) || "null") as AdminSession | null;
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      clearAdminSession();
      return null;
    }
    const activeAccount = loadStaffAccounts().find((account) => account.staffId === session.staffId && account.username === session.username && account.status === "active");
    if (!activeAccount) {
      clearAdminSession();
      return null;
    }
    return {
      ...session,
      role: activeAccount.role,
      label: activeAccount.fullName || session.label
    };
  } catch {
    clearAdminSession();
    return null;
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem(adminSessionKey);
  window.dispatchEvent(new Event("coinvera-admin-session-updated"));
}
