import { inject } from '@angular/core';
import { Routes, Router, CanActivateFn } from '@angular/router';
import { DbService } from './app/services/db.service';

/* =========================
   COMPONENT IMPORTS
   ========================= */
import { LoginComponent } from './components/login/login.component';

import { AdminLayoutComponent } from './components/admin-layout/admin-layout';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';
import { EmployeeManagementComponent } from './components/employee-management/employee-management.component';
import { ManageContractorsComponent } from './components/manage-contractors/manage-contractors.component';
import { ManageCouponsComponent } from './components/manage-coupons/manage-coupons.component';
import { HistoryComponent } from './components/history/history.component';
import { EmployeeHistoryComponent } from './components/employee-history/employee-history.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AddEmployeeComponent } from './components/add-employee/add-employee.component';

import { EmployeeDashboardComponent } from './components/user-dashboard/user-dashboard.component';
import { CanteenManagerDashboardComponent } from './components/canteen-manager-dashboard/canteen-manager-dashboard.component';
import { RedeemCouponComponent } from './components/redeem-coupon/redeem-coupon.component';
import { MenuManagementComponent } from './components/menu-management/menu-management.component';
import { ContractorDashboardComponent } from './components/contractor-dashboard/contractor-dashboard.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';

/* =========================
   AUTH GUARDS
   ========================= */
const authGuard: CanActivateFn = () => {
  const db = inject(DbService);
  const router = inject(Router);
  return db.currentUser() ? true : router.parseUrl('/login');
};

const adminGuard: CanActivateFn = () => {
  const db = inject(DbService);
  const router = inject(Router);
  return db.currentUser()?.role === 'admin'
    ? true
    : router.parseUrl('/login');
};

const contractorGuard: CanActivateFn = () => {
  const db = inject(DbService);
  const router = inject(Router);
  return db.currentUser()?.role === 'contractor'
    ? true
    : router.parseUrl('/login');
};

/* =========================
   ROUTES
   ========================= */
export const routes: Routes = [

  /* ---------- LOGIN ---------- */
  { path: 'login', component: LoginComponent },

  /* ---------- ADMIN (WITH SIDEBAR LAYOUT) ---------- */
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'analytics', component: AnalyticsDashboardComponent },
      { path: 'employees', component: EmployeeManagementComponent },
      { path: 'contractors', component: ManageContractorsComponent },
      { path: 'manage-coupons', component: ManageCouponsComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'history/employee/:id', component: EmployeeHistoryComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'add-employee', component: AddEmployeeComponent }
    ]
  },

  /* ---------- EMPLOYEE ---------- */
  {
    path: 'employee',
    component: EmployeeDashboardComponent,
    canActivate: [authGuard]
  },

  /* ---------- CANTEEN MANAGER ---------- */
  {
    path: 'canteen-manager',
    component: CanteenManagerDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'canteen-manager/redeem',
    component: RedeemCouponComponent,
    canActivate: [authGuard]
  },
  {
    path: 'canteen-manager/menu',
    component: MenuManagementComponent,
    canActivate: [authGuard]
  },

  /* ---------- CONTRACTOR ---------- */
  {
    path: 'contractor',
    component: ContractorDashboardComponent,
    canActivate: [authGuard, contractorGuard]
  },

  /* ---------- COMMON ---------- */
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [authGuard]
  },

  /* ---------- DEFAULT ---------- */
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
