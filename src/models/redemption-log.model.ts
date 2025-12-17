export interface RedemptionLog {
  id: string; // Unique ID
  timestamp: string; // ISO string
  code: string; // The 4-digit code that was attempted
  status: 'success' | 'not_found' | 'already_redeemed' | 'error';
  message: string;
  employeeName?: string; // If successfully redeemed
  couponType?: string; // If successfully redeemed
}
