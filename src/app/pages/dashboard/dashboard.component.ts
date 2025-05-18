import { Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collectionGroup, onSnapshot, query } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
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
    SelectButtonModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private messageService = inject(MessageService);
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
    datasets: [{ 
      data: [], 
      backgroundColor: ['#3B82F6', '#14B8A6', '#F97316', '#FACC15', '#A855F7'] 
    }] 
  };
  categoryData: ChartData = { 
    labels: [], 
    datasets: [{ 
      label: 'Sales by Category', 
      data: [], 
      backgroundColor: '#3B82F6' 
    }] 
  };

  salesOptions: any = {
    plugins: { legend: { labels: { color: '#495057' } } },
    scales: {
      x: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
      y: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } }
    }
  };

  brandOptions: any = { 
    plugins: { 
      legend: { labels: { color: '#495057' } },
      aspectRatio: 1.5
    }
  };

  unsubscribers: (() => void)[] = [];
  currentUser: any = null;
  timeRanges = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' }
  ];
  selectedTimeRange = '30d';

  ngOnInit() {
    setTimeout(() => {
      this.initializeAuth();
      this.loadDashboardData();
    }, 0);
  }

  ngOnDestroy() {
    this.unsubscribers.forEach(unsub => unsub());
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
    await this.loadSalesData();
    await this.loadcollectionsdData();
    await this.loadCategoryData();
  }

  private async loadSalesData() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = Array(12).fill(0).map(() => Math.floor(Math.random() * 1000));
    const monthlyRevenue = monthlySales.map(sales => sales * 100);

    this.salesData = {
      labels: monthNames,
      datasets: [{
        label: 'Sales',
        data: monthlySales,
        fill: false,
        borderColor: '#3B82F6',
        tension: 0.4
      }]
    };

    this.revenueData = {
      labels: monthNames,
      datasets: [{
        label: 'Revenue',
        data: monthlyRevenue,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        tension: 0.4
      }]
    };
  }

  private async loadcollectionsdData() {
    this.brandData = {
      labels: ['Kids', 'Men', 'Summer', 'Wenter', 'Other'],
      datasets: [{
        data: [30, 25, 20, 15, 10],
        backgroundColor: ['#3B82F6', '#14B8A6', '#F97316', '#FACC15', '#A855F7']
      }]
    };
  }

  private async loadCategoryData() {
    this.categoryData = {
      labels: ['closes', 'shoes', 'trousers', 'Accessories', 'Others'],
      datasets: [{
        label: 'Sales by Category',
        data: [45, 25, 20, 15, 10],
        backgroundColor: ['#3B82F6', '#14B8A6', '#F97316', '#FACC15', '#A855F7']
      }]
    };
  }

  onTimeRangeChange(event: any) {
    this.loadDashboardData();
  }
}
