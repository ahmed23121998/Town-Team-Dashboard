import { Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

interface DashboardStats {
  dailyVisitors: number;
  dailySignups: number;
  dailyOrders: number;
  dailyRevenue: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface RecentOrder {
  id: string;
  date: Date;
  productImage: string;
  productName: string;
  customer: string;
  status: string;
  total: number;
  products: any[]; // Include full products array
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    SelectButtonModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);

  stats: DashboardStats = {
    dailyVisitors: 8,
    dailySignups: 25,
    dailyOrders: 150,
    dailyRevenue: 50,
    weeklyGrowth: 30,
    monthlyGrowth: 50,
  };

  salesData: ChartData = { labels: [], datasets: [] };
  revenueData: ChartData = { labels: [], datasets: [] };
  brandData: ChartData = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#3B82F6',
          '#14B8A6',
          '#F97316',
          '#FACC15',
          '#A855F7',
        ],
      },
    ],
  };
  categoryData: ChartData = {
    labels: [],
    datasets: [
      {
        label: 'Sales by Category',
        data: [],
        backgroundColor: '#3B82F6',
      },
    ],
  };

  salesOptions: any = {
    plugins: { legend: { labels: { color: '#495057' } } },
    scales: {
      x: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
      y: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
    },
  };

  brandOptions: any = {
    plugins: {
      legend: { labels: { color: '#495057' } },
      aspectRatio: 1.5,
    },
  };

  unsubscribers: (() => void)[] = [];
  currentUser: any = null;
  timeRanges = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
  ];
  selectedTimeRange = '30d';

  recentOrders: RecentOrder[] = [];
  productsCount: number = 0;
  customersCount: number = 0;

  showRecentOrderDetailsDialog = false;
  selectedRecentOrder: any = null;

  ngOnInit() {
    setTimeout(() => {
      this.initializeAuth();
      this.loadDashboardData();
    }, 0);
  }

  ngOnDestroy() {
    this.unsubscribers.forEach((unsub) => unsub());
  }

  private initializeAuth() {
    this.ngZone.runOutsideAngular(() => {
      const unsub = onAuthStateChanged(this.auth, (user) => {
        this.ngZone.run(() => {
          this.currentUser = user;
        });
      });
      this.unsubscribers.push(unsub);
    });
  }

  private async loadDashboardData() {
    this.ngZone.runOutsideAngular(async () => {
      // جلب الطلبات
      const ordersRef = collection(this.firestore, 'orders');
      const ordersSnap = await getDocs(ordersRef);
      const orders = ordersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // جلب المنتجات
      const productsRef = collection(this.firestore, 'products');
      const productsSnap = await getDocs(productsRef);
      const products = productsSnap.docs.map((doc) => doc.data());

      // جلب العملاء
      const usersRef = collection(this.firestore, 'users');
      const usersSnap = await getDocs(usersRef);
      const users = usersSnap.docs.map((doc) => doc.data());

      this.ngZone.run(() => {
        this.productsCount = products.length;
        this.customersCount = users.length;

        // إحصائيات عامة
        let totalRevenue = 0;
        let categoriesCount: Record<string, number> = {};
        let monthlySales: Record<string, number> = {};
        let recentOrders: RecentOrder[] = [];

        for (const order of orders) {
          const cartItems = Array.isArray((order as any)['cartItems'])
            ? (order as any)['cartItems']
            : [];
          let orderTotal = 0;
          const products = cartItems.map((item: any) => ({
            id: item.id || item.productId || '',
            name: item.title || 'No Name',
            quantity: item.quantity || 0,
            price: item.price || item.unitPrice || 0,
            image:
              typeof item.image === 'string'
                ? item.image
                : item.image?.src || 'assets/no-image.png',
            color: item.color || item.colors || '',
          }));
          for (const item of cartItems) {
            orderTotal +=
              (item.price || item.unitPrice || 0) * (item.quantity || 1);
            // category
            let cat = item.category;
            if (!cat || cat.trim() === '' || cat.toLowerCase() === 'unknown')
              cat = 'Other';
            categoriesCount[cat] =
              (categoriesCount[cat] || 0) + (item.quantity || 1);
          }
          totalRevenue += orderTotal;
          // monthly sales
          const orderDate = (order as any).orderDate;
          if (orderDate) {
            const dateObj = orderDate.toDate
              ? orderDate.toDate()
              : new Date(orderDate);
            const month = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
              .toString()
              .padStart(2, '0')}`;
            monthlySales[month] = (monthlySales[month] || 0) + orderTotal;
          }
          // recent orders
          if (cartItems.length > 0) {
            const rawOrderDate = (order as any).orderDate;
            let orderDate: Date;

            if (rawOrderDate) {
              if (typeof rawOrderDate === 'string') {
                orderDate = new Date(rawOrderDate);
              } else if (
                rawOrderDate &&
                typeof rawOrderDate.toDate === 'function'
              ) {
                orderDate = rawOrderDate.toDate();
              } else {
                orderDate = new Date();
              }
            } else {
              orderDate = new Date();
            }

            recentOrders.push({
              id: order.id,
              date: orderDate,
              productImage: cartItems[0].image || 'assets/no-image.png',
              productName: cartItems[0].title || 'No Name',
              customer:
                (order as any).email || (order as any).city || 'Customer',
              status: (order as any).status || 'pending',
              total: orderTotal,
              products, // Include full products array
            });
          }
        }

        // ترتيب آخر الطلبات
        this.recentOrders = recentOrders
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 8);

        // Top Categories
        let filteredCategories = Object.entries(categoriesCount).filter(
          ([cat]) => cat !== 'Other' && cat.toLowerCase() !== 'unknown'
        );
        if (filteredCategories.length === 0)
          filteredCategories = Object.entries(categoriesCount);
        const topCategories = filteredCategories.sort((a, b) => b[1] - a[1]);
        const topCatLabels = topCategories.map(([cat]) => cat);
        const topCatData = topCategories.map(([, count]) => count);
        const topCatColors = [
          '#3B82F6',
          '#14B8A6',
          '#F97316',
          '#FACC15',
          '#A855F7',
          '#FF6B6B',
          '#FFD166',
          '#06D6A0',
          '#118AB2',
          '#EF476F',
        ];

        // Sales by Category
        const allCatLabels = filteredCategories.map(([cat]) => cat);
        const allCatData = allCatLabels.map((cat) => categoriesCount[cat]);
        const allCatColors = topCatColors.slice(0, allCatLabels.length);

        // Sales by Month
        const months = Object.keys(monthlySales).sort();
        const salesByMonth = months.map((m) => monthlySales[m]);

        // تحديث الإحصائيات
        this.stats = {
          dailyVisitors: 0,
          dailySignups: 0,
          dailyOrders: orders.length,
          dailyRevenue: totalRevenue,
          weeklyGrowth: 0,
          monthlyGrowth: 0,
        };

        // تحديث الدائرة
        this.brandData = {
          labels: topCatLabels,
          datasets: [
            {
              data: topCatData,
              backgroundColor: topCatColors.slice(0, topCatLabels.length),
            },
          ],
        };
        // تحديث الأعمدة
        this.categoryData = {
          labels: allCatLabels,
          datasets: [
            {
              label: 'Sales by Category',
              data: allCatData,
              backgroundColor: allCatColors,
            },
          ],
        };
        // تحديث المخطط الخطي
        this.salesData = {
          labels: months,
          datasets: [
            {
              label: 'Sales',
              data: salesByMonth,
              fill: false,
              borderColor: '#3B82F6',
              tension: 0.4,
            },
          ],
        };
        this.revenueData = {
          labels: months,
          datasets: [
            {
              label: 'Revenue',
              data: salesByMonth,
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3B82F6',
              tension: 0.4,
            },
          ],
        };
        // تحسين الأعمدة
        this.salesOptions = {
          plugins: { legend: { labels: { color: '#495057' } } },
          scales: {
            x: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
            y: {
              ticks: { color: '#495057', stepSize: 1 },
              grid: { color: '#ebedef' },
              beginAtZero: true,
              max: Math.max(...allCatData, 5) + 2,
            },
          },
        };
        // آخر 5 أوردرات فقط
        this.recentOrders = recentOrders
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);
      });
    });
  }

  onTimeRangeChange(event: any) {
    this.loadDashboardData();
  }

  showRecentOrderDetails(order: any) {
    this.selectedRecentOrder = order;
    this.showRecentOrderDetailsDialog = true;
  }

  onRecentOrderStatusChange(order: any) {
    // You can change the order status or show a message here
    alert('Change order status: ' + order.id);
  }
}
