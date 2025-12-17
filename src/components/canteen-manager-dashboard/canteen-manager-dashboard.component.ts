import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Coupon } from '../../models/coupon.model';
import { RouterLink } from '@angular/router';
import { DailyMenu } from '../../models/menu.model';
import { RedemptionLog } from '../../models/redemption-log.model';
import { Employee } from '../../models/user.model';

@Component({
  selector: 'app-canteen-manager-dashboard',
  templateUrl: './canteen-manager-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class CanteenManagerDashboardComponent implements OnInit {
  private dataService = inject(DataService);

  selectedDate = signal(new Date().toISOString().split('T')[0]);
  statusMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  couponTypes: Coupon['couponType'][] = ['Breakfast', 'Lunch/Dinner', 'Snacks', 'Beverage'];

  // FIX: Create local signals to store asynchronous data.
  private _redemptionLogs = signal<RedemptionLog[]>([]);
  private _employees = signal<Employee[]>([]);
  private _coupons = signal<Coupon[]>([]);
  private _todaysMenu = signal<DailyMenu | undefined>(undefined);

  redemptionHistory = this._redemptionLogs;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this._redemptionLogs.set(await this.dataService.getRedemptionLogs());
      this._employees.set(await this.dataService.getEmployees());
      this._coupons.set(await this.dataService.getCoupons());
      const today = new Date();
      const todayId = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this._todaysMenu.set(await this.dataService.getMenuForDate(todayId));
    } catch (error) {
      console.error("Failed to load canteen manager data:", error);
    }
  }

  employeesMap = computed(() => {
    const map = new Map<number, string>();
    // FIX: Use local signal
    for (const emp of this._employees()) {
        map.set(emp.id, emp.name);
    }
    return map;
  });

  private allRedeemedCoupons = computed(() => {
    // FIX: Use local signal
    return this._coupons().filter(c => c.status === 'redeemed' && c.redeemDate);
  });

  pendingGuestCoupons = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    // FIX: Use local signal
    return this._coupons().filter(c => 
      c.isGuestCoupon && c.status === 'issued' && c.dateIssued.startsWith(todayStr)
    ).sort((a,b) => a.guestName!.localeCompare(b.guestName!));
  });

  todaysMenu = this._todaysMenu;

  todayRedeemedBreakfast = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.allRedeemedCoupons().filter(c => 
      c.couponType === 'Breakfast' && 
      c.redeemDate!.startsWith(todayStr)
    ).length;
  });
  
  todayRedeemedLunchDinner = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.allRedeemedCoupons().filter(c => 
      c.couponType === 'Lunch/Dinner' && 
      c.redeemDate!.startsWith(todayStr)
    ).length;
  });

  monthlyRedeemedBreakfast = computed(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return this.allRedeemedCoupons().filter(c => {
      if (c.couponType === 'Breakfast') {
        const redeemDate = new Date(c.redeemDate!);
        return redeemDate.getFullYear() === currentYear && redeemDate.getMonth() === currentMonth;
      }
      return false;
    }).length;
  });
  
  monthlyRedeemedLunchDinner = computed(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return this.allRedeemedCoupons().filter(c => {
      if (c.couponType === 'Lunch/Dinner') {
        const redeemDate = new Date(c.redeemDate!);
        return redeemDate.getFullYear() === currentYear && redeemDate.getMonth() === currentMonth;
      }
      return false;
    }).length;
  });

  redeemedCouponsForDay = computed(() => {
    const selected = this.selectedDate();
    return this.allRedeemedCoupons().filter(c => c.redeemDate?.startsWith(selected));
  });

  groupedCoupons = computed(() => {
      const groups: { [key in Coupon['couponType']]?: Coupon[] } = {};
      for (const coupon of this.redeemedCouponsForDay()) {
          if (!groups[coupon.couponType]) {
              groups[coupon.couponType] = [];
          }
          groups[coupon.couponType]!.push(coupon);
      }
      return groups;
  });

  onDateChange(event: Event) {
    this.selectedDate.set((event.target as HTMLInputElement).value);
  }

  private speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }

  // FIX: Method renamed and reimplemented to use an existing service method.
  async redeemGuestCoupon(couponId: string) {
    const couponToRedeem = this._coupons().find(c => c.couponId === couponId);
    if (!couponToRedeem) {
        this.statusMessage.set({ type: 'error', text: 'Coupon not found.' });
        this.speak('Coupon not found');
        setTimeout(() => this.statusMessage.set(null), 5000);
        return;
    }

    const result = await this.dataService.redeemCouponByCode(couponToRedeem.redemptionCode);
    this.statusMessage.set({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      this.speak('Coupon redeemed successfully');
      // FIX: Reload data to update UI.
      this._coupons.set(await this.dataService.getCoupons());
    } else {
      this.speak('Guest coupon not available or already redeemed');
    }
    setTimeout(() => this.statusMessage.set(null), 5000);
  }
  
  formatTime(isoString: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  relativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}
