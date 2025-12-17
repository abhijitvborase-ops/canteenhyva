import { Injectable, signal, inject } from '@angular/core';
import { Employee } from '../models/user.model';
import { Contractor } from '../models/contractor.model';
import { Router } from '@angular/router';

// --- MOCK DATA ---
// In a real application, this data would come from a backend server.
// For this mock implementation, we define it here to make login functional.
const MOCK_USERS: (Employee | Contractor)[] = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@hyva.com',
    employeeId: 'admin01',
    password: 'password',
    role: 'admin',
    department: 'HR & Admin',
    status: 'active'
  },
  {
    id: 2,
    name: 'John Doe',
    email: 'john.doe@hyva.com',
    employeeId: 'HYV001',
    password: 'password',
    role: 'employee',
    department: 'IT',
    status: 'active'
  },
  {
    id: 3,
    name: 'Jane Smith',
    employeeId: 'HYV002',
    password: 'password',
    role: 'contractual employee',
    contractor: 'ABC Services',
    status: 'active'
  },
  {
    id: 4,
    name: 'Canteen Manager',
    email: 'canteen.mgr@hyva.com',
    employeeId: 'canteen01',
    password: 'password',
    role: 'canteen manager',
    status: 'active'
  },
  {
    id: 101,
    name: 'Contractor Contact',
    businessName: 'ABC Services',
    contractorId: 'abc-services',
    password: 'password'
  }
];
// --- END MOCK DATA ---

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router: Router = inject(Router);
  currentUser = signal<Employee | Contractor | null>(null);

  // NOTE: In a real app, you would handle session persistence (e.g., check for an existing session on startup)

  async login(loginId: string, password: string): Promise<{ success: boolean, message?: string }> {
    const user = MOCK_USERS.find(u => {
      const id = 'employeeId' in u ? u.employeeId : u.contractorId;
      return id === loginId;
    });

    if (!user) {
      return { success: false, message: 'Invalid Login ID or Password.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Invalid Login ID or Password.' };
    }
    
    // Check for deactivated status in employees
    if ('status' in user && user.status === 'deactivated') {
        return { success: false, message: 'This account has been deactivated.' };
    }

    this.currentUser.set(user);
    return { success: true };
  }

  async logout(): Promise<void> {
    // In a real app, you would also call a backend endpoint to invalidate the session/token
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string; }> {
    const user = this.currentUser();
    if (!user) {
      return { success: false, message: 'No user is logged in.' };
    }

    if (user.password !== currentPassword) {
      return { success: false, message: 'The current password you entered is incorrect.' };
    }

    // Find the user in our mock data array and update their password
    const userInDb = MOCK_USERS.find(u => u.id === user.id && ('businessName' in u) === ('businessName' in user));
    if (userInDb) {
      userInDb.password = newPassword;
      
      // Update the current user signal as well for consistency
      this.currentUser.update(u => u ? { ...u, password: newPassword } : null);
      
      return { success: true, message: 'Password changed successfully.' };
    }

    return { success: false, message: 'An unexpected error occurred.' };
  }
}
