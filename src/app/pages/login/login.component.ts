import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

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

  constructor(
    private auth: Auth,
    private router: Router,
    private userService: UserService
  ) {}

  async login() {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      
      // إنشاء أو تحديث بيانات المستخدم في Firestore
      await this.userService.createOrUpdateUser({
        email: this.email,
        displayName: userCredential.user.displayName || '',
      });
      
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error = 'Login failed. Please check your credentials.';
      console.error('Login error:', err);
    }
  }
}
