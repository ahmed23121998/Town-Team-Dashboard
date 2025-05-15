import { Injectable, NgZone, DestroyRef, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {Firestore,collection,collectionData,doc,addDoc,updateDoc,deleteDoc,query,orderBy,DocumentData,CollectionReference,} from '@angular/fire/firestore';
import { Observable, shareReplay } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private cache = new Map<string, Observable<any[]>>();
  private destroyRef = inject(DestroyRef);
  private injector = inject(EnvironmentInjector);

  constructor(private firestore: Firestore, private ngZone: NgZone) {}

  private getPathString(path: string[]): string {
    return path.join('/');
  }

  private getCollectionRef(path: string[]): CollectionReference<DocumentData> {
    return collection(this.firestore, this.getPathString(path));
  }

  getCollection(path: string[]): Observable<any[]> {
    const pathString = this.getPathString(path);

    if (!this.cache.has(pathString)) {
      const data$ = runInInjectionContext(this.injector, () => {
        const collectionRef = this.getCollectionRef(path);
        const q = query(collectionRef, orderBy('createdAt', 'desc'));

        return collectionData(q, { idField: 'id' }).pipe(
          takeUntilDestroyed(this.destroyRef),
          shareReplay(1)
        );
      });

      this.cache.set(pathString, data$);
    }

    return this.cache.get(pathString)!;
  }

  async addDocument(path: string[], data: any): Promise<string> {
    try {
      const collectionRef = this.getCollectionRef(path);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async updateDocument(path: string[], id: string, data: any): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(path), id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(path: string[], id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(path), id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  clearCache(path?: string[]) {
    if (path) {
      const pathString = this.getPathString(path);
      this.cache.delete(pathString);
    } else {
      this.cache.clear();
    }
  }
}
