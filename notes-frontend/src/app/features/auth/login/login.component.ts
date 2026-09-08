import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SocialAuthService, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  error: string = '';
  isLoading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    if (this.authService.getToken()) {
      this.router.navigate(['/dashboard']);
    }

    this.socialAuthService.authState.subscribe((user) => {
      if (user && user.idToken) {
        this.isLoading = true;
        this.authService.googleLogin(user.idToken).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.isLoading = false;
            this.error = err.error?.message || 'Google Login failed. Please try again.';
          }
        });
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }
}
