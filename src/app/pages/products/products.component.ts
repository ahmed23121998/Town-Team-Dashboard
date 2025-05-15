import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  products: any[] = [];

  categories = [
    'men',
    'kids',
    'newarrival',
    'summer',
    'winter',
    'favorites',
    'allcollections',
  ];
  docIds = ['closes', 'opens', 'jackets']; // عدل حسب بياناتك
  subcollections = ['Boys Jackets', 'Girls Jackets', 'Shoes']; // عدل حسب بياناتك

  selectedCategory = this.categories[0];
  selectedDocId = this.docIds[0];
  selectedSubcollection = this.subcollections[0];

  form = {
    title: '',
    price: 0,
    description: '',
    imageUrl: '',
  };

  imageFile: File | null = null;
  editingId: string | null = null;

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    this.loadProducts();
  }

  async loadProducts() {
    const productsRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection
    );
    const snapshot = await getDocs(productsRef);
    this.products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  onFileSelected(event: any) {
    this.imageFile = event.target.files[0] ?? null;
  }

  async uploadImage(): Promise<string> {
    if (!this.imageFile) return '';
    const storage = getStorage();
    const storageRef = ref(
      storage,
      `products/${Date.now()}_${this.imageFile.name}`
    );
    const snapshot = await uploadBytes(storageRef, this.imageFile);
    return await getDownloadURL(snapshot.ref);
  }

  async addProduct() {
    if (!this.form.title || this.form.price <= 0) {
      alert('ادخل اسم المنتج والسعر صحيح');
      return;
    }
    let imageUrl = '';
    if (this.imageFile) {
      imageUrl = await this.uploadImage();
    }
    const productsRef = collection(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection
    );
    await addDoc(productsRef, { ...this.form, imageUrl });
    this.form = { title: '', price: 0, description: '', imageUrl: '' };
    this.imageFile = null;
    await this.loadProducts();
  }

  editProduct(product: any) {
    this.editingId = product.id;
    this.form = {
      title: product.title,
      price: product.price,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
    };
  }

  async updateProduct() {
    if (!this.editingId) return;
    let imageUrl = this.form.imageUrl;
    if (this.imageFile) {
      imageUrl = await this.uploadImage();
    }
    const productDocRef = doc(
      this.firestore,
      this.selectedCategory,
      this.selectedDocId,
      this.selectedSubcollection,
      this.editingId
    );
    await updateDoc(productDocRef, { ...this.form, imageUrl });
    this.editingId = null;
    this.form = { title: '', price: 0, description: '', imageUrl: '' };
    this.imageFile = null;
    await this.loadProducts();
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
    await this.loadProducts();
  }

  async onSelectionChange() {
    this.editingId = null;
    this.form = { title: '', price: 0, description: '', imageUrl: '' };
    this.imageFile = null;
    await this.loadProducts();
  }
}
