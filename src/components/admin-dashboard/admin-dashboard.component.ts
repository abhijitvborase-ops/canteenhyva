import { Component, ChangeDetectionStrategy, inject, signal, computed, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { GeminiService } from '../../services/gemini.service';
import { Employee } from '../../models/user.model';
import { Coupon } from '../../models/coupon.model';
import { RouterLink } from '@angular/router';
import { RedemptionLog } from '../../models/redemption-log.model';
import { GuestCouponRequest } from '../../models/guest-coupon-request.model';

// Declare jsPDF global to use the library from the script tag
declare var jspdf: any;
// Declare Html5Qrcode global
declare var Html5Qrcode: any;

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class AdminDashboardComponent implements OnInit {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private geminiService = inject(GeminiService);
  private elementRef = inject(ElementRef);
  private html5QrCode: any;
  
  // FIX: Create local signals to store data fetched from the service.
  private _allEmployees = signal<Employee[]>([]);
  private _allCoupons = signal<Coupon[]>([]);
  private _dashboardStats = signal({ totalIssued: 0, totalRedeemed: 0, todaysIssued: 0, todaysRedeemed: 0 });
  private _redemptionLogs = signal<RedemptionLog[]>([]);
  private _guestCouponRequests = signal<GuestCouponRequest[]>([]);

  // Filter out the super admin and canteen managers from the employee count
  employees = computed(() => this._allEmployees().filter(e => e.employeeId !== 'admin01' && e.role !== 'canteen manager'));
  allEmployees = this._allEmployees; // For AI context
  allCoupons = this._allCoupons; // For AI context

  lifetimeIssued = computed(() => this._dashboardStats().totalIssued);
  lifetimeRedeemed = computed(() => this._dashboardStats().totalRedeemed);
  todaysIssued = computed(() => this._dashboardStats().todaysIssued);
  todaysRedeemed = computed(() => this._dashboardStats().todaysRedeemed);

  isScannerModalOpen = signal(false);
  redeemStatusMessage = signal<{ type: 'success' | 'error', title: string, text: string } | null>(null);
  redemptionHistory = this._redemptionLogs;

  pendingGuestRequests = computed(() => 
    this._guestCouponRequests().filter(r => r.status === 'pending')
  );

  redeemCouponForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(4), Validators.pattern('^[0-9]*$')])
  });

  // --- AI Analytics State ---
  aiQueryForm = new FormGroup({
    query: new FormControl('', [Validators.required])
  });
  aiInsight = signal<string | null>(null);
  isAiLoading = signal(false);
  aiError = signal<string | null>(null);

  ngOnInit() {
    this.loadData();
  }

  // FIX: Load all necessary data asynchronously.
  async loadData() {
    try {
      this._allEmployees.set(await this.dataService.getEmployees());
      this._allCoupons.set(await this.dataService.getCoupons());
      this._dashboardStats.set(await this.dataService.getDashboardStats());
      this._redemptionLogs.set(await this.dataService.getRedemptionLogs());
      this._guestCouponRequests.set(await this.dataService.getGuestCouponRequests());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  onDocumentClick(event: MouseEvent) {
    // This can be used for closing dropdowns if any are added in the future.
  }

  private speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }

  openScannerModal() {
    this.isScannerModalOpen.set(true);
    // Use timeout to ensure the DOM element for the scanner is rendered
    setTimeout(() => this.startScanner(), 100);
  }

  closeScannerModal() {
    this.isScannerModalOpen.set(false);
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      this.html5QrCode.stop().catch((err: any) => console.error("Error stopping the scanner.", err));
    }
  }

  private startScanner() {
    if (!document.getElementById('qr-reader')) {
      console.error('QR Reader element not found in DOM.');
      return;
    }

    this.html5QrCode = new Html5Qrcode('qr-reader');
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccess = (decodedText: string) => {
      this.redeemCouponForm.patchValue({ code: decodedText });
      this.handleRedeemCoupon();
      this.closeScannerModal();
    };

    const onScanFailure = (error: string) => {
      // This callback is called frequently, so keep it minimal.
      // console.warn(`QR scan error: ${error}`);
    };

    this.html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
      .catch((err: any) => console.error('Unable to start QR scanner', err));
  }
  
  // FIX: Make method async and await the service call result.
  async handleRedeemCoupon() {
    if (this.redeemCouponForm.valid) {
      const code = this.redeemCouponForm.value.code!;
      const result = await this.dataService.redeemCouponByCode(code);

      if (result.success) {
        this.redeemStatusMessage.set({ type: 'success', title: 'Coupon Redeemed Successfully', text: result.message });
        this.speak('Coupon redeemed successfully');
        // FIX: Reload data to reflect the change.
        this.loadData(); 
      } else {
        let title = 'Error Redeeming Coupon';
        let message = result.message;
        if (result.message === 'This coupon has already been redeemed.') {
            title = 'Coupon Already Redeemed';
            this.speak('Coupon already redeemed');
        } else if (result.message === 'Invalid coupon code.') {
            title = 'Coupon Not Available';
            message = 'The entered coupon code is invalid or does not exist.';
            this.speak('Coupon not available');
        } else {
            this.speak(result.message);
        }
        this.redeemStatusMessage.set({ type: 'error', title: title, text: message });
      }

      this.redeemCouponForm.reset();
      
      // Clear the message after a few seconds
      setTimeout(() => this.redeemStatusMessage.set(null), 5000);
    }
  }

  // FIX: Make method async and reload data on success.
  async approveRequest(requestId: string) {
    await this.dataService.approveGuestCouponRequest(requestId);
    this._guestCouponRequests.set(await this.dataService.getGuestCouponRequests());
  }

  // FIX: Make method async and reload data on success.
  async rejectRequest(requestId: string) {
    await this.dataService.rejectGuestCouponRequest(requestId);
    this._guestCouponRequests.set(await this.dataService.getGuestCouponRequests());
  }

  async handleGetAiInsights() {
    if (this.aiQueryForm.invalid) return;

    this.isAiLoading.set(true);
    this.aiInsight.set(null);
    this.aiError.set(null);

    const question = this.aiQueryForm.value.query!;
    
    try {
      const result = await this.geminiService.generateInsights(question, this.allEmployees(), this.allCoupons());
      this.aiInsight.set(result);
    } catch (error: any) {
      this.aiError.set(error.message || 'An unexpected error occurred.');
    } finally {
      this.isAiLoading.set(false);
    }
  }

  private downloadFile(data: string, filename: string, type: string) {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  exportSummaryCsv() {
    const headers = ['Metric', 'Value'];
    const rows = [
        ['Total Employees', this.employees().length],
        ['Today\'s Coupons Issued', this.todaysIssued()],
        ['Today\'s Coupons Redeemed', this.todaysRedeemed()],
        ['Lifetime Coupons Issued', this.lifetimeIssued()],
        ['Lifetime Coupons Redeemed', this.lifetimeRedeemed()]
    ];
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });
    this.downloadFile(csvContent, 'hyva_pune_canteen_summary_report.csv', 'text/csv;charset=utf-8;');
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
