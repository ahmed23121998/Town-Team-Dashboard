import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private auth: Auth, private router: Router) {}

  async login() {
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error = 'Login failed. Please check your credentials.';
    }
  }
}
