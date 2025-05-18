import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  phoneNumber?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  async createOrUpdateUser(userData: Partial<UserData>) {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No authenticated user found');

      const userRef = doc(this.firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      const now = new Date().toISOString();
      
      if (userDoc.exists()) {
        // تحديث المستخدم الحالي
        await setDoc(userRef, {
          ...userDoc.data(),
          ...userData,
          updatedAt: now
        }, { merge: true });
      } else {
        // إنشاء مستخدم جديد
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: userData.displayName || user.displayName || '',
          name: userData.name || '',
          phoneNumber: userData.phoneNumber || '',
          role: 'user',
          createdAt: now,
          updatedAt: now,
          ...userData
        });
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getCurrentUserData(): Promise<UserData | null> {
    try {
      const user = this.auth.currentUser;
      if (!user) return null;

      const userRef = doc(this.firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }
} 