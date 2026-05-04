import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = 0;
  isLoading = signal(false);
  private showStartTime: number = 0;
  private hideTimeout: any;

  show() {
    if (this.activeRequests === 0) {
      this.showStartTime = Date.now();
      this.isLoading.set(true);
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
    }
    this.activeRequests++;
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      
      const elapsedTime = Date.now() - this.showStartTime;
      const minDisplayTime = 500; // 0.5s es el tiempo ideal UX para evitar parpadeos y sentirse rápido
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      if (remainingTime > 0) {
        if (!this.hideTimeout) {
          this.hideTimeout = setTimeout(() => {
            if (this.activeRequests === 0) {
              this.isLoading.set(false);
            }
            this.hideTimeout = null;
          }, remainingTime);
        }
      } else {
        this.isLoading.set(false);
      }
    }
  }
}
