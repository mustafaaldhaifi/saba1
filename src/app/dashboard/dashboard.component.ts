

import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx-js-style';
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
  serverTimestamp,
  getDoc,
  and,
  setDoc
} from "firebase/firestore";
import { ApiService } from '../api.service';
import { PdfService } from '../pdf.service';
import { environment } from '../../env';
import { collectionNames } from '../Shareds';


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
  qntNotRequirement: any;
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
  exportPdf(branch: any) {
    const pdfService = new PdfService();
    // console.log('sddsds');
    // var data = [];

    // const isBranch = false
    // for (let index = 0; index < 50; index++) {
    //   if (isBranch) {
    //     data.push([`name ${index}`, `gm ${index}`, index]);
    //   } else {
    //     data.push([`n ${index}`, `rem ${index}`, `gm ${index}`, index, `kg ${index}`,]);
    //   }

    // }
    // console.log('sss', data);
    // console.log('sss', data.length);
    // console.log('sss', data[1][44]);
    // console.log('sss', data[1].length);




    const date = this.selectedDatey.createdAt.toDate();

    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    pdfService.export(this.getOrders(branch.id), false, formattedDate, branch.name)
  }
  async addTemp() {

    // try {
    //   const db = getFirestore();
    //   const batch = writeBatch(db);
    //   const q = query(collection(db, "products"))
    //   const snapshot = await getDocs(q);

    //   // console.log(snapshot.docs);

    //   const typeId = this.selectedType.id
    //   // console.log("ty",typeId);

    //   snapshot.docs.forEach(docSnap => {
    //     const docRef = doc(db, 'products', docSnap.id);
    //     // batch.set(docRef, { typeId: typeId }, { merge: true });
    //     batch.update(docRef, { typeId: typeId });
    //   });
    //   await batch.commit()
    //   console.log("done");

    // } catch (error) {
    //   console.log(error);

    // }


    // batch.set(docRef, {
    //   branchId: order.branchId,
    //   createdAt: this.selectedDate
    // });
  }
  async onSelectTypeChange() {


    this.isLoading = true
    if (this.types.length > 0) {
      // this.selectedType = this.types[0]
      this.selectedDatey = null

      this.isOn = null;
      this.isGetData = false
      this.datesToAdd = []
      this.data = []
      await this.getSharedData(false)
      // await this.getPreOrders()
    }
    this.isLoading = false
  }
  async getSameOrders(_t90: Branch) {
    this.isLoading = true;
    // throw new Error('Method not implemented.');
    const db = getFirestore();
    const q = query(collection(db, "branchesOrders"),
      where("branchId", '==', _t90.id),
      orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const d = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
      date: doc.data()['createdAt'].toDate()
    }));

    const f = d.filter((p: any) => p.data.status == '0')
  }
  getId2(branch: any) {
    alert()
    // throw new Error('Method not implemented.');
    console.log("b-id", branch);

  }
  changePassword(branch: any) {
    const newPassword = window.prompt(`Please enter new password for ${branch.name}:`);
    if (newPassword) {


    }
  }
  async deleteOpenDate(id: string): Promise<void> {
    this.isLoading = true
    try {
      console.log("Deleting document with ID:", id);

      // Get Firestore reference
      const db = getFirestore();
      const docRef = doc(db, 'openDates', id);

      // Delete the document
      await deleteDoc(docRef);

      // Update local array by filtering out the deleted item
      this.datesToAdd = this.datesToAdd.filter((item: any) => item.id !== id);

      console.log("Document successfully deleted");



    } catch (error) {
      console.error("Error deleting document:", error);

      // Optional: Show error message

    }
    finally {
      this.isLoading = false
    }
  }
  async addOpenDate() {
    this.isLoading = true
    try {
      if (!this.date3) {
        throw new Error('No date provided');
      }

      const db = getFirestore();
      const batch = writeBatch(db);
      const docRef = doc(collection(db, 'openDates'));

      // Create the date and validate it
      const date = new Date(this.date3);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided');
      }

      const newData = {
        typeId: this.selectedType.id,
        createdAt: Timestamp.fromDate(date),
        // Add other fields as needed
      };

      batch.set(docRef, newData);
      await batch.commit();

      // Now get the newly added document
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        throw new Error('Failed to retrieve added document');
      }

      const a = {
        id: docSnapshot.id,
        createdAt: docSnapshot.data()['createdAt']
      };
      this.date3 = ""
      this.datesToAdd.push(a)


    } catch (error) {
      console.error('Error in addOpenDate:', error);
      throw error;
    }
    finally {
      this.isLoading = false
    }
  }

  getStatusColor(status: any): string {
    switch (status) {
      case '1': return '#9fff9f';   // تم استلامها
      case '2': return 'red';     // لم يتم استلامها
      // case '3': return 'orange';  // كمية غير مطابقة
      case '4': return 'blue';
      // case '': return 'white';   // غير مطلوبة
      case '0': return 'white';   // غير مطلوبة

      // غير مطلوبة
      default: return 'orange';  // Default color
    }
  }
  async moveDate() {
    this.isLoading = true
    const db = getFirestore();
    const batch = writeBatch(db);
    const date = new Date("2025-04-08")
    console.log("date", date);

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Get the date at 23:59:59.999 local time
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    // throw new Error('Method not implemented.');
    const q = query(collection(db, "branchesOrders"),
      where("city", '==', this.selectedOption),
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      where("createdAt", "<=", Timestamp.fromDate(endOfDay)),
    );


    const snapshot = await getDocs(q);
    // 3. Add update operations to the batch
    snapshot.docs.forEach((doc) => {
      const docRef = doc.ref; // Reference to the document
      batch.update(docRef, {
        createdAt: Timestamp.fromDate(new Date("2025-04-07")) // Your new date
      });
    });

    const q1 = query(collection(db, "orders"),
      where("city", '==', this.selectedOption),
      where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
      where("createdAt", "<=", Timestamp.fromDate(endOfDay)),
    );


    const snapshot1 = await getDocs(q1);
    // 3. Add update operations to the batch
    snapshot1.docs.forEach((doc) => {
      const docRef = doc.ref; // Reference to the document
      batch.update(docRef, {
        createdAt: Timestamp.fromDate(new Date("2025-04-07")) // Your new date
      });
    });

    // 4. Commit the batch
    await batch.commit();

    this.isLoading = false
    console.log('Batch update successful!');
  }
  onMoveChange(arg0: any) {
    // throw new Error('Method not implemented.');
    console.log(arg0.toDate());

  }
  async onSelectChange(event: any) {
    this.selectedOption = event

    this.isLoading = true
    if (this.types.length > 0) {
      this.selectedType = this.types[0]
      this.selectedDatey = null
      this.isOn = null;
      this.isGetData = false
      this.datesToAdd = []
      this.data = []
      await this.getSharedData()
    }
    this.isLoading = false
  }


  isLoading = false;
  isAdmin = false;
  isGetData = false

  selectedDatey: any;


  data: Product[] = [];
  branches: Branch[] = [];
  orders: Order[] = [];
  types: any = [];


  preOrders: GroupedPreOrder[] = [];
  actualPreOrders: PreOrder[] = [];

  productsToAdd: any = [];
  productsToUpdate: Product[] = [];
  ordersToAdd: Order[] = [];
  ordersToUpdate: Order[] = [];
  selectedOption = "ryad"
  selectedType: any
  movableDate: any



  orderMap: Map<string, any> = new Map();

  ifHasChanges = false

  version: any
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService
  ) {
    this.version = environment.version
  }

  date3: any

  isDateValid(): boolean {
    // // Check if Date.parse can interpret it
    // const timestamp = Date.parse(this.date3);
    // if (isNaN(timestamp)) {
    //   return false;
    // }

    // // Additional check with Date object
    // const date = new Date(this.date3);
    // return date.toString() !== 'Invalid Date';
    let regex: RegExp;

    regex = /^\d{4}-\d{2}-\d{2}$/;


    if (!regex.test(this.date3)) return false;

    const date = new Date(this.date3);
    return !isNaN(date.getTime());
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

        await this.getFirstData()
        // await this.getData();

      }
    });
  }
  ifEnabledSearech() {

    if (this.selectedDatey && this.selectedOption && this.selectedType) {
      return true
    }
    return false
  }

  async getSharedData(getTypes = true) {
    if (getTypes) {
      await this.getTypes();
    }

    // await this.fetchProducts()
    await this.getPreOrders();
    await this.getDatesToAdd();
    await this.getSettings();
    // await this.getData()
    await this.search()
  }


  async getFirstData() {
    this.isLoading = true
    try {

      // this.isLoading = true
      await this.getSharedData()
      // await Promise.all([
      //   await this.getTypes(),
      //   await this.getPreOrders(),
      //   await this.getDatesToAdd(),
      //   await this.getSettings()
      // ]);

      this.addMissingOrders();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async search(): Promise<void> {
    this.isLoading = true;
    try {

      // await Promise.all([
      //   await this.getDatesToAdd(),
      //   await this.getSettings()
      // ]);

      // this.selectedDate = this.preOrders[0].createdAt.toDate();

      // if (!this.selectedDatey) {
      //   this.selectedDatey = Timestamp.now()
      // }
      console.log("seleele", this.selectedDatey);

      const { startTimestamp, endTimestamp } = this.getDateRangeTimestamps(this.selectedDatey ? this.selectedDatey.createdAt.toDate() : Timestamp.now().toDate());

      const [branches, products, orders] = await Promise.all([
        this.fetchBranches(),
        this.fetchProducts(),
        this.fetchOrders(startTimestamp, endTimestamp)
      ]);
      console.log("bb", branches);
      console.log("58oo", orders);
      // const orderToclean = orders.filter((order: any) => order.qnt == undefined)
      // Step 1: Filter orders with undefined qnt
      // const filteredOrders = orders.map((order, index) => ({ ...order, index }))
      //   .filter(order => order.qnt === undefined);
      // console.log("orderToclean", filteredOrders);

      // // Step 2: Count branchId occurrences
      // const branchIdCount: Record<string, number> = {};
      // filteredOrders.forEach(order => {
      //   const branchId = order.branchId;
      //   branchIdCount[branchId] = (branchIdCount[branchId] || 0) + 1;
      // });

      // // Step 3: Get indexes of orders with duplicated branchId
      // const duplicatedIndexes = filteredOrders
      //   .filter(order => branchIdCount[order.branchId] > 1)
      //   .map(order => order.index);

      // console.log(duplicatedIndexes);

      // Step 1: Filter orders where qnt is undefined






      this.branches = branches;
      this.data = products;
      this.orders = orders;
      console.log(orders);

      this.orders.forEach(order => {
        const key = `${order.branchId}_${order.productId}`;
        this.orderMap.set(key, order);
      });
      console.log("maps", this.orderMap);
      this.addMissingOrders();

      this.isGetData = true
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
    console.log("dddd", date);

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
      where("typeId", "==", this.selectedType.id),
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
      where("typeId", "==", this.selectedType.id),
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
      qntNotRequirement: doc.data()['qntNotRequirement'],

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
            qntNotRequirement: undefined,
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
      where("typeId", '==', this.selectedType.id),
      orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    this.actualPreOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      branchId: doc.data()['branchId'],
      typeId: doc.data()['typeId'],
      createdAt: doc.data()['createdAt']
    }));

    console.log("act", this.actualPreOrders);


    this.groupPreOrdersByDate();
    await this.deleteOldOrders();
  }

  async getTypes(): Promise<void> {
    const db = getFirestore();
    const q = query(collection(db, "types"));
    const snapshot = await getDocs(q);

    this.types = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name']
    }));
    if (this.types.length > 0) {
      this.selectedType = this.types[0]
    }
  }
  async getSettings(): Promise<void> {
    try {
      const db = getFirestore();

      // Reference to the specific document
      const docRef = doc(db, "settings", this.selectedType.id);


      console.log("sss", this.selectedType);


      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        this.isOn = settingsData['isOpen']
        console.log("Settings data:", settingsData);
        // You can assign the data to a component property here
        // this.settings = settingsData; // Assuming you have a settings property
      } else {
        console.log("No settings document found!");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      // You can handle the error here, like showing a user message
      // this.errorMessage = "Failed to load settings"; // Example error handling
    }
  }
  datesToAdd: any = []
  async getDatesToAdd(): Promise<void> {
    const db = getFirestore();
    const q = query(collection(db, "openDates"),
      where("typeId", "==", this.selectedType.id),);
    const snapshot = await getDocs(q);

    this.datesToAdd = snapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data()['createdAt']
    }));
  }

  async addAndDelete() {
    const filteredOrders = this.orders.filter(order => order.qnt === undefined);

    // Count occurrences of each branchId
    const branchIdCount: Record<string, number> = {};
    filteredOrders.forEach(order => {
      const branchId = order.branchId;
      branchIdCount[branchId] = (branchIdCount[branchId] || 0) + 1;
    });

    // Get branchIds that appear only once
    const uniqueBranchIds = Object.keys(branchIdCount).filter(branchId => branchIdCount[branchId] === 1);

    // Get full order objects with those unique branchIds
    const uniqueBranchOrders = filteredOrders.filter(order => uniqueBranchIds.includes(order.branchId));

    const idsToProcess = uniqueBranchOrders.map(order => ({
      id: order.id,
      branchId: order.branchId
    }));

    console.log(uniqueBranchOrders);
    

    const batch = writeBatch(this.apiService.db);

    // // Set createdAt to fixed date: Saturday, May 3, 2025
    // const fixedCreatedAt = Timestamp.fromDate(new Date('2025-05-03T00:00:00'));

    try {
      // 1. DELETE from `branchesOrders`
      idsToProcess.forEach(item => {
        batch.delete(doc(this.apiService.db, collectionNames.branchesOrders, item.id!!));
      });

      // 2. ADD to `orders` collection for each branch
      idsToProcess.forEach(item => {
        const summaryRef = doc(collection(this.apiService.db, collectionNames.orders)); // Auto-generated ID
        batch.set(summaryRef, {
          status: 0,
          branchId: item.branchId,
          city: this.selectedOption,
          typeId: this.selectedType.id,
          createdAt: this.selectedDatey.createdAt
        });
      });

      // 3. COMMIT the batch
      await batch.commit();
      console.log('Batch operation successful.');
    } catch (error) {
      console.error('Batch operation failed:', error);
    }
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
    if (this.preOrders.length > 0) {
      this.selectedDatey = this.preOrders[0]
    }

  }



  logout(): void {
    const auth = getAuth();
    signOut(auth).then(() => {
      this.router.navigate(['/login']);
    }).catch(console.error);
  }

  // Product CRUD operations
  addToProductsToAdd(): void {
    this.productsToAdd.push({ name: "", unit: "", unitF: "", city: this.selectedOption, typeId: this.selectedType.id, createdAt: Timestamp.now() });
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
  onOrderChange(order: Order): void {
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
    // await this.getData()


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
              createdAt: this.selectedDatey.createdAt
            });
          }
          processedBranches.add(order.branchId);
        }

        // Always add the branchesOrder
        const branchesOrderRef = doc(collection(db, 'branchesOrders'));
        batch.set(branchesOrderRef, {
          ...order,
          city: this.selectedOption,
          createdAt: this.selectedDatey.createdAt
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


        const { id, qntNotRequirement, ...productWithoutId } = order;

        // Create the final object - excludes qntNotRequirement if falsy
        const updateData = qntNotRequirement
          ? { ...productWithoutId, qntNotRequirement } // Include if exists
          : productWithoutId;                          // Exclude if falsy

        // Now create the new object, including the product without the id and the createdAt timestamp
        // const newData = {
        //   ...productWithoutId,        // Include all product data except id
        // };

        batch.update(docRef, updateData);
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


  // exportToExcel() {
  //   // Prepare the worksheet data
  //   const wsData = this.prepareWorksheetData();

  //   // Create worksheet with correct headers
  //   const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  //   // Set column widths
  //   ws['!cols'] = [
  //     { wch: 5 },   // #
  //     { wch: 25 },  // Product Name
  //     { wch: 15 },  // Requested Unit
  //     { wch: 15 },  // Remain Unit
  //     ...Array(this.branches.length * 3).fill({ wch: 12 }) // Branch columns
  //   ];

  //   // Set row heights
  //   ws['!rows'] = [{ hpt: 20 }, { hpt: 25 }]; // Header rows

  //   // Create workbook
  //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  //   // Generate Excel file
  //   const date = this.selectedDate!!.toISOString().slice(0, 10);
  //   XLSX.writeFile(wb, `Orders${this.selectedOption}_Export_${date}.xlsx`);
  // }

  // prepareWorksheetData(): any[][] {
  //   const wsData = [];

  //   // First header row (branch names)
  //   const header1 = ['', '', '', ''];
  //   this.branches.forEach(branch => {
  //     // header1.push(branch.name, '', ''); // Main branch header spans 3 columns
  //   });
  //   wsData.push(header1);

  //   // Second header row (column titles)
  //   const header2 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
  //   this.branches.forEach(() => {
  //     header2.push('Requested Qnt', 'Remain Qnt', 'Status');
  //   });
  //   wsData.push(header2);

  //   // Add existing products
  //   this.data.forEach((product, i) => {
  //     const row = [
  //       i + 1,
  //       product.name,
  //       product.unit,
  //       product.unitF
  //     ];

  //     this.branches.forEach(branch => {
  //       const order = this.orders.find(o =>
  //         o.branchId === branch.id && o.productId === product.id
  //       );

  //       const statusText =
  //         order?.status === '1' ? 'Received' :
  //           order?.status === '0' ? 'No Action' :
  //             order?.status === '2' ? 'Not Received' : // Fixed duplicate '0' case
  //               order?.status === '3' ? `${order.qntNotRequirement || 0}` :
  //                 '';

  //       row.push(
  //         order?.qnt || '',
  //         order?.qntF || '',
  //         statusText
  //         // order?.status === '1' ? 'Received' : (order!.status === '0' ? 'No Action' : (order!.status === '0' ? 'Not Recieved' : ''))
  //       );
  //     });

  //     wsData.push(row);
  //   });

  //   // Add new products
  //   this.productsToAdd.forEach((newProduct: any) => {
  //     const row = [
  //       'New',
  //       newProduct.name || '',
  //       newProduct.unit || '',
  //       newProduct.unitF || ''
  //     ];

  //     // Empty cells for branches
  //     this.branches.forEach(() => {
  //       row.push('', '', '');
  //     });

  //     wsData.push(row);
  //   });

  //   return wsData;
  // }




  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  exportToExcel() {
    // Prepare data and styling
    const wsData = [];
    const merges: any[] = [];
    const cellStyles: { [key: string]: any } = {};



    // First header row (branch names)
    const header1 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
    this.branches.forEach((branch, index) => {
      const startCol = 4 + (index * 3);
      header1.push(branch.name, '', '');
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['', '', '', ''];
    this.branches.forEach(() => header2.push('Requested Qnt', 'Remain Qnt', 'Status'));
    wsData.push(header2);

    // Existing products
    this.data.forEach((product, rowIndex) => {
      const row = [rowIndex + 1, product.name, product.unit, product.unitF];

      this.branches.forEach((branch, branchIndex) => {
        const order = this.orders.find(o => o.branchId === branch.id && o.productId === product.id);
        const status = this.getStatusDisplay(order);

        row.push(
          order?.qnt,
          order?.qntF,
          status
        );

        // Style for status cell
        const statusCol = 4 + (branchIndex * 3) + 2;
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: statusCol });
        const d = this.statusStyles(status);

        if (status && d) {
          cellStyles[cellAddress] = this.statusStyles(status);
        }
      });

      wsData.push(row);
    });



    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      ...Array(this.branches.length * 3).fill({ wch: 15 })
    ];

    // Row heights
    ws['!rows'] = [
      { hpx: 30 },
      { hpx: 25 }
    ];

    // Apply styles to status cells
    Object.keys(cellStyles).forEach(cellAddress => {
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: cellStyles[cellAddress].fill,
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { color: { rgb: "000000" } }
        };
      }
    });

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders Report');

    // Generate filename and save
    const dateStr = this.formatDate(this.selectedDatey.createdAt.toDate()!!);
    const city = this.selectedOption == 'ryad' ? 'Riyadh' : 'out_Riyadh';
    XLSX.writeFile(wb, `Orders_${city}_all_data_${dateStr}.xlsx`);
  }
  exportToExcel2() {
    // Prepare data and styling
    const wsData = [];
    const merges: any[] = [];
    const cellStyles: { [key: string]: any } = {};



    // First header row (branch names)
    const header1 = ['#', 'Product Name', 'Requested Unit'];
    this.branches.forEach((branch, index) => {
      const startCol = 3 + (index * 2);
      header1.push(branch.name, '');
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 1 } });
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['', '', ''];
    this.branches.forEach(() => header2.push('Requested Qnt', 'Status'));
    wsData.push(header2);

    // Existing products
    this.data.forEach((product, rowIndex) => {
      const row = [rowIndex + 1, product.name, product.unit];

      this.branches.forEach((branch, branchIndex) => {
        const order = this.orders.find(o => o.branchId === branch.id && o.productId === product.id);
        const status = this.getStatusDisplay(order);

        row.push(
          order?.qnt,
          status
        );

        // Style for status cell
        const statusCol = 2 + (branchIndex * 2) + 2;
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: statusCol });
        const d = this.statusStyles(status);

        if (status && d) {
          cellStyles[cellAddress] = this.statusStyles(status);
        }
      });

      wsData.push(row);
    });
    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      ...Array(this.branches.length * 3).fill({ wch: 15 })
    ];

    // Row heights
    ws['!rows'] = [
      { hpx: 30 },
      { hpx: 25 }
    ];

    // Apply styles to status cells
    Object.keys(cellStyles).forEach(cellAddress => {
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: cellStyles[cellAddress].fill,
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { color: { rgb: "000000" } }
        };
      }
    });

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders Report');

    // Generate filename and save
    const dateStr = this.formatDate(this.selectedDatey.createdAt.toDate()!!);
    const city = this.selectedOption == 'ryad' ? 'Riyadh' : 'out_Riyadh';
    XLSX.writeFile(wb, `Orders_${city}_with_notes_${dateStr}.xlsx`);
  }
  exportToExcel3() {
    // Prepare data and styling
    const wsData = [];
    const merges: any[] = [];
    const cellStyles: { [key: string]: any } = {};



    // First header row (branch names)
    var header1 = ['#', 'Product Name', 'Requested Unit'];
    if (this.selectedType.id == 'Ikt6pyFoTwvwn7GBIPvv') {
      header1 = ['#', 'المنتج', 'الوحدة'];
    }
    this.branches.forEach((branch, index) => {
      // const startCol = 3 + (index * 1);
      header1.push(branch.name);
      // merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 1 } });
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['', '', ''];
    if (this.selectedType.id == 'Ikt6pyFoTwvwn7GBIPvv') {
      this.branches.forEach(() => header2.push('الكمية الطلوبة'));
    } else
      this.branches.forEach(() => header2.push('Requested Qnt'));
    wsData.push(header2);

    // Existing products
    this.data.forEach((product, rowIndex) => {
      const row = [rowIndex + 1, product.name, product.unit];

      this.branches.forEach((branch, branchIndex) => {
        const order = this.orders.find(o => o.branchId === branch.id && o.productId === product.id);
        const status = this.getStatusDisplay(order);

        row.push(
          order?.qnt,
        );
      });

      wsData.push(row);
    });
    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      ...Array(this.branches.length * 3).fill({ wch: 15 })
    ];

    // Row heights
    ws['!rows'] = [
      { hpx: 30 },
      { hpx: 25 }
    ];

    // Apply styles to status cells
    Object.keys(cellStyles).forEach(cellAddress => {
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: cellStyles[cellAddress].fill,
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { color: { rgb: "000000" } }
        };
      }
    });

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders Report');

    // Generate filename and save
    const dateStr = this.formatDate(this.selectedDatey.createdAt.toDate()!!);
    const city = this.selectedOption == 'ryad' ? 'Riyadh' : 'out_Riyadh';
    XLSX.writeFile(wb, `Orders_${city}_with_notes_${dateStr}.xlsx`);
  }



  // exportToExcel() {
  //   // Prepare the worksheet data and merge ranges
  //   const { data, merges } = this.prepareWorksheetData();

  //   // Create worksheet with correct headers
  //   const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);

  //   // Set merge ranges for branch headers
  //   ws['!merges'] = merges;

  //   // Set column widths (optimized for better display)
  //   ws['!cols'] = [
  //     { wch: 5 },   // #
  //     { wch: 30 },  // Product Name (wider for better readability)
  //     { wch: 15 },  // Requested Unit
  //     { wch: 15 },  // Remain Unit
  //     ...Array(this.branches.length * 3).fill({ wch: 15 }) // Branch columns
  //   ];

  //   // Set row heights (header rows taller)
  //   ws['!rows'] = [
  //     { hpx: 30 }, // First header row (merged branch names)
  //     { hpx: 25 }  // Second header row (column titles)
  //   ];

  //   // Create workbook
  //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Orders Report');

  //   // Generate Excel file with formatted date
  //   const dateStr = this.formatDate(this.selectedDate!!);
  //   const city = this.selectedOption == 'ryad' ? 'Riyadh' : 'out_Riyadh'
  //   XLSX.writeFile(wb, `Orders_${city}_all_data_${dateStr}.xlsx`);
  // }
  // prepareWorksheetData(): { data: any[][], merges: any[] } {
  //   const wsData = [];
  //   const merges: any = [];

  //   // First header row (branch names)
  //   const header1 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
  //   this.branches.forEach((branch, index) => {
  //     const startCol = 4 + (index * 3); // Starting column index (0-based)
  //     header1.push(branch.name, '', ''); // Branch name spans 3 columns

  //     // Add merge range for this branch header
  //     merges.push({
  //       s: { r: 0, c: startCol },    // Start row (0), start column
  //       e: { r: 0, c: startCol + 2 } // End row (0), end column
  //     });
  //   });
  //   wsData.push(header1);

  //   // Second header row (column titles)
  //   const header2 = ['', '', '', '']; // Empty cells for first 4 columns
  //   this.branches.forEach(() => {
  //     header2.push('Requested Qnt', 'Remain Qnt', 'Status');
  //   });
  //   wsData.push(header2);

  //   // Add existing products
  //   this.data.forEach((product, index) => {
  //     const row = [
  //       index + 1,
  //       product.name,
  //       product.unit,
  //       product.unitF
  //     ];

  //     this.branches.forEach(branch => {
  //       const order = this.orders.find(o =>
  //         o.branchId === branch.id && o.productId === product.id
  //       );

  //       row.push(
  //         order?.qnt || '0',
  //         order?.qntF || '0',
  //         this.getStatusDisplay(order)
  //       );
  //     });

  //     wsData.push(row);
  //   });

  //   // Add new products
  //   this.productsToAdd.forEach((newProduct: any) => {
  //     const row = [
  //       'New',
  //       newProduct.name || '',
  //       newProduct.unit || '',
  //       newProduct.unitF || ''
  //     ];

  //     this.branches.forEach(() => {
  //       row.push('', '', 'Pending');
  //     });

  //     wsData.push(row);
  //   });

  //   return { data: wsData, merges: merges };
  // }

  statusStyles(value: any) {
    const styles: { [key: string]: any } = {
      'No Action': { fill: { fgColor: { rgb: "CCCCCC" } } },     // Gray
      'Received': { fill: { fgColor: { rgb: "00FF00" } } },      // Green
      'Not Received': { fill: { fgColor: { rgb: "FF0000" } } },  // Red
      'Not Requested': { fill: { fgColor: { rgb: "FFFFFF" } } }, // White
    };

    // Return the matched style or fallback (yellow)
    return styles[value] || { fill: { fgColor: { rgb: "FFFF00" } } };
  }

  prepareWorksheetData2(): { data: any[][], merges: any[] } {
    const wsData = [];
    const merges: any = [];

    // First header row (branch names)
    const header1 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
    this.branches.forEach((branch, index) => {
      const startCol = 4 + (index * 3); // Starting column index (0-based)
      header1.push(branch.name, ''); // Branch name spans 3 columns

      // Add merge range for this branch header
      merges.push({
        s: { r: 0, c: startCol },    // Start row (0), start column
        e: { r: 0, c: startCol + 1 } // End row (0), end column
      });
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['', '', '', '']; // Empty cells for first 4 columns
    this.branches.forEach(() => {
      header2.push('Requested Qnt', 'Status');
    });
    wsData.push(header2);

    // Add existing products
    this.data.forEach((product, index) => {
      const row = [
        index + 1,
        product.name,
        product.unit,
        product.unitF
      ];

      this.branches.forEach(branch => {
        const order = this.orders.find(o =>
          o.branchId === branch.id && o.productId === product.id
        );

        row.push(
          order?.qnt || '-0',
          // order?.qntF || '0',
          this.getStatusDisplay(order)
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

      this.branches.forEach(() => {
        row.push('', '', 'Pending');
      });

      wsData.push(row);
    });

    return { data: wsData, merges: merges };
  }


  prepareWorksheetData3(): { data: any[][], merges: any[] } {
    const wsData = [];
    const merges: any = [];

    // First header row (branch names)
    const header1 = ['#', 'Product Name', 'Requested Unit', 'Remain Unit'];
    this.branches.forEach((branch, index) => {
      const startCol = 4 + (index * 3); // Starting column index (0-based)
      header1.push(branch.name); // Branch name spans 3 columns

      // Add merge range for this branch header
      merges.push({
        s: { r: 0, c: startCol },    // Start row (0), start column
        e: { r: 0, c: startCol } // End row (0), end column
      });
    });
    wsData.push(header1);

    // Second header row (column titles)
    const header2 = ['', '', '', '']; // Empty cells for first 4 columns
    this.branches.forEach(() => {
      header2.push('Requested Qnt');
    });
    wsData.push(header2);

    // Add existing products
    this.data.forEach((product, index) => {
      const row = [
        index + 1,
        product.name,
        product.unit,
        product.unitF
      ];

      this.branches.forEach(branch => {
        const order = this.orders.find(o =>
          o.branchId === branch.id && o.productId === product.id
        );

        row.push(
          order?.qnt || '0',
          // order?.qntF || '0',
          // this.getStatusDisplay(order)
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

      this.branches.forEach(() => {
        row.push('', '', 'Pending');
      });

      wsData.push(row);
    });

    return { data: wsData, merges: merges };
  }


  private getStatusDisplay(order?: any): string {
    if (!order) return 'Pending';

    switch (order.status) {
      case '0': return 'No Action';
      case '1': return 'Received';
      case '2': return 'Not Received';
      case '4': return 'Not Requested';
      default: return order.qntNotRequirement;
      // default: return 'Pending';
    }
  }


  // Faster order lookup
  // getOrder(branchId: string, productId: string) {
  //   return this.orderMap.get(`${branchId}_${productId}`);
  // }
  getOrder(branchId: any, productId: any): any {
    return this.orders.find((order: any) =>
      order.branchId === branchId &&
      order.productId === productId
    );
  }
  // getOrders(branchId: any): any {
  //   var data: any = this.data;

  //   // const finded = this.orders.find((order: any) => order.branchId === branchId);
  //   const arr = [];
  //   for (let index = 0; index < data.length; index++) {
  //     const product = data[index];

  //     const order = this.getOrder(branchId, product.id)
  //     if (order) {
  //       arr.push(product.name)
  //       arr.push(order.qntF)
  //       arr.push(product.unitF)
  //       arr.push(product.qnt)
  //       arr.push(product.unit)
  //     }
  //   }
  //   data.push(arr)

  //   return data;
  // }
  getOrders(branchId: any): any[][] {
    const data = this.data;
    const result: any[][] = [];

    for (let i = 0; i < data.length; i++) {
      const product = data[i];
      const order = this.getOrder(branchId, product.id);

      if (order) {
        result.push([
          product.name,
          order.qntF,
          product.unitF,
          order.qnt,
          product.unit
        ]);
      }
    }
    // console.log('data', data);


    return result;
  }


  // TrackBy functions to minimize DOM changes
  trackByProductId(index: number, product: any): string {
    return product.id;
  }

  trackByBranchId(index: number, branch: any): string {
    return branch.id;
  }

  trackByOrderId(index: number, order: any): string {
    return order.id;
  }
  // Consolidated change handler
  onProductChange(product: any) {
    // Debounce this if needed
    // this.saveProduct(product);
  }


  isOn: any;

  async toggle() {
    this.isLoading = true
    try {
      const db = getFirestore();
      const docRef = doc(db, "settings", this.selectedType.id);

      // First get current value
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentValue = docSnap.data()['isOpen'];

        // Update to inverse value
        await updateDoc(docRef, {
          isOpen: !currentValue,
          updatedAt: serverTimestamp()
        });

        console.log("Status toggled successfully!");
        // Optional: Update local state
        this.isOn = !currentValue;
      } else {
        console.log("Document doesn't exist, creating it...");
        // Create document if it doesn't exist
        await setDoc(docRef, {
          isOpen: true,
          createdAt: serverTimestamp()
        });
        this.isOn = true;
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      this.isOn = !this.isOn;
    } finally {

      this.isLoading = false
    }
    // this.isOn = !this.isOn;
    // this.toggleChange.emit(this.isOn);
    // console.log('any', $event);

  }
}