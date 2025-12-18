import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { DbService } from './app/services/db.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
      <!-- SIDEBAR -->
      <app-sidebar (logout)="logout()"></app-sidebar>

      <!-- MAIN CONTENT -->
      <div class="flex-1 overflow-y-auto p-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  constructor(private db: DbService) {}

  logout() {
    this.db.logout();
    location.href = '/login';
  }
}
