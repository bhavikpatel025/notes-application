import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResultDto } from '../../shared/models/auth.model';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;
  
  // Signal to hold current user auth state
  public currentUser = signal<AuthResultDto | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  register(data: any): Observable<AuthResultDto> {
    return this.http.post<AuthResultDto>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.setAuth(res))
    );
  }

  login(data: any): Observable<AuthResultDto> {
    return this.http.post<AuthResultDto>(`${this.apiUrl}/login`, data).pipe(
      tap(res => this.setAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem('notes_auth');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentUser()?.token || null;
  }

  private setAuth(authResult: AuthResultDto): void {
    localStorage.setItem('notes_auth', JSON.stringify(authResult));
    this.currentUser.set(authResult);
  }

  private loadUserFromStorage(): void {
    const stored = localStorage.getItem('notes_auth');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }
}
