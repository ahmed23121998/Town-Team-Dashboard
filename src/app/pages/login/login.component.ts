import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  error = '';
  showPassword = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof document !== 'undefined') {
        document.body.classList.add('login-page');
        // إزالة الوضع الليلي عند الدخول لصفحة تسجيل الدخول
        document.body.classList.remove('dark-theme');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', 'light');
      }
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('login-page');
      }
    }
  }

  async login() {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );
      const user = userCredential.user;

      // جلب بيانات المستخدم من Firestore
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : null;

      // عند أول تسجيل دخول، اجعل الدور Admin إذا لم يكن موجودًا
      if (!userData || !('role' in userData)) {
        await setDoc(
          userDocRef,
          {
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ')[1] || '',
            imageUrl: user.photoURL || 'assets/Ahmed.jpg',
            role: 'admin',
          },
          { merge: true }
        );
      } else if (userData['role'] !== 'admin') {
        this.error = 'You must be an admin to log in';
        return;
      } else {
        // تحديث بيانات المستخدم إذا كان بالفعل admin
        await setDoc(
          userDocRef,
          {
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ')[1] || '',
            imageUrl: user.photoURL || 'assets/Ahmed.jpg',
          },
          { merge: true }
        );
      }

      this.router.navigate(['/products']);
    } catch (err: any) {
      this.error = 'You must be an admin to log in';
    }
  }
}
