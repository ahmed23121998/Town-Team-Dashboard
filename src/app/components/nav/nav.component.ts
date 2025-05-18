import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collectionGroup, query, where, onSnapshot } from '@angular/fire/firestore';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    OverlayPanelModule,
    BadgeModule,
    AvatarModule,
    MenuModule
  ],
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <img src="assets/logo.png" alt="TOWN TEAM" class="brand-logo">
        <span class="brand-name">TOWN TEAM</span>
      </div>

      <div class="nav-center">
        <span class="p-input-icon-left search-box">
          <i class="pi pi-search"></i>
          <input type="text" pInputText placeholder="Search..." [(ngModel)]="searchQuery">
        </span>
      </div>

      <div class="nav-right">
        <button 
          pButton 
          type="button" 
          icon="pi pi-bell" 
          class="p-button-rounded p-button-text"
          [pBadge]="notifications.length.toString()"
          [pBadgeValue]="notifications.length.toString()"
          (click)="notifPanel.toggle($event)"
        ></button>
        <p-overlayPanel #notifPanel>
          <div class="notifications-panel">
            <div class="notif-header">
              <h3>Notifications</h3>
              <button pButton type="button" label="Clear all" class="p-button-text"></button>
            </div>
            <div class="notif-list">
              <div *ngFor="let notif of notifications" class="notif-item">
                <i [class]="notif.icon"></i>
                <div class="notif-content">
                  <div class="notif-title">{{notif.title}}</div>
                  <div class="notif-message">{{notif.message}}</div>
                  <div class="notif-time">{{notif.time | date:'shortTime'}}</div>
                </div>
              </div>
            </div>
          </div>
        </p-overlayPanel>

        <div class="admin-profile" (click)="menu.toggle($event)">
          <p-avatar 
            [image]="currentUser?.photoURL || 'assets/default-avatar.png'"
            shape="circle"
          ></p-avatar>
          <span class="admin-name">{{currentUser?.displayName || 'Admin'}}</span>
        </div>
        <p-menu #menu [popup]="true" [model]="menuItems"></p-menu>
      </div>
    </nav>
  `,
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  notifications: any[] = [];
  currentUser: any = null;
  unsubscribers: (() => void)[] = [];
  menuItems: MenuItem[] = [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => this.handleProfile()
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.handleSettings()
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-power-off',
      command: () => this.handleLogout()
    }
  ];

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.initializeAuth();
    this.setupNotifications();
  }

  ngOnDestroy() {
    this.unsubscribers.forEach(unsub => unsub());
  }

  private initializeAuth() {
    const unsub = onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
    this.unsubscribers.push(unsub);
  }

  private setupNotifications() {
    const ordersQuery = query(
      collectionGroup(this.firestore, 'cart'),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(ordersQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          this.notifications.unshift({
            id: change.doc.id,
            title: 'New Order',
            message: `New order received from ${data['customerName'] || 'Unknown Customer'}`,
            icon: 'pi pi-shopping-cart',
            time: new Date()
          });
        }
      });
    });

    this.unsubscribers.push(unsub);
  }

  handleProfile() {
    // Implement profile navigation
  }

  handleSettings() {
    // Implement settings navigation
  }

  async handleLogout() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
} 