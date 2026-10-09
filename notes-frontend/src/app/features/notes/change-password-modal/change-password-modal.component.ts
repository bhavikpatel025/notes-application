import { Component, Output, EventEmitter, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password-modal.component.html',
  styleUrls: ['./change-password-modal.component.scss']
})
export class ChangePasswordModalComponent implements AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  @ViewChild('currentPasswordInput') currentPasswordInput?: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor() {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.currentPasswordInput?.nativeElement.focus();
    }, 100);
  }

  passwordMatchValidator(group: FormGroup) {
    const currentPass = group.get('currentPassword')?.value;
    const newPass = group.get('newPassword')?.value;
    const confirmPass = group.get('confirmPassword')?.value;

    const errors: Record<string, boolean> = {};

    if (newPass && confirmPass && newPass !== confirmPass) {
      errors['mismatch'] = true;
    }

    if (currentPass && newPass && currentPass === newPass) {
      errors['sameAsCurrent'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const { currentPassword, newPassword } = this.form.value;

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toastService.show({ message: res.message || 'Password changed successfully! 🔐' });
        this.success.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.Message || err?.error?.message || err?.message || 'Failed to update password. Please check your current password.';
      }
    });
  }

  onCancel(): void {
    if (!this.isSubmitting) {
      this.close.emit();
    }
  }
}
