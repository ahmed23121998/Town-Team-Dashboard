import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements OnInit {
  categories: string[] = [];

  selectedCategory: string | null = null;
  categoryDocs: any[] = [];
  selectedDocId: string | null = null;
  subcollections: string[] = [];
  selectedSubcollection: string | null = null;
  subcollectionData: any[] = [];
  docData: any = null;
  isLoading = false;
  editRow: any = null;
  newRow: any = null;
  showAddRow: boolean = false;

  showAddCategory = false;
  newCategoryName = '';
  editCategoryName: string | null = null;
  editCategoryNameValue = '';
  showDeleteCategoryConfirm: string | null = null;

  // Subcategory (subcollection) state
  showAddSubModal = false;
  showEditSubModal = false;
  showDeleteSubModal = false;
  newSubName = '';
  editSubName: string | null = null;
  editSubNameValue = '';
  deleteSubName: string | null = null;

  // Sub-subcategory (sub-subcollection) state
  showEditSubItemModal = false;
  editSubItem: any = {};
  editSubItemError: string = '';

  // Track which document's dropdown is open
  docDropdownOpen: string | null = null;

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadCategoriesFromFirebase();
  }

  async loadCategoriesFromFirebase() {
    try {
      const mainCollections = [
        'men',
        'kids',
        'summer',
        'winter',
        'newarrival',
        'allcollections',
      ];
      const categoriesListSnap = await getDocs(
        collection(this.firestore, 'categoriesList')
      );
      const dynamicCategories = categoriesListSnap.docs.map((doc) => doc.id);
      this.categories = Array.from(
        new Set([...mainCollections, ...dynamicCategories])
      );
      // مزامنة مع صفحة المنتجات إذا كانت متاحة
      if ((window as any).updateProductsCategories) {
        (window as any).updateProductsCategories(this.categories);
      }
    } catch (err) {
      this.categories = [
        'men',
        'kids',
        'summer',
        'winter',
        'newarrival',
        'allcollections',
      ];
    }
  }

  async showCategoryData(category: string) {
    this.selectedCategory = category;
    this.selectedDocId = null;
    this.selectedSubcollection = null;
    this.categoryDocs = [];
    this.subcollections = [];
    this.subcollectionData = [];
    this.isLoading = true;
    try {
      const docsSnap = await getDocs(collection(this.firestore, category));
      this.categoryDocs = docsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      this.categoryDocs = [];
    } finally {
      this.isLoading = false;
    }
  }

  toggleDocDropdown(doc: any) {
    if (this.docDropdownOpen === doc.id) {
      this.docDropdownOpen = null;
    } else {
      this.selectedDocId = doc.id;
      this.subcollections = doc.subcollections || [];
      this.docDropdownOpen = doc.id;
    }
  }

  closeDocDropdown() {
    this.docDropdownOpen = null;
  }

  showDocSubcollections(doc: any) {
    this.selectedDocId = doc.id;
    this.selectedSubcollection = null;
    this.subcollections = doc.subcollections || [];
    this.subcollectionData = [];
  }

  showDocData(doc: any) {
    this.selectedDocId = doc.id;
    this.selectedSubcollection = null;
    this.subcollections = doc.subcollections || [];
    const { id, subcollections, ...data } = doc;
    this.docData = data;
    this.subcollectionData = [];
  }

  async showSubcollectionData(sub: string) {
    if (!this.selectedCategory || !this.selectedDocId) return;
    this.selectedSubcollection = sub;
    this.isLoading = true;
    this.subcollectionData = [];
    try {
      const colRef = collection(
        this.firestore,
        this.selectedCategory,
        this.selectedDocId,
        sub
      );
      const snap = await getDocs(colRef);
      this.subcollectionData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      alert('Error loading subcollection data');
    }
    this.isLoading = false;
  }

  async addRow() {
    if (!this.selectedCategory || !this.selectedSubcollection || !this.newRow)
      return;
    const colRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId!,
      this.selectedSubcollection
    );
    // تحويل price/quantity إلى رقم
    if (this.newRow.price) this.newRow.price = Number(this.newRow.price);
    if (this.newRow.quantity)
      this.newRow.quantity = Number(this.newRow.quantity);
    // in_stock كنص
    if (this.newRow.in_stock === 'in stock') this.newRow.in_stock = true;
    if (this.newRow.in_stock === 'out of stock') this.newRow.in_stock = false;
    await addDoc(colRef, this.newRow);
    this.newRow = null;
    this.showAddRow = false;
    await this.showSubcollectionData(this.selectedSubcollection);
  }

  async deleteRow(id: string) {
    if (!this.selectedCategory || !this.selectedSubcollection) return;
    const docRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId!,
      this.selectedSubcollection,
      id
    );
    await deleteDoc(docRef);
    await this.showSubcollectionData(this.selectedSubcollection);
  }

  startEdit(row: any) {
    this.editRow = { ...row };
  }

  cancelEdit() {
    this.editRow = null;
  }

  async saveEdit() {
    if (
      !this.selectedCategory ||
      !this.selectedSubcollection ||
      !this.editRow?.id
    )
      return;
    const docRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId!,
      this.selectedSubcollection,
      this.editRow.id
    );
    const { id, ...data } = this.editRow;
    await updateDoc(docRef, data);
    this.editRow = null;
    await this.showSubcollectionData(this.selectedSubcollection);
  }

  async deleteCategory(category: string) {
    this.confirmDeleteCategory(category);
  }

  confirmDeleteCategory(category: string) {
    this.showDeleteCategoryConfirm = category;
  }

  async deleteCategoryConfirmed() {
    if (!this.showDeleteCategoryConfirm) return;
    const category = this.showDeleteCategoryConfirm;
    this.categories = this.categories.filter((c) => c !== category);
    this.showDeleteCategoryConfirm = null;
    try {
      const docsSnap = await getDocs(collection(this.firestore, category));
      for (const d of docsSnap.docs) {
        await deleteDoc(doc(this.firestore, category, d.id));
      }
      await deleteDoc(doc(this.firestore, 'categoriesList', category));
    } catch (err) {
      alert('Error deleting category from Firebase');
    }
  }

  cancelDeleteCategory() {
    this.showDeleteCategoryConfirm = null;
  }

  trackByCategory(index: number, category: string) {
    return category;
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  async addCategory() {
    if (!this.newCategoryName.trim()) return;
    const name = this.newCategoryName.trim();
    if (this.categories.includes(name)) return;
    this.categories.push(name);
    this.newCategoryName = '';
    this.showAddCategory = false;
    try {
      await setDoc(doc(this.firestore, name, name), {
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(this.firestore, 'categoriesList', name), {
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      alert('Error adding category to Firebase');
    }
  }

  editCategory(category: string) {
    this.editCategoryName = category;
    this.editCategoryNameValue = category;
  }

  async saveEditCategory() {
    if (!this.editCategoryNameValue.trim() || !this.editCategoryName) return;
    const idx = this.categories.indexOf(this.editCategoryName);
    if (idx > -1) {
      const oldName = this.categories[idx];
      const newName = this.editCategoryNameValue.trim();
      this.categories[idx] = newName;
      try {
        const oldDocRef = doc(this.firestore, oldName, oldName);
        const newDocRef = doc(this.firestore, newName, newName);
        const oldSnap = await getDocs(collection(this.firestore, oldName));
        for (const d of oldSnap.docs) {
          if (d.id === oldName) {
            await setDoc(newDocRef, d.data());
            await deleteDoc(oldDocRef);
          } else {
            const subDocRef = doc(this.firestore, newName, d.id);
            await setDoc(subDocRef, d.data());
            await deleteDoc(doc(this.firestore, oldName, d.id));
          }
        }
        await setDoc(doc(this.firestore, 'categoriesList', newName), {
          createdAt: new Date().toISOString(),
        });
        await deleteDoc(doc(this.firestore, 'categoriesList', oldName));
      } catch (err) {
        alert('Error updating category in Firebase');
      }
    }
    this.editCategoryName = null;
    this.editCategoryNameValue = '';
  }

  openAddSubModal() {
    this.newSubName = '';
    this.showAddSubModal = true;
  }
  closeAddSubModal() {
    this.showAddSubModal = false;
  }
  async addSubcategory() {
    if (
      !this.selectedDocId ||
      !this.selectedCategory ||
      !this.newSubName.trim()
    )
      return;
    const subName = this.newSubName.trim();
    if (this.subcollections.includes(subName)) return;
    this.subcollections.push(subName);
    // Update subcollections array in Firestore
    const docRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId
    );
    await updateDoc(docRef, { subcollections: this.subcollections });
    // Create the subcollection in Firestore (add a dummy doc if empty)
    const subColRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      subName
    );
    await addDoc(subColRef, {
      createdAt: new Date().toISOString(),
      dummy: true,
    });
    this.showAddSubModal = false;
    this.newSubName = '';
    // تحديث الواجهة مباشرة بعد الإضافة
    this.subcollections = [...this.subcollections]; // لإجبار Angular على التحديث
  }

  openEditSubModal(sub: string) {
    this.editSubName = sub;
    this.editSubNameValue = sub;
    this.showEditSubModal = true;
  }
  closeEditSubModal() {
    this.showEditSubModal = false;
    this.editSubName = null;
    this.editSubNameValue = '';
  }
  async saveEditSubcategory() {
    if (
      !this.selectedDocId ||
      !this.selectedCategory ||
      !this.editSubName ||
      !this.editSubNameValue.trim()
    )
      return;
    const idx = this.subcollections.indexOf(this.editSubName);
    if (idx > -1) {
      this.subcollections[idx] = this.editSubNameValue.trim();
      // Update subcollections array in Firestore
      const docRef = doc(
        this.firestore,
        this.selectedCategory,
        this.selectedDocId
      );
      await updateDoc(docRef, { subcollections: this.subcollections });
    }
    this.closeEditSubModal();
  }

  openEditSubItemModal(item: any) {
    this.editSubItem = { ...item };
    this.editSubItemError = '';
    this.showEditSubItemModal = true;
  }
  closeEditSubItemModal() {
    this.showEditSubItemModal = false;
    this.editSubItem = {};
    this.editSubItemError = '';
  }
  async saveEditSubItem() {
    // تحقق من الحقول المطلوبة
    if (
      !this.editSubItem.title ||
      !this.editSubItem.price ||
      !this.editSubItem.quantity
    ) {
      this.editSubItemError =
        'يرجى تعبئة جميع الحقول المطلوبة (العنوان، السعر، الكمية)';
      return;
    }
    if (
      !this.selectedCategory ||
      !this.selectedDocId ||
      !this.selectedSubcollection ||
      !this.editSubItem.id
    )
      return;
    const docRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection,
      this.editSubItem.id
    );
    const { id, ...data } = this.editSubItem;
    // Convert price/quantity to number if needed
    if (data.price && typeof data.price === 'string')
      data.price = Number(data.price);
    if (data.quantity && typeof data.quantity === 'string')
      data.quantity = Number(data.quantity);
    await updateDoc(docRef, data);
    this.closeEditSubItemModal();
    await this.showSubcollectionData(this.selectedSubcollection);
  }

  openDeleteSubModal(sub?: string) {
    if (sub) this.deleteSubName = sub;
    this.showDeleteSubModal = true;
  }
  closeDeleteSubModal() {
    this.showDeleteSubModal = false;
  }
  async deleteSubcategoryConfirmed() {
    if (!this.selectedDocId || !this.selectedCategory || !this.deleteSubName)
      return;
    // حذف جميع بيانات السابكوليكشن من فايربيز فعليًا
    const subColRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.deleteSubName
    );
    try {
      const docsSnap = await getDocs(subColRef);
      for (const d of docsSnap.docs) {
        await deleteDoc(
          doc(
            this.firestore,
            this.selectedCategory,
            this.selectedDocId,
            this.deleteSubName,
            d.id
          )
        );
      }
    } catch {}
    // إزالة اسم السابكوليكشن من مصفوفة السابكوليكشنات
    this.subcollections = this.subcollections.filter(
      (s) => s !== this.deleteSubName
    );
    // تحديث مصفوفة السابكوليكشنات في فايربيز
    const docRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId
    );
    await updateDoc(docRef, { subcollections: this.subcollections });
    // إعادة تحميل بيانات الوثيقة من فايربيز لضمان التزامن
    await this.reloadCurrentDoc();
    // تحديث بيانات القائمة في الواجهة (categoryDocs)
    await this.showCategoryData(this.selectedCategory);
    // إذا كانت السابكاتيجوري المحذوفة هي المعروضة حاليًا، امسح بياناتها من الجدول
    if (this.selectedSubcollection === this.deleteSubName) {
      this.selectedSubcollection = null;
      this.subcollectionData = [];
    }
    this.closeDeleteSubModal();
    this.deleteSubName = null;
  }

  // دالة جديدة لإعادة تحميل بيانات الوثيقة الحالية
  async reloadCurrentDoc() {
    if (!this.selectedCategory || !this.selectedDocId) return;
    try {
      const docSnap = await getDocs(
        collection(this.firestore, this.selectedCategory)
      );
      const docData = docSnap.docs
        .find((d) => d.id === this.selectedDocId)
        ?.data();
      if (docData) {
        this.subcollections = docData['subcollections'] || [];
      }
    } catch {}
  }

  clearSubcollectionData() {
    this.selectedSubcollection = null;
    this.subcollectionData = [];
  }
}
