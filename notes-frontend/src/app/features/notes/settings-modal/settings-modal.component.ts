import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss']
})
export class SettingsModalComponent {
  @Input() isDarkMode: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() themeToggle = new EventEmitter<void>();
  @Output() openChangePassword = new EventEmitter<void>();
  @Output() openDeleteAccount = new EventEmitter<void>();

  authService = inject(AuthService);

  onClose(): void {
    this.close.emit();
  }

  onToggleTheme(enableDark: boolean): void {
    if (this.isDarkMode !== enableDark) {
      this.themeToggle.emit();
    }
  }

  onChangePassword(): void {
    this.openChangePassword.emit();
  }

  onDeleteAccount(): void {
    this.openDeleteAccount.emit();
  }
}
