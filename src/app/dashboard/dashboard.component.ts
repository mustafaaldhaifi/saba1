

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
import { ProductsService } from '../products.service';
import { OrdersService } from '../orders.service copy';
import { BranchesService } from '../branches.service';


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
  status: string;
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


  async reset(branch: Branch) {
    this.isLoading = true

    // const bra
    const orders = this.preOrders.find((order: any) => order.createdAt === this.selectedDatey.createdAt)?.orders
    console.log("branchId : ", branch.id);

    console.log("orders : ", orders);
    const orderId = orders?.find((order: any) => order.branchId == branch.id)!!.id
    console.log("order id to delete: ",);

    const ordersBranch = this.orders.filter((order: any) =>
      order.branchId === branch.id && order.id
      // order.productId === productId
    );
    console.log("ordersBranch To delete", ordersBranch);

    const batch = writeBatch(this.apiService.db);


    try {

      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

      if (orderId) {
        batch.delete(doc(this.apiService.db, collectionNames.orders, orderId));
      }
      // First process all orders deletions
      for (const element of ordersBranch) {
        batch.delete(doc(this.apiService.db, collectionNames.branchesOrders, element.id!!));
        // console.log("deleteOrderId", order.id);
      }
      // Commit the batch once after all operations are added
      await batch.commit();

      console.log("success");

    } catch (error) {
      console.error('Error deleting orders:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
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
    const isMonthally = this.selectedType.id == 'WbAP06wLDRvZFTYUtkjU'

    console.log('isMonthally', isMonthally);
    pdfService.export(this.getOrders(branch.id, isMonthally), false, formattedDate, branch.name, this.selectedType.name_en, isMonthally)
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
      this.orders = []
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
      this.orders = []
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

  productUpdates: any



  orderMap: Map<string, any> = new Map();

  ifHasChanges = false

  version: any
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private productService: ProductsService,
    private orderService: OrdersService,
    private branchService: BranchesService,

  ) {
    this.version = environment.version
  }

  date3: any


  getDetail(branch: any) {
    if (this.selectedDatey && this.selectedDatey.createdAt) {
      const orders = this.preOrders.find((order: any) => order.createdAt === this.selectedDatey.createdAt)?.orders
      // console.log("branchId : ", branch.id);

      const data = orders!!.find((order: any) => order.branchId == branch.id)
      return data
    }

    return null
  }

  printOrderDetail(branch: any) {
    if (this.selectedDatey && this.selectedDatey.createdAt) {
      const orders = this.preOrders.find((order: any) => order.createdAt === this.selectedDatey.createdAt)?.orders
      // console.log("branchId : ", branch.id);

      const data = orders!!.find((order: any) => order.branchId == branch.id)

      console.log("order", data);

      const a = this.orders.filter((order: any) =>
        order.branchId === branch.id
      );
      // console.log("order":this.preOrders.find);

      console.log("branch: ", branch);

      console.log("orderBranch: ", a);
    }


  }

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

    if (this.selectedType && this.selectedType.id == '5') {
      return true
    }

    if (this.selectedDatey && this.selectedOption && this.selectedType) {
      return true
    }
    return false
  }

  async getSharedData(getTypes = true) {
    try {
      // إذا كنا نريد جلب الأنواع، نجلبها أولاً
      if (getTypes) {
        await this.getTypes();
      }

      // نجلب البيانات الأخرى بالتوازي لتحسين الأداء
      const [preOrders, dates, settings, branches] = await Promise.all([
        this.getPreOrders(),
        this.getDatesToAdd(),
        this.getSettings(),
        this.fetchBranches()
      ]);

      // تخزين النتائج بعد الجلب
      this.branches = branches;

      // يمكن تنفيذ أشياء أخرى هنا بعد استكمال كل البيانات المطلوبة
      // await this.getData();
      // await this.search();

    } catch (error) {
      console.error('Error fetching shared data:', error);
    }
  }


  // async getSharedData(getTypes = true) {
  //   if (getTypes) {
  //     await this.getTypes();
  //   }

  //   // await this.fetchProducts()
  //   await this.getPreOrders();
  //   await this.getDatesToAdd();
  //   await this.getSettings();
  //   this.branches = await this.fetchBranches();

  //   // await this.getData()
  //   // await this.search()
  // }


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

  async updateCreatedAtValue(item: any) {
    this.isLoading = true
    const ref = doc(this.apiService.db, 'products', item.id);

    const newTimestamp = new Timestamp(
      item.createdAt.seconds,
      item.createdAt.nanoseconds
    );

    try {
      await updateDoc(ref, {
        createdAt: newTimestamp
      });
      console.log(`✅ Updated createdAt for ${item.id}`);
    } catch (error) {
      console.error(`❌ Error updating document ${item.id}:`, error);
    } finally {
      this.isLoading = false

    }
  }

  onDateChange(selectedItem: any): void {
    console.log('Date changed:', selectedItem);

    // this.getFirstData()
    // You can perform any logic here, for example:
    // this.loadPreOrdersByDate(selectedItem);
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

      this.data = await this.fetchProducts()

      // for (const item of this.data) {
      //   await this.updateCreatedAtValue(item);
      // }
      console.log(this.data);


      if (this.selectedDatey) {
        const { startTimestamp, endTimestamp } = this.getDateRangeTimestamps(
          this.selectedDatey.createdAt.toDate()
        );

        const [orders] = await Promise.all([
          this.selectedType.id !== '5'
            ? this.fetchOrders(startTimestamp, endTimestamp)
            : Promise.resolve([]) // fallback if type is '5'
        ]);

        if (this.selectedType.id !== '5') {
          this.orders = orders;
          console.log(orders);

          this.orders.forEach(order => {
            const key = `${order.branchId}_${order.productId}`;
            this.orderMap.set(key, order);
          });
          console.log("maps", this.orderMap);
          this.addMissingOrders();
        }

        // Do something with products and orders...
      } else {
        console.log('No date selected.');
        // Optionally handle this case
      }

      // if (this.selectedDatey) {
      // const { startTimestamp, endTimestamp } = this.getDateRangeTimestamps(this.selectedDatey ? this.selectedDatey.createdAt.toDate() : Timestamp.now().toDate());

      // }


      // const [products, orders] = await Promise.all([
      //   this.fetchProducts(),
      //   this.selectedType.id !== '5'
      //     ? this.fetchOrders(startTimestamp, endTimestamp)
      //     : Promise.resolve([]) // return empty array or any fallback value
      // ]);
      // console.log("bb", branches);
      // console.log("58oo", orders);






      // // this.branches = branches;
      // this.data = products;

      if (this.selectedType) {
        if (this.selectedType.id == '5') {
          // this.orders = orders;
          // console.log(orders);

          // this.orders.forEach(order => {
          //   const key = `${order.branchId}_${order.productId}`;
          //   this.orderMap.set(key, order);
          // });
          // console.log("maps", this.orderMap);
          // this.addMissingOrders();
        }
        else {
          await this.getDailyReportsDates();
        }
      }



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
    // const q = query(collection(this.apiService.db, "branches"),
    //   where("city", '==', this.selectedOption),
    // );
    // const snapshot = await getDocs(q);
    // return snapshot.docs.map(doc => ({
    //   id: doc.id,
    //   name: doc.data()['name']
    // }));

    const city = this.selectedOption;
    this.branchUpdates = await this.branchService.getLastupdate(city, this.apiService)
    return await this.branchService.getBranches(city, this.branchUpdates, this.apiService)
    // console.log("branches:", this.preOrders);
  }

  async exportProductsToFile(): Promise<void> {
    const db = getFirestore();
    const q = query(collection(db, "products"),

    );
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const jsonStr = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "products";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async exportBranchesOrdersToFile(): Promise<void> {
    try {
      const db = getFirestore();
      const q = query(collection(db, "branchesOrders"),

      );
      const snapshot = await getDocs(q);

      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("length", products.length);


      const jsonStr = JSON.stringify(products, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = "branchesOrders";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);

    }

  }

  private async fetchProducts(): Promise<Product[]> {
    this.isLoading = true
    const city = this.selectedOption;
    const typeId = this.selectedType.id;

    // const productsInfo = this.productService.getProductsFromLocal(city, typeId);

    this.productUpdates = await this.productService.getLastupdate(city, typeId, this.apiService);

    return await this.productService.getProducts(city, typeId, this.productUpdates, this.apiService)


    // console.log("productUpdates2", this.productUpdates);
    // console.log("productsInfo", productsInfo);


    // const shouldFetchFromServer = !productsInfo || this.productService.compareDate2(this.productUpdates.updatedAt, productsInfo.fetchedAt);

    // if (shouldFetchFromServer) {
    //   const db = getFirestore();
    //   const q = query(
    //     collection(db, "products"),
    //     where("city", '==', city),
    //     where("typeId", "==", typeId),
    //     orderBy("createdAt", "asc")
    //   );

    //   const snapshot = await getDocs(q);

    //   const products = snapshot.docs.map(doc => ({
    //     id: doc.id,
    //     name: doc.data()['name'],
    //     unit: doc.data()['unit'],
    //     unitF: doc.data()['unitF'],
    //     createdAt: doc.data()['createdAt'],
    //   }));

    //   this.productService.updateProductInLocal(products, city, typeId);

    //   console.log("products get from server");

    //   return products;
    // } else {
    //   console.log("products get from Local");
    //   return productsInfo.products;
    // }
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

  orderUpdates: any
  branchUpdates: any

  async getPreOrders(): Promise<void> {
    const city = this.selectedOption;
    const typeId = this.selectedType.id;
    this.orderUpdates = await this.orderService.getLastupdate(city, typeId, this.apiService)

    this.actualPreOrders = await this.orderService.getOrders(city, typeId, null, this.orderUpdates, this.apiService)
    console.log("preOrders:", this.preOrders);


    // const db = getFirestore();
    // const q = query(collection(db, "orders"),
    //   where("city", '==', this.selectedOption),
    //   where("typeId", '==', this.selectedType.id),
    //   orderBy("createdAt", "desc"));
    // const snapshot = await getDocs(q);

    // this.actualPreOrders = snapshot.docs.map(doc => ({
    //   id: doc.id,
    //   branchId: doc.data()['branchId'],
    //   typeId: doc.data()['typeId'],
    //   createdAt: doc.data()['createdAt']
    // }));

    // console.log("act", this.actualPreOrders);


    this.groupPreOrdersByDate();
    await this.deleteOldOrders();
  }

  async getTypes(): Promise<void> {
    const db = getFirestore();
    const q = query(collection(db, "types"));
    const snapshot = await getDocs(q);

    this.types = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name'],
      name_en: doc.data()['name_en'],

    }));
    // if (this.types.length > 0) {
    //   this.selectedType = this.types[0]
    // }
    if (environment.enabledDaily && environment.production == false) {
      this.types = [{ id: '5', name: "الجرد اليومي", name_en: 'Daily' }, ...this.types];
    }
    this.selectedType = this.types[0]
    // this.types.unshift({ id: 5, name: "الجرد اليومي", name_en: 'Daily' })
    console.log('types', this.types);

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

  ////
  allowableEdits: any
  async getAllowableEdits(): Promise<void> {
    this.isLoading = true
    try {
      const db = getFirestore();

      // Reference to the specific document
      const docRef = doc(db, "settings", 'allowableEdits');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const Data = docSnap.data();
        this.allowableEdits = Data['typeIds']
        console.log("allowableEdits data:", Data);
        // You can assign the data to a component property here
        // this.settings = settingsData; // Assuming you have a settings property
      } else {
        console.log("No allowableEdits document found!");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      // You can handle the error here, like showing a user message
      // this.errorMessage = "Failed to load settings"; // Example error handling
    } finally {
      this.isLoading = false
    }
  }

  isSelectedTypeAllowed(): boolean {
    return this.allowableEdits.includes(this.selectedType.id);
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

  async addProductsToCity() {



    const batch = writeBatch(this.apiService.db);

    // // Set createdAt to fixed date: Saturday, May 3, 2025
    // const fixedCreatedAt = Timestamp.fromDate(new Date('2025-05-03T00:00:00'));

    try {

      this.data.forEach((item: any) => {
        // const item: Item = { id: 1, name: 'Alice' };

        const { id, ...dataWithoutId } = item;

        dataWithoutId.city = 'other'; // Now this is valid
        dataWithoutId.typeId = this.selectedType.id; // Now this is valid

        console.log(dataWithoutId);

        const summaryRef = doc(collection(this.apiService.db, collectionNames.products)); // Auto-generated ID
        batch.set(summaryRef, dataWithoutId);
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
      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });
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
          where("typeId", "==", this.selectedType.id),
          where("city", "==", this.selectedOption),
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

    console.log("preee", this.preOrders);


  }



  logout(): void {
    const auth = getAuth();
    signOut(auth).then(() => {
      this.orderService.remove()
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
      // ✅ Corrected document path for updating productUpdates
      const docRef2 = doc(db, 'productUpdates', this.productUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

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

    const element = {
      order,
      city: this.selectedOption,

    }

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
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // ✅ Corrected document path for updating productUpdates
      const docRef2 = doc(db, 'productUpdates', this.productUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

      // ✅ Loop through products safely
      for (const product of this.productsToAdd) {
        if (product.name) {
          console.log(product);

          const docRef = doc(collection(db, 'products'));
          const { id, ...productWithoutId } = product;

          const newData = {
            ...productWithoutId,
            // You can optionally add:
            // createdAt: Timestamp.now(),
            // city: this.selectedOption,
          };
          console.log(newData);

          batch.set(docRef, newData);
        }
      }

      await batch.commit();
      this.productsToAdd = []
      console.log("added success");

      // this.productService.updateProductInLocal(this.data, this.selectedOption, this.selectedType.id)
      // await this.fetchProducts()
      this.search()
    } catch (error) {

      console.log(error);

    }
    // finally {
    //   this.isLoading = true
    // }


    // Optionally refresh UI or data after adding
    // await this.getData();
  }


  private async updateProducts(): Promise<void> {
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // ✅ Corrected document path for updating productUpdates
      console.log("productUpdates", this.productUpdates);

      const docRef2 = doc(db, 'productUpdates', this.productUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

      this.productsToUpdate.forEach((product: any) => {
        const docRef = doc(db, 'products', product.id);
        const { id, createdAt, ...productWithoutId } = product;

        // Update the document with the remaining fields
        batch.update(docRef, productWithoutId);
      });

      await batch.commit();
      this.productsToUpdate = [];

      this.search()

    } catch (error) {

      console.log(error);

    }
  }

  selectedDate: any
  onSelectdDateOpenDate(date: any) {

    this.selectedDate = date

  }
  async addOrderDate(branch: any) {
    this.isLoading = true;
    // const db = getFirestore();
    const batch = writeBatch(this.apiService.db); // Initialize batch

    try {

      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

      // 2. Add the summary document
      const summaryRef = doc(collection(this.apiService.db, collectionNames.orders));
      batch.set(summaryRef, {
        status: 0,
        branchId: branch.id,
        city: this.selectedOption,
        typeId: this.selectedType.id,
        // qntNumber: this.ordersToAdd.length,
        createdAt: this.selectedDate // Server-side timestamp
      });



      // 3. Execute everything as a single batch
      await batch.commit(); // Single network call

      // this.ordersToAdd = [];
      // alert('All orders added successfully in one operation!');
      alert("يعطيك العافية تم الارسال بنجاح")
      // await this.getBranch()
      // window.location.reload()
    } catch (e) {
      console.error("Batch write failed: ", e);
      alert('No orders were added. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }


  private async addOrders(): Promise<void> {

    if (!this.ordersToAdd.length) return;

    console.log("start Add", this.ordersToAdd);


    const db = getFirestore();
    const batch = writeBatch(db);
    const processedBranches = new Set<string>(); // Track processed branches

    try {
      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });
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
    if (!this.ordersToUpdate.length) return;

    try {
      console.log("start Update", this.ordersToUpdate);

      const db = getFirestore();
      const batch = writeBatch(db);

      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

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
    } catch (error) {
      console.log(error);

    }

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

    if (this.selectedType.id == 'Ikt6pyFoTwvwn7GBIPvv') {
      switch (order.status) {
        case '0': return "No Action";
        case '1': return order.qntNotRequirement;
        case '2': return 'Not Received';
        default: return 'EEEE';
        // default: return 'Pending';
      }

      // if (order.status == '1') {
      //   return order.qntNotRequirement;
      // }
      // else
      //   return 'Not Received';
    }
    switch (order.status) {
      // case '0': return 'No Action';
      case '0': return 'Not Requested';
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
  getOrders(branchId: any, isMonthly: boolean): any[][] {
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
          ...(!isMonthly ? [order.qnt, product.unit] : [])
        ]);
      }
    }

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

  async toggleAlowEdit() {
    this.isLoading = true;
    try {
      const db = getFirestore();
      const docRef = doc(db, "settings", "allowableEdits");

      const docSnap = await getDoc(docRef);

      let currentTypeIds: string[] = [];

      if (docSnap.exists()) {
        currentTypeIds = docSnap.data()['typeIds'] || [];
      }

      const idAsString = this.selectedType.id;

      const index = currentTypeIds.indexOf(idAsString);

      if (index > -1) {
        // Remove if already exists
        currentTypeIds.splice(index, 1);
        console.log("Type ID removed");
      } else {
        // Add if not exists
        currentTypeIds.push(idAsString);
        console.log("Type ID added");
      }

      // Update in Firestore
      await setDoc(docRef, { typeIds: currentTypeIds }, { merge: true });

      // Update local state
      this.allowableEdits = currentTypeIds;

    } catch (error) {
      console.error("Error toggling edit permission:", error);
    } finally {
      this.isLoading = false;
    }
  }





  ///// Daily
  selectedBranch: any
  onSelectBranch(branch: Branch) {
    if (this.selectedType.id == '5') {
      this.selectedBranch = branch
    }
  }

  normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  dailyReportsDates: any = []
  async getDailyReportsDates(): Promise<void> {
    // console.log(serverTimestamp());

    // Get the first and last day of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day of month

    const q = query(
      collection(this.apiService.db, collectionNames.dailyReportsDates),
      where("branchId", "==", this.selectedBranch.id),
      where("typeId", "==", this.selectedType.id),
      where("date", ">=", Timestamp.fromDate(startOfMonth)),
      where("date", "<=", Timestamp.fromDate(endOfMonth)),
      // orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    this.dailyReportsDates = snapshot.docs.map(doc => ({
      id: doc.id,
      typeId: doc.data()['typeId'],
      branchId: doc.data()['branchId'],
      date: doc.data()['date'],
    }));

    this.dailyReportsDates = this.dailyReportsDates.sort((a: any, b: any) =>
      b.date.toDate().getTime() - a.date.toDate().getTime()
    );

    console.log(this.dailyReportsDates);

    this.selectedDailyDate = null

    if (this.dailyReportsDates.length > 0) {
      this.selectedDailyDate = this.dailyReportsDates[0];
    }



    // // Set the start and end of today (midnight to 23:59:59)
    // const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    // const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // // Convert to Firestore Timestamps
    // const startTimestamp = Timestamp.fromDate(startOfDay);
    // const endTimestamp = Timestamp.fromDate(endOfDay);

    // // Check if a report for today already exists
    // const reportExists = this.dailyReportsDates.some((item: any) => {
    //   const createdAt = item.date.toDate();  // Ensure createdAt is converted to Date if it's a Firebase Timestamp
    //   return createdAt >= startTimestamp.toDate() && createdAt <= endTimestamp.toDate();
    // });

    // // Handle missing dates logic
    // const sortedReports = this.dailyReportsDates
    //   .map((item: any) => this.normalizeDate(item.date.toDate())) // Normalize to midnight
    //   .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    // let missingDate: Date | null = null;

    // if (sortedReports.length > 0) {
    //   const oldestReportDate = sortedReports[0];
    //   const currentDate = this.normalizeDate(now);

    //   const tempDate = new Date(oldestReportDate);

    //   while (tempDate < currentDate) {
    //     tempDate.setDate(tempDate.getDate() + 1);

    //     const normalizedTemp = this.normalizeDate(tempDate);

    //     const exists = sortedReports.some(
    //       (reportDate: Date) => reportDate.getTime() === normalizedTemp.getTime()
    //     );

    //     if (!exists) {
    //       missingDate = normalizedTemp;
    //       break;
    //     }
    //   }

    //   const todayExists = sortedReports.some(
    //     (reportDate: Date) => reportDate.getTime() === currentDate.getTime()
    //   );

    //   if (!missingDate && !todayExists) {
    //     missingDate = null; // Only today is missing — ignore
    //     console.log('Only today is missing. Ignoring.');
    //   } else if (!missingDate) {
    //     console.log('No missing dates.');
    //   } else {
    //     console.log('The oldest missing date is:', missingDate);
    //   }
    // }


    // await this.getDailyReports();
    // await this.getOpeningStock();
    // this.combineDataWithReports()
  }

  selectedDailyDate: any
  onDateDailyChange($event: any) {
    // throw new Error('Method not implemented.');
    console.log($event);
    this.selectedDailyDate = $event

  }

  startDate: string = '';
  endDate: string = '';
  filteredReports: any[] = [];

  onDateRangeChange() {
    if (this.startDate && this.endDate) {
      const from = new Date(this.startDate);
      const to = new Date(this.endDate);

      if (from > to) {
        alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        return;
      }

      this.filteredReports = this.dailyReportsDates.filter((item: any) => {
        const itemDate = item.date.toDate(); // تأكد أنه Date
        return itemDate >= from && itemDate <= to;
      });

      console.log('البيانات المفلترة:', this.filteredReports);
    }
  }

}