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
      if ([401, 403].includes(err.status)) {
        // Auto logout if 401 Unauthorized or 403 Forbidden response returned from api
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
