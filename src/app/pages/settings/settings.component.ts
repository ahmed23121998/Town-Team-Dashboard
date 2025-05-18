import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import {
  Auth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
} from '@angular/fire/auth';
import { ThemeService } from '../../services/theme.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime, Observable } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  isDarkMode$: Observable<boolean>;
  showPasswordDialog = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private auth: Auth,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;

    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      imageUrl: ['assets/Ahmed.jpg'],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );

    // Listen to auth state changes
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.profileForm.patchValue({
          email: user.email,
        });
      }
    });

    // Auto-save when form changes with debounce
    this.profileForm.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(1000))
      .subscribe(async (value) => {
        if (this.auth.currentUser) {
          try {
            this.loading = true;
            const userDoc = doc(
              this.firestore,
              'users',
              this.auth.currentUser.uid
            );
            await setDoc(userDoc, value, { merge: true });
          } catch (error) {
            console.error('Error saving profile:', error);
          } finally {
            this.loading = false;
          }
        }
      });
  }

  async ngOnInit() {
    try {
      this.loading = true;
      if (this.auth.currentUser) {
        const userDoc = doc(this.firestore, 'users', this.auth.currentUser.uid);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
          const data = snap.data();
          this.profileForm.patchValue({
            ...data,
            email: this.auth.currentUser.email,
          });
        } else {
          // If no data exists, create initial document
          const initialData = {
            email: this.auth.currentUser.email,
            imageUrl: 'assets/Ahmed.jpg',
          };
          await setDoc(userDoc, initialData);
          this.profileForm.patchValue(initialData);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    document.body.classList.toggle(
      'dark-theme',
      !document.body.classList.contains('dark-theme')
    );
  }

  openChangePasswordDialog() {
    this.showPasswordDialog = true;
    this.passwordForm.reset();
  }

  closePasswordDialog(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showPasswordDialog = false;
    this.passwordForm.reset();
  }

  toggleCurrentPassword() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  async changePassword() {
    if (this.passwordForm.valid && this.auth.currentUser) {
      try {
        this.loading = true;
        const { currentPassword, newPassword } = this.passwordForm.value;

        // Reauthenticate user
        const credential = EmailAuthProvider.credential(
          this.auth.currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(this.auth.currentUser, credential);

        // Update password
        await updatePassword(this.auth.currentUser, newPassword);

        this.closePasswordDialog();
      } catch (error: any) {
        console.error('Error changing password:', error);
      } finally {
        this.loading = false;
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
