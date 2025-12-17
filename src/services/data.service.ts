import { Injectable } from '@angular/core';
import { Employee } from '../models/user.model';
import { Coupon } from '../models/coupon.model';
import { AppNotification } from '../models/notification.model';
import { Contractor } from '../models/contractor.model';
import { DailyMenu } from '../models/menu.model';
import { RedemptionLog } from '../models/redemption-log.model';
import { GuestCouponRequest } from '../models/guest-coupon-request.model';

// Helper function for making API requests
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
    throw new Error(errorData.message);
  }

  return response.json();
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  // NOTE TO DEVELOPER:
  // This service has been refactored to use a backend API.
  // All methods now return Promises. Components consuming these methods
  // must be updated to handle asynchronous data (e.g., using async/await,
  // .then(), or converting Promises to Signals with toSignal()).

  // --- Dashboard Stats ---
  async getDashboardStats(): Promise<{
    totalIssued: number;
    totalRedeemed: number;
    todaysIssued: number;
    todaysRedeemed: number;
  }> {
    return apiRequest('/api/dashboard/stats');
  }

  // --- Employee Methods ---
  async getEmployees(): Promise<Employee[]> {
    return apiRequest('/api/employees');
  }

  async addEmployee(employeeData: Omit<Employee, 'id' | 'status'>): Promise<Employee> {
    return apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(updatedEmployeeData: Employee): Promise<void> {
    return apiRequest(`/api/employees/${updatedEmployeeData.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedEmployeeData),
    });
  }

  async deleteEmployee(employeeId: number): Promise<void> {
    return apiRequest(`/api/employees/${employeeId}`, { method: 'DELETE' });
  }

  async toggleEmployeeStatus(employeeId: number): Promise<void> {
    return apiRequest(`/api/employees/${employeeId}/toggle-status`, { method: 'POST' });
  }

  // --- Contractor Methods ---
  async getContractors(): Promise<Contractor[]> {
    return apiRequest('/api/contractors');
  }
  
  async addContractor(contractorData: Omit<Contractor, 'id'>): Promise<Contractor> {
    return apiRequest('/api/contractors', {
      method: 'POST',
      body: JSON.stringify(contractorData),
    });
  }

  async updateContractor(updatedContractorData: Contractor): Promise<void> {
    return apiRequest(`/api/contractors/${updatedContractorData.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedContractorData),
    });
  }

  async deleteContractor(contractorId: number): Promise<void> {
    return apiRequest(`/api/contractors/${contractorId}`, { method: 'DELETE' });
  }
  
  // --- Coupon Methods ---
  async getCoupons(): Promise<Coupon[]> {
      return apiRequest('/api/coupons');
  }

  async getCouponsForEmployee(employeeId: number): Promise<Coupon[]> {
    return apiRequest(`/api/employees/${employeeId}/coupons`);
  }

  async generateCouponsForEmployee(employeeId: number, couponType: Coupon['couponType']): Promise<{ success: boolean; message: string; }> {
    return apiRequest(`/api/employees/${employeeId}/generate-coupons`, {
      method: 'POST',
      body: JSON.stringify({ couponType }),
    });
  }
  
  async generateCouponsForContractor(contractorId: number, couponType: Coupon['couponType'], quantity: number): Promise<{ success: boolean; message: string; }> {
      return apiRequest(`/api/contractors/${contractorId}/generate-coupons`, {
          method: 'POST',
          body: JSON.stringify({ couponType, quantity })
      });
  }
  
  async assignCouponsToEmployee(contractorId: number, employeeId: number, couponType: Coupon['couponType'], quantity: number): Promise<{ success: boolean; message: string; }> {
      return apiRequest(`/api/contractors/${contractorId}/assign-coupons`, {
          method: 'POST',
          body: JSON.stringify({ employeeId, couponType, quantity })
      });
  }
  
  async redeemCouponByCode(code: string): Promise<{ success: boolean; message: string; }> {
    return apiRequest('/api/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async removeCoupon(couponId: string): Promise<{ success: boolean; message: string; }> {
    return apiRequest(`/api/coupons/${couponId}`, { method: 'DELETE' });
  }

  async removeLastCouponBatch(employeeId: number): Promise<{ success: boolean, message: string, removedCount: number }> {
    return apiRequest(`/api/employees/${employeeId}/remove-last-batch`, { method: 'POST' });
  }

  // --- Guest Coupon Request Methods ---
  async getGuestCouponRequests(): Promise<GuestCouponRequest[]> {
    return apiRequest('/api/guest-requests');
  }

  async requestGuestCoupon(employeeId: number, guestName: string, guestCompany: string, couponType: Coupon['couponType']): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/guest-requests', {
      method: 'POST',
      body: JSON.stringify({ employeeId, guestName, guestCompany, couponType }),
    });
  }

  async approveGuestCouponRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/guest-requests/${requestId}/approve`, { method: 'POST' });
  }

  async rejectGuestCouponRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/guest-requests/${requestId}/reject`, { method: 'POST' });
  }

  // --- Notification Methods ---
  async getNotificationsForEmployee(employeeId: number): Promise<AppNotification[]> {
    return apiRequest(`/api/employees/${employeeId}/notifications`);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return apiRequest(`/api/notifications/${notificationId}/read`, { method: 'POST' });
  }
  
  async markAllNotificationsAsRead(employeeId: number): Promise<void> {
    return apiRequest(`/api/employees/${employeeId}/notifications/mark-all-read`, { method: 'POST' });
  }

  // --- Menu Methods ---
  async getMenuForDate(dateId: string): Promise<DailyMenu | undefined> {
    try {
        return await apiRequest(`/api/menus/${dateId}`);
    } catch(e) {
        // Return undefined if the menu for that day is not found (e.g., 404)
        return undefined;
    }
  }

  async upsertMenu(menuData: Omit<DailyMenu, 'date'>): Promise<void> {
    return apiRequest(`/api/menus/${menuData.id}`, {
      method: 'PUT',
      body: JSON.stringify(menuData),
    });
  }

  // --- Redemption Logs ---
  async getRedemptionLogs(): Promise<RedemptionLog[]> {
      return apiRequest('/api/logs/redemptions');
  }
}
