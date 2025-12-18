import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';

@Injectable({ providedIn: 'root' })
export class DbService {

  /* =========================
     LOGIN
     ========================= */
  async login(
    loginId: string,
    password: string
  ): Promise<{ success: boolean; user?: any; message?: string }> {

    const cleanLoginId = loginId.trim();

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', cleanLoginId)
      .eq('password', password)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      console.error('LOGIN ERROR:', error);
      return { success: false, message: 'Invalid login ID or password.' };
    }

    /* 🔥 NORMALIZE ROLE (VERY IMPORTANT) */
    const normalizedUser = {
      ...data,
      role: (data.role || '').toLowerCase().trim()
    };

    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));

    console.log('LOGIN SUCCESS USER:', normalizedUser);

    return { success: true, user: normalizedUser };
  }

  /* =========================
     CURRENT USER
     ========================= */
  currentUser(): any | null {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('currentUser');
      return null;
    }
  }

  /* =========================
     LOGOUT
     ========================= */
  logout(): void {
    localStorage.removeItem('currentUser');
  }

  /* =========================
     REDEEM COUPON
     ========================= */
  async redeemCouponByCode(
    code: string
  ): Promise<{ success: boolean; message: string }> {

    const cleanCode = code.trim();

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('redemption_code', cleanCode)
      .maybeSingle();

    if (error || !coupon) {
      return { success: false, message: 'Invalid coupon code.' };
    }

    if (coupon.status === 'redeemed') {
      return { success: false, message: 'This coupon has already been redeemed.' };
    }

    const { error: updateError } = await supabase
      .from('coupons')
      .update({
        status: 'redeemed',
        redeem_date: new Date().toISOString()
      })
      .eq('coupon_id', coupon.coupon_id);

    if (updateError) {
      return { success: false, message: 'Failed to redeem coupon.' };
    }

    await supabase.from('punch_events').insert({
      employee_id: coupon.employee_id,
      message: 'Coupon redeemed successfully',
      result_type: 'redeemed',
      created_at: new Date().toISOString()
    });

    return { success: true, message: 'Coupon redeemed successfully.' };
  }
}
