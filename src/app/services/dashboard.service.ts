import { Injectable } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { collection } from 'firebase/firestore';
import { Observable, combineLatest, map } from 'rxjs';

export interface DashboardStats {
  ordersCount: number;
  productsCount: number;
  customersCount: number;
  totalRevenue: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private firestore: Firestore) {}

  getDashboardStats(): Observable<DashboardStats> {
    const orders$ = collectionData(collection(this.firestore, 'orders'));
    const products$ = collectionData(collection(this.firestore, 'products'));
    const customers$ = collectionData(collection(this.firestore, 'customers'));

    return combineLatest([orders$, products$, customers$]).pipe(
      map(([orders, products, customers]) => {
        const totalRevenue = orders.reduce(
          (sum: number, order: any) => sum + (order.total || 0),
          0
        );

        return {
          ordersCount: orders.length,
          productsCount: products.length,
          customersCount: customers.length,
          totalRevenue: totalRevenue,
        };
      })
    );
  }
}
