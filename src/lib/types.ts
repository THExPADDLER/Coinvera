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

export type AdminRole = "owner" | "manager" | "operator" | "viewer";

export interface DeskOrder {
  id: string;
  createdAt: string;
  mode: TradeMode;
  name: string;
  phone: string;
  amount: number;
  rate: number;
  inr: number;
  network: Network;
  wallet: string;
  payment: string;
  kyc: string;
  status: OrderStatus;
  paymentMethod?: "upi" | "account" | "cdm";
  paymentReference?: string;
  paymentScreenshot?: string;
  customerMobile?: string;
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

export interface DeskRates {
  buy: number;
  sell: number;
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
  rates: DeskRates;
  payment: PaymentDetails;
  blockchains: BlockchainDeposit[];
  accountTransfers: BankAccountOption[];
  cdmAccounts: BankAccountOption[];
}
