export type TradeMode = "buy" | "sell";

export type OrderStatus =
  | "Awaiting INR"
  | "Awaiting Payment"
  | "Awaiting USDT"
  | "USDT Submitted"
  | "Payment Submitted"
  | "Processing"
  | "INR Received"
  | "USDT Received"
  | "USDT Released"
  | "INR Paid"
  | "Completed"
  | "Cancelled";

export type Network = string;

export type AdminRole = "owner" | "manager" | "operator";

export interface AdminStaffAccount {
  id: string;
  authUid?: string;
  staffId: string;
  role: AdminRole;
  fullName: string;
  username: string;
  password: string;
  email: string;
  mobile: string;
  aadhaar: string;
  pan: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string;
  walletAddress?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface DeskOrder {
  id: string;
  createdAt: string;
  mode: TradeMode;
  name: string;
  phone: string;
  amount: number;
  rate: number;
  inr: number;
  grossInr?: number;
  platformFeeInr?: number;
  netInr?: number;
  network: Network;
  wallet: string;
  payment: string;
  kyc: string;
  status: OrderStatus;
  paymentMethod?: "upi" | "account" | "cdm";
  deliveryMethod?: "external" | "wallet";
  paymentReference?: string;
  paymentScreenshot?: string;
  customerMobile?: string;
  customerAuthUid?: string;
  expiresAt?: string;
  adminProof?: string;
  customerConfirmed?: boolean;
  adminConfirmed?: boolean;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: AdminRole;
  assignedAt?: string;
  chat?: OrderChatMessage[];
}

export interface OrderChatMessage {
  id: string;
  at: string;
  sender: "customer" | "admin" | "system";
  text: string;
  attachment?: string;
  staffId?: string;
  staffName?: string;
}

export interface AdminActivityLog {
  id: string;
  at: string;
  staffId: string;
  staffName: string;
  role: AdminRole;
  action: string;
  orderId?: string;
  detail?: string;
}

export interface CustomerUser {
  id: string;
  authUid?: string;
  fullName: string;
  mobile: string;
  email?: string;
  createdAt: string;
  lastLoginAt: string;
  status: "active" | "inactive";
}

export interface SavedReceivingWallet {
  id: string;
  label: string;
  network: Network;
  address: string;
  createdAt: string;
  lastUsedAt: string;
}

export type SavedPayoutMethod =
  | {
      id: string;
      type: "upi";
      label: string;
      upiId: string;
      createdAt: string;
      lastUsedAt: string;
    }
  | {
      id: string;
      type: "account";
      label: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
      createdAt: string;
      lastUsedAt: string;
    };

export interface CustomerPreferences {
  mobile: string;
  receivingWallets: SavedReceivingWallet[];
  payoutMethods: SavedPayoutMethod[];
  updatedAt: string;
}

export type WalletDepositStatus = "Pending Verification" | "Available" | "Rejected";
export type WalletWithdrawalStatus = "Requested" | "Completed" | "Cancelled";

export interface WalletDeposit {
  id: string;
  customerAuthUid?: string;
  customerMobile: string;
  customerName: string;
  network: Network;
  walletAddress: string;
  amount: number;
  txHash: string;
  status: WalletDepositStatus;
  createdAt: string;
  holdUntil: string;
  verifiedAt?: string;
  rejectedAt?: string;
  adminNote?: string;
  verifiedByStaffId?: string;
  verifiedByStaffName?: string;
}

export interface WalletWithdrawal {
  id: string;
  customerAuthUid?: string;
  customerMobile: string;
  customerName: string;
  amount: number;
  network: Network;
  address: string;
  status: WalletWithdrawalStatus;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  txHash?: string;
  adminNote?: string;
  handledByStaffId?: string;
  handledByStaffName?: string;
}

export interface WalletLedgerEntry {
  id: string;
  customerAuthUid?: string;
  customerMobile: string;
  at: string;
  type:
    | "deposit_pending"
    | "deposit_verified"
    | "deposit_rejected"
    | "buy_credited"
    | "sell_locked"
    | "sell_completed"
    | "sell_cancelled"
    | "withdraw_locked"
    | "withdraw_completed"
    | "withdraw_cancelled";
  amount: number;
  orderId?: string;
  depositId?: string;
  withdrawalId?: string;
  note: string;
}

export interface CustomerWalletBalance {
  available: number;
  pending: number;
  locked: number;
}

export interface DeskRates {
  buy: number;
  sell: number;
}

export interface TradeQuantityLimits {
  buyMin: number;
  buyMax: number;
  sellMin: number;
  sellMax: number;
}

export interface PlatformFees {
  buyPercent: number;
  sellPercent: number;
  buyMinInr: number;
  sellMinInr: number;
  showSeparately: boolean;
}

export interface PaymentDetails {
  holderName: string;
  upiId: string;
  upiQr: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  cdmName: string;
  cdmAccountNumber: string;
  cdmIfsc: string;
  cdmBankName: string;
  usdtReceivingWallet: string;
  usdtReceivingNetwork: string;
  usdtReceivingQr: string;
}

export interface BlockchainDeposit {
  id: string;
  name: string;
  wallet: string;
  qr: string;
}

export interface BankAccountOption {
  id: string;
  label: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface DeskSettings {
  limitPolicyVersion?: number;
  rates: DeskRates;
  limits: TradeQuantityLimits;
  fees: PlatformFees;
  payment: PaymentDetails;
  blockchains: BlockchainDeposit[];
  accountTransfers: BankAccountOption[];
  cdmAccounts: BankAccountOption[];
}
