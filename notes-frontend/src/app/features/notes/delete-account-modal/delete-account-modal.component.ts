import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-delete-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-account-modal.component.html',
  styleUrls: ['./delete-account-modal.component.scss']
})
export class DeleteAccountModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  authService = inject(AuthService);
  private toastService = inject(ToastService);

  hasPassword = true;
  isLoadingStatus = true;
  password = '';
  confirmText = '';
  showPassword = false;
  isDeleting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.authService.hasPassword().subscribe({
      next: (res) => {
        this.hasPassword = res.hasPassword;
        this.isLoadingStatus = false;
      },
      error: () => {
        // Fallback: assume password is required
        this.hasPassword = true;
        this.isLoadingStatus = false;
      }
    });
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email || '';
  }

  get canSubmit(): boolean {
    if (this.isLoadingStatus || this.isDeleting) return false;
    if (this.hasPassword) {
      return this.password.trim().length > 0;
    } else {
      const trimmed = this.confirmText.trim();
      return trimmed.toUpperCase() === 'DELETE' || (!!this.userEmail && trimmed.toLowerCase() === this.userEmail.toLowerCase());
    }
  }

  onSubmit(): void {
    if (!this.canSubmit) return;

    this.errorMessage = '';
    this.isDeleting = true;

    const payload = this.hasPassword
      ? { password: this.password }
      : { confirmationText: this.confirmText };

    this.authService.deleteAccount(payload).subscribe({
      next: () => {
        this.isDeleting = false;
        this.toastService.show({ message: 'Your account has been deleted permanently.' });
        this.close.emit();
        this.authService.logout();
      },
      error: (err) => {
        this.isDeleting = false;
        this.errorMessage = err?.error?.Message || err?.error?.message || err?.message || 'Failed to delete account. Please try again.';
      }
    });
  }

  onCancel(): void {
    if (!this.isDeleting) {
      this.close.emit();
    }
  }
}
