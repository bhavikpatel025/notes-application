import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResultDto } from '../../shared/models/auth.model';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;
  
  // Signal to hold current user auth state
  public currentUser = signal<AuthResultDto | null>(null);

  constructor(
    private http: HttpClient, 
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
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

  googleLogin(idToken: string): Observable<AuthResultDto> {
    return this.http.post<AuthResultDto>(`${this.apiUrl}/google-login`, { idToken }).pipe(
      tap(res => this.setAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem('notes_auth');
    this.currentUser.set(null);
    
    // Also sign out from Google so they don't auto-login next time
    if (this.socialAuthService) {
      this.socialAuthService.signOut().catch((err: any) => console.log('Not logged in via Google'));
    }

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
