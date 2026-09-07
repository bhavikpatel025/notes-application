import { Injectable, signal } from '@angular/core';

export interface ToastConfig {
  message: string;
  actionLabel?: string;
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastConfig = signal<ToastConfig | null>(null);
  public readonly currentToast = this.toastConfig.asReadonly();
  private timeoutId: any;

  show(config: ToastConfig, duration = 4000) {
    this.toastConfig.set(config);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.toastConfig.set(null);
    }, duration);
  }

  hide() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.toastConfig.set(null);
  }

  executeAction() {
    const config = this.toastConfig();
    if (config?.action) {
      config.action();
      this.hide();
    }
  }
}
