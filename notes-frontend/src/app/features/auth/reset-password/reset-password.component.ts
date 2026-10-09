import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) return null;

  return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  resetForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  email = '';
  token = '';
  isInvalidLink = false;
  isLoading = false;
  isSuccess = false;
  errorMessage = '';

  showNewPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.email || !this.token) {
      this.isInvalidLink = true;
    }
  }

  onSubmit() {
    if (this.resetForm.invalid || this.isLoading || this.isInvalidLink) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const newPassword = this.resetForm.value.newPassword;

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isSuccess = true;
        this.toastService.show({
          message: 'Password reset successfully! You can now sign in.'
        }, 4000);

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password. The link may have expired or is invalid.';
      }
    });
  }
}
