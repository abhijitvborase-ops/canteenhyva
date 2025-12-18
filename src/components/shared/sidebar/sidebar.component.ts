import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DbService } from '../../../app/services/db.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  host: {
    '[class.w-64]': '!isCollapsed()',
    '[class.w-20]': 'isCollapsed()',
    'class':
      'bg-gray-800 text-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out'
  }
})
export class SidebarComponent {

  private db = inject(DbService);
  private router = inject(Router);

  /* =========================
     STATE
     ========================= */
  isCollapsed = signal(false);

  currentUser = computed(() => this.db.currentUser());

  isSuperAdmin = computed(() => {
    const user = this.currentUser();
    return user?.employee_code === 'admin01';
  });

  /* =========================
     ACTIONS
     ========================= */
  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  handleLogout() {
    this.db.logout();
    this.router.navigate(['/login']);
  }
}
