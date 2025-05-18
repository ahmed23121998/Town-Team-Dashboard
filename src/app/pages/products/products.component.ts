import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Firestore,
  onSnapshot,
  QuerySnapshot,
  getDocs,
  getDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  products: any[] = [];
  categories = [
    'men',
    'kids',
    'summer',
    'winter',
    'newarrival',
    'allcollections',
  ];
  docIds: string[] = [];
  subcollections: string[] = [];
  selectedCategory = this.categories[0];
  selectedDocId: string = '';
  selectedSubcollection: string = '';

  // Modal logic for add
  showAddModal = false;
  modalForm = {
    imageUrl: '',
    productName: '',
    category: '',
    price: null,
    in_stock: '',
    quantity: null,
  };

  // Edit modal logic
  showEditModal = false;
  editForm = {
    id: '',
    productName: '',
    price: '',
    in_stock: '',
    quantity: '',
  };

  // Real-time sync
  unsubscribeProducts: (() => void) | null = null;
  entriesToShow = 2;

  searchTerm: string = '';

  ngOnInit() {
    this.loadDocIdsForCollection(this.selectedCategory);
  }

  ngOnDestroy() {
    if (this.unsubscribeProducts) {
      this.unsubscribeProducts();
    }
  }

  // جلب كل document IDs من الكوليكشن مع تشخيص الأخطاء
  async loadDocIdsForCollection(collectionName: string) {
    const colRef = collection(this.firestore, collectionName);
    let snapshot = await getDocs(colRef);
    if (snapshot.docs.length === 0) {
      this.ngZone.run(() => {
        this.docIds = [];
        this.selectedDocId = '';
        this.subcollections = [];
        this.selectedSubcollection = '';
        this.products = [];
      });
      return;
    }
    // تحقق من الدوكمنتات الفارغة (بدون حقول)
    const emptyDocs = snapshot.docs.filter(
      (doc) => Object.keys(doc.data()).length === 0
    );
    for (const docSnap of emptyDocs) {
      try {
        const docRef = doc(colRef, docSnap.id);
        await updateDoc(docRef, { dummy: true });
      } catch (err) {
        console.error(err);
      }
    }
    snapshot = await getDocs(colRef);
    this.ngZone.run(() => {
      this.docIds = snapshot.docs.map((doc) => doc.id);
      this.selectedDocId = this.docIds[0] || '';
      this.subcollections = [];
      this.selectedSubcollection = '';
      this.products = [];
      if (this.selectedDocId) {
        this.loadSubcollectionsForDoc(collectionName, this.selectedDocId);
      }
    });
  }

  async loadSubcollectionsForDoc(collectionName: string, docId: string) {
    const docRef = doc(this.firestore, collectionName, docId);
    const docSnap = await getDoc(docRef);
    const subcollections = docSnap.data()?.['subcollections'] || [];
    this.ngZone.run(() => {
      this.subcollections = subcollections;
      this.selectedSubcollection = this.subcollections[0] || '';
      this.products = [];
      if (this.selectedSubcollection) {
        this.loadProducts(collectionName, docId, this.selectedSubcollection);
      }
    });
  }

  async loadProducts(
    collectionName: string,
    docId: string,
    subcollection: string
  ) {
    const subColRef = collection(
      this.firestore,
      collectionName,
      docId,
      subcollection
    );
    const snapshot = await getDocs(subColRef);
    this.ngZone.run(() => {
      this.products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    });
  }

  async onCategoryChange() {
    await this.loadDocIdsForCollection(this.selectedCategory);
  }

  async onDocIdChange() {
    if (this.selectedDocId) {
      await this.loadSubcollectionsForDoc(
        this.selectedCategory,
        this.selectedDocId
      );
    }
  }

  async onSubcollectionChange() {
    if (this.selectedSubcollection) {
      await this.loadProducts(
        this.selectedCategory,
        this.selectedDocId,
        this.selectedSubcollection
      );
    }
  }

  async deleteProduct(id: string) {
    const productDocRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection,
      id
    );
    await deleteDoc(productDocRef);
  }

  openAddModal() {
    this.showAddModal = true;
    this.modalForm = {
      imageUrl: '',
      productName: '',
      category: '',
      price: null,
      in_stock: '',
      quantity: null,
    };
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  generateRandomOrderId() {
    return Math.floor(Math.random() * 1e15).toString();
  }

  async addProductFromModal() {
    const price = Number(this.modalForm.price);
    if (!this.modalForm.productName || price <= 0) {
      alert('Enter the product name and price correctly');
      return;
    }
    const productsRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection
    );
    const randomOrderId = this.generateRandomOrderId();
    await addDoc(productsRef, {
      orderId: randomOrderId,
      product: { title: this.modalForm.productName },
      image: { src: this.modalForm.imageUrl },
      category: this.modalForm.category,
      price: { amount: price },
      in_stock: this.modalForm.in_stock,
      quantity: this.modalForm.quantity,
    });
    this.closeAddModal();
  }

  openEditModal(product: any) {
    this.showEditModal = true;
    let inStockValue = product.in_stock;
    if (inStockValue === true) inStockValue = 'in stock';
    if (inStockValue === false) inStockValue = 'out of stock';
    this.editForm = {
      id: product.id,
      productName:
        product.product?.title || product.productName || product.title || '',
      price: product.price?.amount || 0,
      in_stock: inStockValue || '',
      quantity: product.quantity,
    };
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  async updateProductFromModal() {
    if (!this.editForm.id) return;
    const productDocRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection,
      this.editForm.id
    );
    await updateDoc(productDocRef, {
      product: { title: this.editForm.productName },
      price: { amount: Number(this.editForm.price) },
      in_stock: this.editForm.in_stock,
      quantity: this.editForm.quantity,
    });
    this.closeEditModal();
  }

  filteredProducts() {
    if (!this.searchTerm) return this.products;
    const term = this.searchTerm.toLowerCase();
    return this.products.filter(
      (product) =>
        (product.product?.title || product.productName || '')
          .toLowerCase()
          .includes(term) ||
        (product.category || '').toLowerCase().includes(term) ||
        (product.orderId || '').toLowerCase().includes(term)
    );
  }
}
