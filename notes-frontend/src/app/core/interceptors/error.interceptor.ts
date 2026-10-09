import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      // Exclude PIN lock/unlock/remove-lock endpoints, public endpoints, and login from session auto-logout
      const isLockRelated = req.url.includes('/unlock') || req.url.includes('/lock') || req.url.includes('/remove-lock');
      const isPublicEndpoint = req.url.includes('/public/');
      const isAuthLogin = req.url.includes('/Auth/login');

      if ([401, 403].includes(err.status) && !isLockRelated && !isAuthLogin && !isPublicEndpoint) {
        // Auto logout if 401 Unauthorized or 403 Forbidden response returned from api
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
