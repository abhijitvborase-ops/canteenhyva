import { Coupon } from './coupon.model';

export interface GuestCouponRequest {
  id: string;
  requestingEmployeeId: number;
  requestingEmployeeName: string;
  guestName: string;
  guestCompany: string;
  couponType: Coupon['couponType'];
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string; // ISO string
  decisionDate: string | null; // ISO string
  generatedCouponId: string | null;
}
