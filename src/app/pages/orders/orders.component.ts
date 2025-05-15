import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadOrders();
  }

  async loadOrders() {
    const ordersRef = collection(this.firestore, 'orders');
    const snapshot = await getDocs(ordersRef);
    this.orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}
