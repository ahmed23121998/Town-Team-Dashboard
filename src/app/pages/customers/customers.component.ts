import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    this.customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}
