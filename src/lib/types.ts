export type TradeMode = "buy" | "sell";

export type OrderStatus =
  | "Awaiting INR"
  | "Awaiting USDT"
  | "Payment Submitted"
  | "Processing"
  | "INR Received"
  | "USDT Received"
  | "USDT Released"
  | "INR Paid"
  | "Completed"
  | "Cancelled";

export type Network = "TRC20" | "ERC20" | "BEP20" | "Polygon";

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

export interface DeskSettings {
  rates: DeskRates;
  payment: PaymentDetails;
}
