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
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from '@angular/fire/firestore';

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

      const userDocRef = doc(this.firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : null;

      // التحقق من وجود Admin
      const usersSnapshot = await getDocs(collection(this.firestore, 'users'));
      const hasAdmin = usersSnapshot.docs.some(
        (doc: QueryDocumentSnapshot<DocumentData>) =>
          doc.data()['role'] === 'admin'
      );

      // تعيين أول مستخدم كـ Admin إذا لم يوجد
      if (!hasAdmin) {
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ')[1] || '',
            imageUrl: user.photoURL || 'assets/Ahmed.jpg',
            role: 'admin',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else if (!userData || userData['role'] !== 'admin') {
        this.error = 'You must be an admin to log in';
        return;
      } else {
        // المستخدم Admin - تحديث البيانات
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

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error = 'You must be an admin to log in';
    }
  }
  async addAdminManually() {
    const user = this.auth.currentUser;

    if (!user) {
      this.error = 'سجّل دخول أولاً قبل تفعيل الـ Admin';
      return;
    }

    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ')[1] || '',
        imageUrl: user.photoURL || 'assets/Ahmed.jpg',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    this.error = '✅ تم تعيينك كـ Admin. أعد تسجيل الدخول.';
  }
}
