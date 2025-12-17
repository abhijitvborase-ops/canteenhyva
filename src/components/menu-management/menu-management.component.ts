import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-menu-management',
  templateUrl: './menu-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class MenuManagementComponent {
  private dataService = inject(DataService);

  private today = new Date();
  private todayDateString = `${this.today.getFullYear()}-${(this.today.getMonth() + 1).toString().padStart(2, '0')}-${this.today.getDate().toString().padStart(2, '0')}`;
  
  selectedDate = signal(this.todayDateString);
  statusMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  menuForm = new FormGroup({
    breakfastMenu: new FormControl(''),
    lunchDinnerMenu: new FormControl('')
  });

  constructor() {
    // FIX: Effect callback needs to be async to handle promise from getMenuForDate.
    effect(async () => {
      const dateId = this.selectedDate();
      const menuForDate = await this.dataService.getMenuForDate(dateId);
      this.menuForm.patchValue({
        breakfastMenu: menuForDate?.breakfastMenu || '',
        lunchDinnerMenu: menuForDate?.lunchDinnerMenu || ''
      }, { emitEvent: false }); // Prevent infinite loop if valueChanges is used
    });
  }

  onDateChange(event: Event) {
    this.selectedDate.set((event.target as HTMLInputElement).value);
  }

  async saveMenu() {
    const dateId = this.selectedDate();
    const menuData = {
      id: dateId,
      breakfastMenu: this.menuForm.value.breakfastMenu || '',
      lunchDinnerMenu: this.menuForm.value.lunchDinnerMenu || ''
    };
    // FIX: await the promise from the service call.
    await this.dataService.upsertMenu(menuData);
    this.statusMessage.set({ type: 'success', text: `Menu for ${dateId} has been saved successfully.` });
    setTimeout(() => this.statusMessage.set(null), 5000);
  }
}
