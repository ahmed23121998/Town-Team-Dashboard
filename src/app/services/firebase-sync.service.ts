import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  collection,
  onSnapshot,
  query,
  orderBy,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class FirebaseSyncService {
  private unsubscribes: (() => void)[] = [];
  private readonly STORAGE_PREFIX = 'firebase_sync_';
  private isBrowser: boolean;

  constructor(
    private firestore: Firestore,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // بدء الاستماع للتغييرات
  startSync() {
    if (!this.isBrowser) return;

    const collections = ['products', 'categories', 'orders'];
    collections.forEach((collectionName) => {
      this.syncCollection(collectionName);
    });
  }

  // مزامنة مجموعة محددة
  private syncCollection(collectionName: string) {
    try {
      const collectionRef = collection(this.firestore, collectionName);
      const q = query(collectionRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // The snapshot is handled by the components that need the data
          console.log(`${collectionName} synchronized successfully`);
        },
        (error) => {
          console.error(`Error syncing ${collectionName}:`, error);
        }
      );

      this.unsubscribes.push(unsubscribe);
    } catch (error) {
      console.error(`Error setting up sync for ${collectionName}:`, error);
    }
  }

  // حفظ البيانات في localStorage
  private saveToLocalStorage(key: string, data: any) {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Updated local storage: ${key}`);
    } catch (error: any) {
      console.error(
        `❌ Error saving to localStorage: ${error?.message || 'Unknown error'}`
      );
    }
  }

  // حذف البيانات من localStorage
  private removeFromLocalStorage(key: string) {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(key);
      console.log(`✅ Removed from local storage: ${key}`);
    } catch (error: any) {
      console.error(
        `❌ Error removing from localStorage: ${
          error?.message || 'Unknown error'
        }`
      );
    }
  }

  // الحصول على مفتاح التخزين
  private getStorageKey(collectionName: string, docId: string): string {
    return `${this.STORAGE_PREFIX}${collectionName}_${docId}`;
  }

  // قراءة البيانات المخزنة محلياً
  getLocalData(collectionName: string, docId: string): any {
    const key = this.getStorageKey(collectionName, docId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // الحصول على جميع البيانات المخزنة لمجموعة معينة
  getAllLocalData(collectionName: string): any[] {
    const prefix = `${this.STORAGE_PREFIX}${collectionName}_`;
    const data: any[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          data.push(JSON.parse(value));
        }
      }
    }

    return data;
  }

  // إيقاف الاستماع للتغييرات
  stopSync() {
    if (!this.isBrowser) return;

    this.unsubscribes.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.unsubscribes = [];
  }

  // مسح جميع البيانات المخزنة محلياً
  clearLocalData() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
