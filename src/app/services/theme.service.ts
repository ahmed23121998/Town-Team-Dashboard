import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.isDarkMode.asObservable();
  private isBrowser: boolean;

  constructor(private router: Router) {
    this.isBrowser = typeof window !== 'undefined';

    if (this.isBrowser) {
      this.isDarkMode.next(false);
      this.setTheme(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', 'light');
      }
    }
  }

  toggleTheme() {
    const newTheme = !this.isDarkMode.value;
    this.isDarkMode.next(newTheme);

    if (this.isBrowser) {
      this.setTheme(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      }
    }
  }

  private setTheme(isDark: boolean) {
    if (!this.isBrowser) return;

    const currentUrl = this.router.url;

    if (currentUrl.includes('login')) {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dark-theme');
      }
      return;
    }

    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-theme', isDark);
    }
  }
}
