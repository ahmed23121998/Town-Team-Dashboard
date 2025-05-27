import { Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp, DocumentData } from 'firebase/firestore';
import { Firestore, collection, onSnapshot, doc, updateDoc, getDocs, query, where, collectionGroup, getDoc, setDoc, } from '@angular/fire/firestore';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

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
  imports: [ CommonModule, FormsModule, CardModule, TableModule, ButtonModule, InputTextModule, SelectModule, TagModule, ToastModule, OverlayPanelModule, DialogModule, TooltipModule, ],
  providers: [MessageService],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private messageService = inject(MessageService);

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';
  isLoading: boolean = true;
  first: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  unsubscribers: (() => void)[] = [];
  showProductDetailsDialog: boolean = false;
  selectedOrder: Order | null = null;

  ngOnInit(): void {
    this.loadOrdersLive();
  }

  ngOnDestroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
  }

  loadOrdersLive() {
    this.ngZone.runOutsideAngular(() => {
      try {
        const ordersRef = collection(this.firestore, 'orders');
        const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
          const allOrders: Order[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const cartItems =
              Array.isArray(data['cartItems']) && data['cartItems'].length > 0
                ? data['cartItems']
                : [
                    {
                      id: '',
                      title: 'No Name',
                      quantity: 0,
                      price: 0,
                      image: 'assets/no-image.png',
                      category: '',
                    },
                  ];
            const order: Order = {
              id: docSnap.id,
              userId: data['userId'] || '',
              products: cartItems.map((item: any) => ({
                id: item.id || '',
                name: item.title || 'No Name',
                quantity: item.quantity || 0,
                price: item.price || item.unitPrice || 0,
                image: item.image || 'assets/no-image.png',
                category: item.category || '',
              })),
              totalAmount: cartItems.reduce(
                (sum: number, item: any) =>
                  sum +
                  (item.price || item.unitPrice || 0) * (item.quantity || 1),
                0
              ),
              status: data['status'] || 'pending',
              orderDate:
                data['orderDate'] instanceof Timestamp
                  ? data['orderDate'].toDate()
                  : data['orderDate'] instanceof Date
                  ? data['orderDate']
                  : new Date(),
              customerName: data['city'] || '',
              customerEmail: data['email'] || '',
              customerPhone: data['phone'] || '',
            };
            allOrders.push(order);
          });
          this.ngZone.run(() => {
            this.orders = allOrders;
            this.applyFilters();
            this.isLoading = false;
          });
        });
        this.unsubscribers.push(unsubscribe);
      } catch (error) {
        console.error('Error loading orders:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load orders',
          });
        });
      }
    });
  }

  applyFilters() {
    let filtered = [...this.orders];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (order) =>
          order.customerName?.toLowerCase().includes(term) ||
          order.customerEmail?.toLowerCase().includes(term) ||
          order.id?.toLowerCase().includes(term) ||
          order.customerPhone?.includes(term) ||
          order.products?.some(
            (item) =>
              item.name.toLowerCase().includes(term) ||
              item.category?.toLowerCase().includes(term)
          )
      );
    }

    filtered.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());

    this.totalItems = filtered.length;
    this.filteredOrders = filtered;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    newStatus: Order['status']
  ) {
    try {
      const orderRef = doc(this.firestore, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Order status updated successfully',
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update order status',
      });
    }
  }

  getOrderStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'warning';
    }
  }

  calculateTotalPrice(order: Order): number {
    return (
      order.products?.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ) || 0
    );
  }

  getOrderTotalQuantity(order: Order): number | string {
    if (!order.products || !Array.isArray(order.products)) return 'N/A';
    return order.products.reduce((sum, p) => sum + (p.quantity || 0), 0);
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
    const statuses: Order['status'][] = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];
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

  showProductDetails(order: Order) {
    this.selectedOrder = order;
    this.showProductDetailsDialog = true;
  }
}
