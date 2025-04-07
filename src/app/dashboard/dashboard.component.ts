

import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

interface Product {
  unitF: any;
  unit: any;
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Order {
  qntF: any;
  id?: string;
  qnt: number;
  status: string;
  productId: string;
  branchId: string;
}

interface PreOrder {
  id: string;
  branchId: string;
  createdAt: Timestamp;
  count?: number;
}

interface GroupedPreOrder {
  createdAt: Timestamp;
  count: number;
  orders: PreOrder[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  async onSelectChange(event: any) {
    console.log('Selected option:', event);  // You can perform any action here
    // Add more logic based on selected option
    // if (event != this.selectedOption) {
    console.log('Selected option:', event);  // You can perform any action here

    this.isLoading = true
    this.selectedOption = event
    await this.getPreOrders();
    await this.getData()
    // Handle 'Ryad' selection
    // }
  }
  isLoading = false;
  isAdmin = false;
  selectedDate: Date | null = null;

  data: Product[] = [];
  branches: Branch[] = [];
  orders: Order[] = [];

  preOrders: GroupedPreOrder[] = [];
  actualPreOrders: PreOrder[] = [];

  productsToAdd: any = [];
  productsToUpdate: Product[] = [];
  ordersToAdd: Order[] = [];
  ordersToUpdate: Order[] = [];
  selectedOption = "ryad"

  ifHasChanges = false

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
  }


  async ngOnInit(): Promise<void> {

    if (isPlatformBrowser(this.platformId)) {
      await this.checkAuthStatus();
    }


    // console.log("getting data", this.isAdmin);

    // if (this.isAdmin) {

    //   await this.getData();
    // }
  }

  private async checkAuthStatus(): Promise<void> {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("rtrt", user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2");

        this.isAdmin = user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2";
        if (!this.isAdmin) {
          this.router.navigate(['/branch']);
        }
      } else {
        this.router.navigate(['/login']);
      }

      if (this.isAdmin) {

        await this.getData();
      }
    });
  }

  async getData(date: Date | null = null): Promise<void> {
    this.isLoading = true;
    try {
      await this.getPreOrders();

      this.selectedDate = date || Timestamp.now().toDate();
      console.log("seleele", this.selectedDate);

      const { startTimestamp, endTimestamp } = this.getDateRangeTimestamps(this.selectedDate);

      const [branches, products, orders] = await Promise.all([
        this.fetchBranches(),
        this.fetchProducts(),
        this.fetchOrders(startTimestamp, endTimestamp)
      ]);
      console.log("bb", branches);


      this.branches = branches;
      this.data = products;
      this.orders = orders;
      console.log(orders);


      this.addMissingOrders();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.isLoading = false;
    }
  }

  private getDateRangeTimestamps(date: Date): { startTimestamp: Timestamp; endTimestamp: Timestamp } {
    // const startOfDay = new Date(date);
    // startOfDay.setUTCHours(0, 0, 0, 0);

    // const endOfDay = new Date(date);
    // endOfDay.setUTCHours(23, 59, 59, 999);

    // return {
    //   startTimestamp: Timestamp.fromDate(startOfDay),
    //   endTimestamp: Timestamp.fromDate(endOfDay)
    // };

     // Get the date at midnight local time
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Get the date at 23:59:59.999 local time
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  return {
    startTimestamp: new Timestamp(Math.floor(startOfDay.getTime() / 1000), 0),
    endTimestamp: new Timestamp(Math.floor(endOfDay.getTime() / 1000), 999000000)
  };
    
  }

  private async fetchBranches(): Promise<Branch[]> {
    const db = getFirestore();
    const q = query(collection(db, "branches"),
      where("city", '==', this.selectedOption),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name']
    }));
  }

  private async fetchProducts(): Promise<Product[]> {
    const db = getFirestore();
    const q = query(collection(db, "products"),
      where("city", '==', this.selectedOption),
      orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name'],
      unit: doc.data()['unit'],
      unitF: doc.data()['unitF'],
    }));
  }

  private async fetchOrders(start: Timestamp, end: Timestamp): Promise<Order[]> {
    console.log("start1", start);
    console.log("end1", end)
    console.log("start", start.toDate());
    console.log("end", end.toDate());
    console.log("city", this.selectedOption);



    const db = getFirestore();
    const q = query(
      collection(db, "branchesOrders"),
      where("city", '==', this.selectedOption),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end),
      orderBy("createdAt")
    );
    const snapshot = await getDocs(q);
    console.log('ss', snapshot);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      qnt: doc.data()['qnt'],
      qntF: doc.data()['qntF'],

      status: doc.data()['status']?.toString() || '',
      productId: doc.data()['productId'],
      branchId: doc.data()['branchId']
    }));
  }

  private addMissingOrders(): void {
    const newOrders: Order[] = [];

    this.data.forEach(product => {
      this.branches.forEach(branch => {
        const exists = this.orders.some(order =>
          order.branchId === branch.id && order.productId === product.id
        );

        if (!exists) {
          newOrders.push({
            qnt: 0,
            qntF: 0,

            status: '',
            productId: product.id,
            branchId: branch.id
          });
        }
      });
    });

    this.orders.push(...newOrders);
  }

  async getPreOrders(): Promise<void> {
    const db = getFirestore();
    const q = query(collection(db, "orders"),
      where("city", '==', this.selectedOption),
      orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    this.actualPreOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      branchId: doc.data()['branchId'],
      createdAt: doc.data()['createdAt']
    }));

    console.log("act", this.actualPreOrders);


    this.groupPreOrdersByDate();

    await this.deleteOldOrders();
    // if (this.preOrders.length > 4) {

    //   const ordersToRemain = this.preOrders.slice(0, 4);

    //   const ordersGroupedToDelete = this.preOrders.slice(4);
    //   var dateToDelete = [];
    //   const db = getFirestore();
    //   const batch = writeBatch(db);
    //   try {
    //     for (let index = 0; index < ordersGroupedToDelete.length; index++) {
    //       // console.log("deleyte", ordersGroupedToDelete[index]);


    //       ordersGroupedToDelete.forEach(async (element: GroupedPreOrder) => {

    //         element.orders.forEach((order: PreOrder) => {
    //           batch.delete(doc(db, 'orders', order.id));
    //           console.log("deleteOrderId", order);

    //         })
    //       })
    //     }

    //     ordersGroupedToDelete.forEach(async (element: GroupedPreOrder) => {


    //       const date = element.createdAt.toDate();

    //       // Get start of day (00:00:00.000)
    //       const startOfDay = new Date(date);
    //       startOfDay.setHours(0, 0, 0, 0);

    //       // Get end of day (23:59:59.999)
    //       const endOfDay = new Date(date);
    //       endOfDay.setHours(23, 59, 59, 999);

    //       const ordersQuery = query(collection(db, 'branchesOrders'), where("createdAt", ">=", startOfDay),
    //         where("createdAt", "<=", endOfDay));
    //       const snapshot = await getDocs(ordersQuery);


    //       snapshot.forEach(doc => {
    //         console.log("docDeleBranchOrder", doc);

    //         batch.delete(doc.ref);
    //       });

    //     })

    //     // Delete product


    //     // Delete associated orders


    //     // await batch.commit();
    //     this.preOrders = ordersToRemain;
    //     // this.data = this.data.filter(product => product.id !== id);
    //   } catch (error) {
    //     console.error('Error deleting product:', error);
    //   } finally {
    //     this.isLoading = false;
    //   }





    // }
  }

  async deleteOldOrders(): Promise<void> {
    if (!this.preOrders || this.preOrders.length <= 4) return;

    const db = getFirestore();
    const batch = writeBatch(db);
    const ordersToRemain = this.preOrders.slice(0, 4);
    const ordersGroupedToDelete = this.preOrders.slice(4);

    try {
      // First process all orders deletions
      for (const element of ordersGroupedToDelete) {
        for (const order of element.orders) {
          batch.delete(doc(db, 'orders', order.id));
          console.log("deleteOrderId", order.id);
        }
      }

      // Then process all branchesOrders deletions
      for (const element of ordersGroupedToDelete) {
        const date = element.createdAt.toDate();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const ordersQuery = query(
          collection(db, 'branchesOrders'),
          where("createdAt", ">=", startOfDay),
          where("createdAt", "<=", endOfDay)
        );

        const snapshot = await getDocs(ordersQuery);
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          console.log("docDeleBranchOrder", doc.id);
        });
      }

      // Commit the batch once after all operations are added
      await batch.commit();
      this.preOrders = ordersToRemain;
      console.log(`Deleted ${ordersGroupedToDelete.length} date groups`);

    } catch (error) {
      console.error('Error deleting orders:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private groupPreOrdersByDate(): void {
    const grouped = new Map<string, GroupedPreOrder>();

    this.actualPreOrders.forEach(order => {
      // const dateKey = order.createdAt.toDate().toISOString().split('T')[0];
      const date = order.createdAt.toDate();
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      console.log("d1d", order);

      console.log("dd", dateKey);
      console.log("dd2", order.createdAt.toDate());

      console.log("dd3", order.createdAt.toDate().toISOString());


      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          createdAt: Timestamp.fromDate(new Date(dateKey)),
          count: 0,
          orders: []
        });
      }

      const group = grouped.get(dateKey)!;
      group.count += 1;
      group.orders.push(order);
    });

    this.preOrders = Array.from(grouped.values());
  }

  async onSelectDate(date: Timestamp): Promise<void> {
    await this.getData(date.toDate());
  }

  logout(): void {
    const auth = getAuth();
    signOut(auth).then(() => {
      this.router.navigate(['/login']);
    }).catch(console.error);
  }

  // Product CRUD operations
  addToProductsToAdd(): void {
    this.productsToAdd.push({ name: "", unit: "", unitF: "", city: this.selectedOption, createdAt: Timestamp.now() });
    this.ifHasChanges = true
  }

  onProductNameChange(index: number, product: any): void {
    const prod = this.productsToUpdate[index];

    console.log(prod);

    if (prod) {
      this.productsToUpdate[index] = product;
    } else {
      this.productsToUpdate.push(product);
    }
    this.ifHasChanges = true

  }

  async deleteProduct(id: string): Promise<void> {
    const confirmed = confirm('Are you sure you want to delete this product and associated orders?');
    if (!confirmed) return;

    this.isLoading = true;
    const db = getFirestore();
    const batch = writeBatch(db);

    try {
      // Delete product
      batch.delete(doc(db, 'products', id));

      // Delete associated orders
      const ordersQuery = query(collection(db, 'branchesOrders'), where('productId', '==', id));
      const snapshot = await getDocs(ordersQuery);

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      this.data = this.data.filter(product => product.id !== id);
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Order operations
  onOrderChange(order: Order, qnt: number): void {
    // order.qnt = qnt;
    console.log(order);

    this.updateOrderCollections(order);
    this.ifHasChanges = true

  }

  onStatusChange(order: Order): void {

    this.updateOrderCollections(order);
    this.ifHasChanges = true

  }

  private updateOrderCollections(order: Order): void {
    if (order.id) {
      const existingIndex = this.ordersToUpdate.findIndex(o => o.id === order.id);
      if (existingIndex !== -1) {
        this.ordersToUpdate[existingIndex] = order;
      } else {
        this.ordersToUpdate.push({ ...order });
      }
    } else {
      const existingIndex = this.ordersToAdd.findIndex(o =>
        o.productId === order.productId && o.branchId === order.branchId
      );
      if (existingIndex !== -1) {
        this.ordersToAdd[existingIndex] = order;
      } else {
        this.ordersToAdd.push({ ...order });
      }
    }
  }

  // Save operations
  hasChanges(): boolean {
    return this.productsToAdd.length > 0 ||
      this.productsToUpdate.length > 0 ||
      this.ordersToAdd.length > 0 ||
      this.ordersToUpdate.length > 0;
  }

  async saveChanges(): Promise<void> {
    this.isLoading = true;

    try {
      const operations = [
        ...(this.productsToAdd.length ? [this.addProducts()] : []),
        ...(this.productsToUpdate.length ? [this.updateProducts()] : []),
        ...(this.ordersToAdd.length ? [this.addOrders()] : []),
        ...(this.ordersToUpdate.length ? [this.updateOrders()] : [])
      ];

      await Promise.all(operations);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async addProducts(): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);
    let timeOffset = 0;

    this.productsToAdd.forEach(async (product: any) => {
      if (product.name) {
        // const tempId = doc(collection(db, 'products')).id;
        const docRef = doc(collection(db, 'products'));
        // Remove the 'id' property from the product object
        const { id, ...productWithoutId } = product;

        // Now create the new object, including the product without the id and the createdAt timestamp
        const newData = {
          ...productWithoutId,        // Include all product data except id
          // city: this.selectedOption,
          // createdAt: Timestamp.now() // Add createdAt timestamp

        };
        // await new Promise(resolve => setTimeout(resolve, 5)); // 10ms delay

        batch.set(docRef, newData);
        timeOffset += 1;
        // this.data.push({
        //   id: tempId,
        //   name: product.name,
        // })
      }

    });

    await batch.commit();
    this.productsToAdd = [];
    // window.location.reload();
    await this.getData()


  }

  private async updateProducts(): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);

    this.productsToUpdate.forEach(product => {
      const docRef = doc(db, 'products', product.id);
      const { id, ...productWithoutId } = product;

      // Update the document with the remaining fields
      batch.update(docRef, productWithoutId);
    });

    await batch.commit();
    this.productsToUpdate = [];
  }

  private async addOrders(): Promise<void> {
    if (!this.ordersToAdd.length) return;

    const db = getFirestore();
    const batch = writeBatch(db);
    const processedBranches = new Set<string>(); // Track processed branches

    try {
      // Process all orders in a single batch
      for (const order of this.ordersToAdd) {
        // Only check branch uniqueness if not already processed
        if (!processedBranches.has(order.branchId)) {
          const ordersQuery = query(
            collection(db, 'orders'),
            where("branchId", "==", order.branchId),
            // where("createdAt", "==", this.selectedDate),
            // limit(1)
          );

          const snapshot = await getDocs(ordersQuery);

          // Only add branch order if it doesn't exist
          if (snapshot.empty) {
            const docRef = doc(collection(db, 'orders'));
            batch.set(docRef, {
              branchId: order.branchId,
              createdAt: this.selectedDate
            });
          }
          processedBranches.add(order.branchId);
        }

        // Always add the branchesOrder
        const branchesOrderRef = doc(collection(db, 'branchesOrders'));
        batch.set(branchesOrderRef, {
          ...order,
          city: this.selectedOption,
          createdAt: this.selectedDate
        });
      }

      await batch.commit();
      this.ordersToAdd = []; // Clear the array
      console.log(`Successfully added ${this.ordersToAdd.length} orders`);
    } catch (error) {
      console.error('Error adding orders:', error);
      throw error;
    }
  }

  // private async addOrders(): Promise<void> {
  //   const db = getFirestore();
  //   const batch = writeBatch(db);


  //   await this.ordersToAdd.forEach(async order => {
  //     const ordersQuery = query(
  //       collection(db, 'orders'),
  //       where("branchId", "==", order.branchId),
  //     );

  //     const snapshot = await getDocs(ordersQuery);
  //     // console.log("snapShor", snapshot.length);

  //     if (snapshot.empty) {
  //       const docRef = doc(collection(db, 'orders'));
  //       batch.set(docRef, {
  //         branchId: order.branchId,
  //         createdAt: this.selectedDate
  //       });
  //     }
  //     // snapshot.forEach(doc => {

  //     //   console.log("docDeleBranchOrder", doc.id);
  //     // });
  //     const docRef = doc(collection(db, 'branchesOrders'));
  //     batch.set(docRef, {
  //       ...order,
  //       createdAt: this.selectedDate
  //     });
  //   });

  //   await batch.commit();
  //   this.ordersToAdd = [];
  // }

  private async updateOrders(): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);

    this.ordersToUpdate.forEach(order => {
      if (order.id) {
        const docRef = doc(db, 'branchesOrders', order.id);

        const { id, ...productWithoutId } = order;

        // Now create the new object, including the product without the id and the createdAt timestamp
        const newData = {
          ...productWithoutId,        // Include all product data except id
        };

        batch.update(docRef, newData);
      }
    });

    await batch.commit();
    this.ordersToUpdate = [];
  }

  // exportToExcel() {
  //   // Prepare the data
  //   const excelData = [];

  //   // Add headers - separate columns for Quantity and Status for each branch
  //   const headers = ['Product Name'];
  //   this.branches.forEach(branch => {
  //     headers.push(`${branch.name} Qty`);
  //     headers.push(`${branch.name} Status`);
  //   });
  //   excelData.push(headers);

  //   // Add product rows
  //   this.data.forEach(product => {
  //     const row = [product.name];

  //     this.branches.forEach(branch => {
  //       const order = this.orders.find(o =>
  //         o.branchId === branch.id && o.productId === product.id
  //       );

  //       // Add quantity
  //       row.push(order ? order.qnt.toString() : '');

  //       // Add status with the specified logic
  //       let statusText = '';
  //       if (order) {
  //         if (order.status === '1') {
  //           statusText = 'Received';
  //         } else if (order.status === '0') {
  //           statusText = 'Not Received';
  //         } else {
  //           statusText = 'No Action';
  //         }
  //       }
  //       row.push(statusText);
  //     });

  //     excelData.push(row);
  //   });

  //   // Create worksheet
  //   const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

  //   // Create workbook
  //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  //   // Generate file name
  //   const fileName = `orders_${this.selectedDate?.toISOString().split('T')[0] || 'all'}.xlsx`;

  //   // Export to Excel
  //   XLSX.writeFile(wb, fileName);
  // }


  exportToExcel() {
    // Prepare the worksheet data
    const wsData = this.prepareWorksheetData();

    // Create worksheet with correct headers
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 25 },  // Product Name
      { wch: 15 },  // Requested Unit
      { wch: 15 },  // Remain Unit
      ...Array(this.branches.length * 3).fill({ wch: 12 }) // Branch columns
    ];

    // Set row heights
    ws['!rows'] = [{ hpt: 20 }, { hpt: 25 }]; // Header rows

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate Excel file
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Orders_Export_${date}.xlsx`);
  }

  prepareWorksheetData(): any[][] {
    const wsData = [];

    // First header row (branch names)
    const header1 = ['', '', '', ''];
    this.branches.forEach(branch => {
      header1.push(branch.name, '', ''); // Main branch header spans 3 columns
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
    this.branches.forEach(() => {
      header2.push('Requested Qnt', 'Remain Qnt', 'Status');
    });
    wsData.push(header2);

    // Add existing products
    this.data.forEach((product, i) => {
      const row = [
        i + 1,
        product.name,
        product.unit,
        product.unitF
      ];

      this.branches.forEach(branch => {
        const order = this.orders.find(o =>
          o.branchId === branch.id && o.productId === product.id
        );

        row.push(
          order?.qnt || '',
          order?.qntF || '',
          order?.status === '1' ? 'Received' : (order!.status === '0' ? 'No Action' : (order!.status === '0' ? 'Not Recieved' : ''))
        );
      });

      wsData.push(row);
    });

    // Add new products
    this.productsToAdd.forEach((newProduct: any) => {
      const row = [
        'New',
        newProduct.name || '',
        newProduct.unit || '',
        newProduct.unitF || ''
      ];

      // Empty cells for branches
      this.branches.forEach(() => {
        row.push('', '', '');
      });

      wsData.push(row);
    });

    return wsData;
  }
}