import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { Employee } from '../../models/user.model';
import { Contractor } from '../../models/contractor.model';
import { Coupon } from '../../models/coupon.model';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contractor-dashboard',
  templateUrl: './contractor-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ContractorDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  
  isAssignModalOpen = signal(false);
  selectedEmployeeForAssignment = signal<Employee | null>(null);
  statusMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);
  assignCouponsForm: FormGroup;

  // FIX: Create local signals for asynchronous data.
  private _employees = signal<Employee[]>([]);
  private _coupons = signal<Coupon[]>([]);

  constructor() {
    this.assignCouponsForm = new FormGroup({
        breakfastQty: new FormControl(0, [Validators.required, Validators.min(0)]),
        lunchDinnerQty: new FormControl(0, [Validators.required, Validators.min(0)])
    }, { 
        validators: (group: FormGroup) => {
            const breakfast = group.get('breakfastQty')?.value;
            const lunch = group.get('lunchDinnerQty')?.value;
            return breakfast > 0 || lunch > 0 ? null : { noCouponsSelected: true };
        }
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this._employees.set(await this.dataService.getEmployees());
      this._coupons.set(await this.dataService.getCoupons());
    } catch (error) {
      console.error("Failed to load contractor dashboard data:", error);
    }
  }

  currentContractor = computed(() => {
    const user = this.authService.currentUser();
    if (user && 'businessName' in user) {
      return user as Contractor;
    }
    return null;
  });

  contractorEmployees = computed(() => {
    const contractor = this.currentContractor();
    if (!contractor) return [];
    
    // FIX: Use local signal for employees
    return this._employees().filter(
      (employee) => employee.role === 'contractual employee' && employee.contractor === contractor.businessName
    );
  });
  
  employeeCouponStats = computed(() => {
    const statsMap = new Map<number, { issued: number; redeemed: number }>();
    const employees = this.contractorEmployees();
    // FIX: Use local signal for coupons
    const allCoupons = this._coupons();

    for (const employee of employees) {
        statsMap.set(employee.id, { issued: 0, redeemed: 0 });
    }

    for (const coupon of allCoupons) {
        if (coupon.employeeId && statsMap.has(coupon.employeeId)) {
            const stats = statsMap.get(coupon.employeeId)!;
            stats.issued += 1;
            if (coupon.status === 'redeemed') {
                stats.redeemed += 1;
            }
        }
    }
    return statsMap;
  });

  availableCoupons = computed(() => {
    const contractor = this.currentContractor();
    if (!contractor) return { 'Breakfast': 0, 'Lunch/Dinner': 0, 'Snacks': 0, 'Beverage': 0 };
    
    const pool: Record<Coupon['couponType'], number> = { 'Breakfast': 0, 'Lunch/Dinner': 0, 'Snacks': 0, 'Beverage': 0 };
    // FIX: Use local signal for coupons
    const unassignedCoupons = this._coupons().filter(c => c.contractorId === contractor.id && !c.employeeId && c.status === 'issued');

    for(const coupon of unassignedCoupons) {
        pool[coupon.couponType]++;
    }
    return pool;
  });

  totalIssued = computed(() => {
    // FIX: Explicitly typed the `stats` parameter in the reduce function to correct a type inference error.
    return Array.from(this.employeeCouponStats().values()).reduce((sum: number, stats: { issued: number; redeemed: number; }) => sum + stats.issued, 0);
  });
  
  totalRedeemed = computed(() => {
    // FIX: Explicitly typed the `stats` parameter in the reduce function to correct a type inference error.
    return Array.from(this.employeeCouponStats().values()).reduce((sum: number, stats: { issued: number; redeemed: number; }) => sum + stats.redeemed, 0);
  });

  openAssignModal(employee: Employee) {
    this.selectedEmployeeForAssignment.set(employee);
    this.assignCouponsForm.reset({ breakfastQty: 0, lunchDinnerQty: 0 });
    this.statusMessage.set(null);
    this.isAssignModalOpen.set(true);
  }

  closeModals() {
    this.isAssignModalOpen.set(false);
    this.selectedEmployeeForAssignment.set(null);
  }

  // FIX: Make method async and await service calls.
  async handleAssignCoupons() {
    if (this.assignCouponsForm.invalid || !this.selectedEmployeeForAssignment() || !this.currentContractor()) {
        return;
    }
    const contractorId = this.currentContractor()!.id;
    const employeeId = this.selectedEmployeeForAssignment()!.id;
    const { breakfastQty, lunchDinnerQty } = this.assignCouponsForm.value;
    
    let allSuccess = true;
    let messages: string[] = [];

    if (breakfastQty > 0) {
        const result = await this.dataService.assignCouponsToEmployee(contractorId, employeeId, 'Breakfast', breakfastQty);
        if (!result.success) allSuccess = false;
        messages.push(result.message);
    }
    if (lunchDinnerQty > 0) {
        const result = await this.dataService.assignCouponsToEmployee(contractorId, employeeId, 'Lunch/Dinner', lunchDinnerQty);
        if (!result.success) allSuccess = false;
        messages.push(result.message);
    }

    this.statusMessage.set({ type: allSuccess ? 'success' : 'error', text: messages.join(' ') });
    this.closeModals();
    // FIX: Reload data to update UI.
    this.loadData();
    setTimeout(() => this.statusMessage.set(null), 5000);
  }
}
