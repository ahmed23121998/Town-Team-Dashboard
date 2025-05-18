import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ThemeService } from '../../services/theme.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  userEmail: string | null = null;
  userImage: string = 'assets/Ahmed.jpg';
  isDarkMode$;

  constructor(
    public router: Router,
    private auth: Auth,
    public themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.userEmail = user.email;
        this.userImage = user.photoURL || 'assets/Ahmed.jpg';
      }
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isLoginPage() {
    return this.router.url === '/login';
  }
}
