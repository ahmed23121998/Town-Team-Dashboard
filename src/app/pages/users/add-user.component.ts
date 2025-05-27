import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from '@angular/fire/firestore';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword as createTempUser,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { isPlatformServer } from '@angular/common';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss'],
  providers: [MessageService],
})
export class AddUserComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  role = '';
  loading = false;

  users: any[] = [];
  searchTerm: string = '';
  filterRole: string = 'all';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  editingUserId: string | null = null;
  showUsers: boolean = false;
  showAddUser: boolean = false;

  showEditModal: boolean = false;
  editForm: any = {
    uid: '',
    name: '',
    email: '',
    role: '',
  };

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private messageService: MessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformServer(this.platformId)) {
      // لا تقم بجلب بيانات المستخدمين أثناء SSR لتجنب مشاكل الـ timeout
      return;
    }
    this.loadUsers();
  }

  async addUser() {
    this.loading = true;

    try {
      if (this.editingUserId) {
        await setDoc(doc(this.firestore, 'users', this.editingUserId), {
          uid: this.editingUserId,
          name: this.name,
          email: this.email,
          role: this.role,
          updatedAt: new Date().toISOString(),
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User updated successfully',
        });

        this.editingUserId = null;
      } else {
        // ✅ إنشاء Firebase App مؤقت
        const tempApp = initializeApp(environment.firebase, 'TempApp');
        const tempAuth = getAuth(tempApp);

        const userCredential = await createTempUser(
          tempAuth,
          this.email,
          this.password
        );

        await setDoc(doc(this.firestore, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: this.name,
          email: this.email,
          role: this.role,
          createdAt: new Date().toISOString(),
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User added successfully!',
        });

        // 🧹 حذف الـ Firebase App المؤقت
        await deleteApp(tempApp);
      }

      this.clearForm();
      this.loadUsers();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error adding/updating user.',
      });
    }

    this.loading = false;
  }
  clearForm() {
    this.editingUserId = null;
    this.name = '';
    this.email = '';
    this.password = '';
    this.role = '';
  }

  async loadUsers() {
    const snapshot = await getDocs(collection(this.firestore, 'users'));
    this.users = snapshot.docs.map((doc) => doc.data());
  }

  editUser(user: any) {
    this.editForm = { ...user };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  async updateUserFromModal() {
    if (!this.editForm.name || !this.editForm.email || !this.editForm.role)
      return;
    try {
      await setDoc(doc(this.firestore, 'users', this.editForm.uid), {
        ...this.editForm,
        updatedAt: new Date().toISOString(),
      });
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'User updated successfully',
      });
      this.showEditModal = false;
      this.loadUsers();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error updating user.',
      });
    }
  }

  async deleteUser(user: any) {
    const confirmDelete = confirm(`Delete user ${user.name}?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(this.firestore, 'users', user.uid));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'User deleted successfully',
      });
      this.loadUsers();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error deleting user',
      });
    }
  }

  filteredUsers() {
    let filtered = this.users;

    if (this.filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === this.filterRole);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term)
      );
    }

    if (this.sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aVal = a[this.sortColumn]?.toLowerCase?.() || a[this.sortColumn];
        const bVal = b[this.sortColumn]?.toLowerCase?.() || b[this.sortColumn];

        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }
}
