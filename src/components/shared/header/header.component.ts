import { Component, ChangeDetectionStrategy, output, inject, signal, computed, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { DataService } from '../../../services/data.service';
import { AppNotification } from '../../../models/notification.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private elementRef = inject(ElementRef);
  
  currentUser = this.authService.currentUser;
  logout = output<void>();

  isNotificationPanelOpen = signal(false);
  isUserMenuOpen = signal(false);

  // FIX: Use a local signal to store notifications fetched asynchronously.
  private _notifications = signal<AppNotification[]>([]);

  constructor() {
    // FIX: Use an effect to reactively fetch notifications when the user changes.
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.loadNotifications(user.id);
      } else {
        this._notifications.set([]); // Clear notifications on logout
      }
    });
  }

  private async loadNotifications(employeeId: number) {
    try {
      this._notifications.set(await this.dataService.getNotificationsForEmployee(employeeId));
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this._notifications.set([]);
    }
  }

  userNotifications = computed(() => {
    // Show latest 10 notifications
    // FIX: Computed property now depends on the local signal.
    return this._notifications()
      .slice() // Create a shallow copy before sorting
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  });
  
  unreadNotificationCount = computed(() => {
    return this._notifications().filter(n => !n.isRead).length;
  });

  onDocumentClick(event: MouseEvent) {
    if (this.isNotificationPanelOpen() && !this.elementRef.nativeElement.querySelector('.notification-panel-container')?.contains(event.target)) {
      this.isNotificationPanelOpen.set(false);
    }
    if (this.isUserMenuOpen() && !this.elementRef.nativeElement.querySelector('.user-menu-container')?.contains(event.target)) {
      this.isUserMenuOpen.set(false);
    }
  }

  toggleNotificationPanel() {
    this.isUserMenuOpen.set(false);
    this.isNotificationPanelOpen.update(v => !v);
  }
  
  toggleUserMenu() {
    this.isNotificationPanelOpen.set(false);
    this.isUserMenuOpen.update(v => !v);
  }

  // FIX: Make method async and reload notifications after update.
  async markAsRead(notification: AppNotification) {
    if (!notification.isRead) {
      await this.dataService.markNotificationAsRead(notification.id);
      const user = this.currentUser();
      if(user) {
        this.loadNotifications(user.id);
      }
    }
  }

  // FIX: Make method async and reload notifications after update.
  async markAllAsRead() {
    const user = this.currentUser();
    if(user) {
      await this.dataService.markAllNotificationsAsRead(user.id);
      this.loadNotifications(user.id);
    }
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
