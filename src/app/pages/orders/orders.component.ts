import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp, DocumentData } from 'firebase/firestore';
import {
  Firestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  collectionGroup,
  getDoc,
  setDoc
} from '@angular/fire/firestore';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  category?: string;
}

export interface Order {
  id?: string;
  userId: string;
  products: Product[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface UserData {
  displayName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    ToastModule,
    OverlayPanelModule
  ],
  providers: [MessageService],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';
  isLoading: boolean = true;
  first: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  unsubscribers: (() => void)[] = [];

  constructor(
    private firestore: Firestore,
    private ngZone: NgZone,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadOrdersLive();
  }

  ngOnDestroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
  }

  loadOrdersLive() {
    try {
      const cartQuery = collectionGroup(this.firestore, 'cart');
      
      const unsubscribe = onSnapshot(cartQuery, async (snapshot) => {
        const allOrders: Order[] = [];
        
        for (const docSnap of snapshot.docs) {
          const userId = docSnap.ref.path.split('/')[1];
          const data = docSnap.data();
          
          // Get user document
          const userRef = doc(this.firestore, 'users', userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data() as UserData | undefined;

          // إذا لم يكن هناك بيانات مستخدم، نقوم بإنشاء وثيقة جديدة
          if (!userSnap.exists() || !userData) {
            try {
              const cartRef = doc(this.firestore, `users/${userId}/cart/${docSnap.id}`);
              const cartData = await getDoc(cartRef);
              const customerData = cartData.data();
              
              if (customerData) {
                await setDoc(userRef, {
                  uid: userId,
                  email: customerData['email'] || 'No Email',
                  name: customerData['customerName'] || 'Customer',
                  phoneNumber: customerData['phone'] || '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                
                // إعادة جلب بيانات المستخدم بعد إنشائها
                const updatedUserSnap = await getDoc(userRef);
                const updatedUserData = updatedUserSnap.data() as UserData;
                
                const order: Order = {
                  id: docSnap.id,
                  userId: userId,
                  products: [{
                    id: data['id'] || docSnap.id,
                    name: data['title'] || '',
                    quantity: data['quantity'] || 1,
                    price: data['price'] || 0,
                    image: data['image'] || '',
                    category: data['category'] || ''
                  }],
                  totalAmount: (data['price'] || 0) * (data['quantity'] || 1),
                  status: (data['status'] as Order['status']) || 'pending',
                  orderDate: data['orderDate'] instanceof Timestamp 
                    ? data['orderDate'].toDate() 
                    : (data['orderDate'] instanceof Date ? data['orderDate'] : new Date()),
                  customerName: updatedUserData?.name || updatedUserData?.email || 'Customer',
                  customerEmail: updatedUserData?.email || '',
                  customerPhone: updatedUserData?.phoneNumber || ''
                };
                
                allOrders.push(order);
                continue;
              }
            } catch (error) {
              console.error('Error creating user document:', error);
            }
          }

          const order: Order = {
            id: docSnap.id,
            userId: userId,
            products: [{
              id: data['id'] || docSnap.id,
              name: data['title'] || '',
              quantity: data['quantity'] || 1,
              price: data['price'] || 0,
              image: data['image'] || '',
              category: data['category'] || ''
            }],
            totalAmount: (data['price'] || 0) * (data['quantity'] || 1),
            status: (data['status'] as Order['status']) || 'pending',
            orderDate: data['orderDate'] instanceof Timestamp 
              ? data['orderDate'].toDate() 
              : (data['orderDate'] instanceof Date ? data['orderDate'] : new Date()),
            customerName: userData?.name || userData?.email || 'Customer',
            customerEmail: userData?.email || '',
            customerPhone: userData?.phoneNumber || userData?.phone || ''
          };

          allOrders.push(order);
        }

        this.ngZone.run(() => {
          this.orders = allOrders;
          this.applyFilters();
          this.isLoading = false;
        });
      });

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('Error loading orders:', error);
      this.isLoading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load orders'
      });
    }
  }

  applyFilters() {
    let filtered = [...this.orders];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((order) =>
        order.customerName?.toLowerCase().includes(term) ||
        order.customerEmail?.toLowerCase().includes(term) ||
        order.id?.toLowerCase().includes(term) ||
        order.customerPhone?.includes(term) ||
        order.products?.some((item) => 
          item.name.toLowerCase().includes(term) || 
          item.category?.toLowerCase().includes(term)
        )
      );
    }

    filtered.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    
    this.totalItems = filtered.length;
    this.filteredOrders = filtered;
  }

  async updateOrderStatus(orderId: string, userId: string, newStatus: Order['status']) {
    try {
      const orderRef = doc(this.firestore, `users/${userId}/cart/${orderId}`);
      await updateDoc(orderRef, { status: newStatus });
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update order status'
      });
    }
  }

  getOrderStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'shipped': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'warning';
    }
  }

  calculateTotalPrice(order: Order): number {
    return order.products?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;
  }

  onSearch() {
    this.first = 0;
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.first = 0;
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.first = 0;
    this.applyFilters();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.pageSize = event.rows;
  }

  onPageSizeChange(event: any) {
    this.pageSize = event.value;
    this.first = 0;
    this.applyFilters();
  }

  showStatusOptions(event: Event, order: Order) {
    const statuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIndex = statuses.indexOf(order.status);
    
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    this.updateOrderStatus(order.id!, order.userId, nextStatus);
  }

  get paginatedOrders(): Order[] {
    const startIndex = this.first;
    return this.filteredOrders.slice(startIndex, startIndex + this.pageSize);
  }

  getCurrentPage(): number {
    return Math.floor(this.first / this.pageSize) + 1;
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }
}
