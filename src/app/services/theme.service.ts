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
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        const isDark = savedTheme === 'dark';
        this.isDarkMode.next(isDark);
        this.setTheme(isDark);
      }
    }
  }

  toggleTheme() {
    const newTheme = !this.isDarkMode.value;
    this.isDarkMode.next(newTheme);

    if (this.isBrowser) {
      this.setTheme(newTheme);
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    }
  }

  private setTheme(isDark: boolean) {
    if (!this.isBrowser) return;

    const currentUrl = this.router.url;

    if (currentUrl.includes('login')) {
      document.body.classList.remove('dark-theme');
      return;
    }

    document.body.classList.toggle('dark-theme', isDark);
  }
}
