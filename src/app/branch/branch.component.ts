import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, inject, Inject, PLATFORM_ID, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, DocumentReference, getDoc, getDocs, getFirestore, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ApiService } from '../api.service';
import { collectionNames } from '../Shareds';
import { environment } from '../../env';
import { PdfService } from '../pdf.service';
import { ProductsService } from '../products.service';
import { OrdersService } from '../orders.service copy';
import { DailyReportsService } from '../dailyReports.service';
import { retry } from 'rxjs';
import { ReasonDialogComponent } from "../reason-dialog/reason-dialog.component";
import { ModalService } from '../CustomModalService';
import { AlertDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ReasonDialogComponent2 } from '../reason-dialog2/reason-dialog2.component';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [CommonModule, FormsModule, ReasonDialogComponent],
  templateUrl: './branch.component.html',
  styleUrls: ['./branch.component.css']
})
export class BranchComponent {



  isReadDailyMode: boolean;

  isAdmin = false
  dialyNote: any[] = [];
  Object: any;
  fullyFilledMonths: any;

  exportPdf() {
    const pdfService = new PdfService();
    const date = this.selectedDate.toDate();

    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log("typeee", this.selectedType);

    const isMonthally = this.selectedType.id == 'WbAP06wLDRvZFTYUtkjU'

    console.log('isMonthally', isMonthally);
    const data = this.getOrders(this.branch.id, isMonthally)
    console.log("dattttaaa", data);


    pdfService.export(data, true, formattedDate, this.branch.data.name, this.selectedType.name_en, isMonthally)
  }
  getOrders(branchId: any, isMonthally: boolean): any[][] {
    const data = this.data;
    console.log(data);

    const result: any[][] = [];

    for (let i = 0; i < data.length; i++) {
      const product = data[i];
      const order = this.getOrder2(branchId, product.id);
      console.log("branchId", branchId);

      console.log("product.id", product.id);

      console.log("orrrddder", order);


      if (order) {
        if (isMonthally) {
          result.push([
            product.name,
            order.qntF,
            product.unitF,
            // order.qnt,
            // product.unit
          ]);
        } else {
          result.push([
            product.name,
            // order.qntF,
            // product.unitF,
            order.qntF,
            product.unitF,
            order.qnt,
            product.unit,

          ]);
        }

      }
    }
    // console.log('data', data);


    return result;
  }

  // ifCurrentDateInPreOrders1 = false
  ordersToAdd: any = [];
  ordersToUpdate: any = [];
  preOrders: any = [];
  isLoading = false;
  branch: any;
  data: any = [];
  selectedDate: any;
  combinedData: any[] = [];
  branchOrders: any[] = [];
  types: any[] = [];
  selectedType: any
  isToAddMode = false
  isPreSent = false
  selectedPreOrder: any
  currentTimestamp: any  // Get the current Firebase Timestamp
  datesToAdd: any = []
  groupedData: any = [];
  rowIndexes: number[] = [];
  isOn: any
  orderUpdates: any
  dailyReportUpdates: any

  version: any
  constructor(
    private modalService: ModalService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private productsServices: ProductsService,
    private orderService: OrdersService,
    private dailyReportService: DailyReportsService
  ) {
    this.version = environment.version

    this.isReadDailyMode = false
    // initializeApp(environment.firebase);
  }




  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTimestamp = Timestamp.now();
      await this.getBranch();
    }

  }

  /// Save
  async saveUpdates() {
    this.isLoading = true;
    const batch = writeBatch(this.apiService.db);
    const orderRef = doc(this.apiService.db, collectionNames.orders, this.selectedPreOrder.id);

    // const productRef = doc(db, "branchesOrders", element.id);
    // Loop over the orders to update

    console.log("rfrf0", this.ordersToUpdate);

    // ✅ Corrected document path for updating 
    const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

    batch.update(docRef2, {
      updatedAt: Timestamp.now(),
    });


    for (const element of this.ordersToUpdate) {
      const productRef = doc(this.apiService.db, collectionNames.branchesOrders, element.id);

      // Exclude the 'id' field from the update data using destructuring
      const { id, ...updatedData } = element; // This removes `id` from the object

      try {
        // Add the update operation to the batch
        batch.update(productRef, updatedData);

        console.log(updatedData);

        console.log(`Order with ID: ${element.id} added to batch for update.`);
        // Find the index of the selected order
        const orderIndex = this.preOrders.findIndex(
          (order: any) => order.id === this.selectedPreOrder.id
        );

        if (orderIndex !== -1) {
          // Update the status of the found order to '1'
          const e = {
            ...this.preOrders[orderIndex],  // Keep existing properties
            status: '1'                    // Update status
          };
          this.preOrders[orderIndex] = e
          this.selectedPreOrder = e
        }

      } catch (e) {
        console.error("Error preparing batch update for order:", e);
      }
    }

    try {
      const s = {
        status: '1',
        updatedFromUser: serverTimestamp(),
      };
      batch.update(orderRef, s)
      // Commit the batch (all updates happen in one command)
      await batch.commit();
      alert("يعطيك العافية تم التحديث بنجاح")
      this.ordersToUpdate = []
      console.log("All orders updated successfully.");
    } catch (e) {
      console.error("Error committing batch update:", e);
    } finally {
      this.isLoading = false;
    }
  }

  /// Add
  async addOrders(newProducts = false) {
    if (this.ordersToAdd.length === 0) return;

    this.isLoading = true;
    // const db = getFirestore();
    const batch = writeBatch(this.apiService.db); // Initialize batch



    try {


      // 1. Add all order items
      this.ordersToAdd.forEach((element: any) => {
        console.log("element", element);

        const orderRef = doc(collection(this.apiService.db, collectionNames.branchesOrders)); // Auto-generate ID
        batch.set(orderRef, {
          branchId: this.branch.id,
          productId: element.productId,
          typeId: this.selectedType.id,
          qnt: element.qnt,
          qntF: element.qntF,
          city: this.branch.data.city,

          status: '0',
          createdAt: this.selectedDate // Better than manual timestamp
        });
      });

      if (newProducts === false) {
        // ✅ Corrected document path for updating 
        const docRef2 = doc(this.apiService.db, 'orderUpdates', this.orderUpdates.id);

        batch.update(docRef2, {
          updatedAt: Timestamp.now(),
        });

        // 2. Add the summary document
        const summaryRef = doc(collection(this.apiService.db, collectionNames.orders));
        batch.set(summaryRef, {
          status: 0,
          branchId: this.branch.id,
          city: this.branch.data.city,
          typeId: this.selectedType.id,
          // qntNumber: this.ordersToAdd.length,
          createdAt: this.selectedDate // Server-side timestamp
        });
      }


      // 3. Execute everything as a single batch
      await batch.commit(); // Single network call

      this.ordersToAdd = [];
      // alert('All orders added successfully in one operation!');
      alert("يعطيك العافية تم الارسال بنجاح")
      await this.getBranch()
      // window.location.reload()
    } catch (e) {
      console.error("Batch write failed: ", e);
      alert('No orders were added. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }
  /// Get
  async getBranch() {
    this.isLoading = true;
    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2") {
          const branchStr = localStorage.getItem("selectedBranch");

          if (branchStr) {
            try {
              const parsed = JSON.parse(branchStr);
              this.branch = {
                id: parsed.id,
                data: {
                  name: parsed.name,
                  city: parsed.city
                }
              };
              this.isAdmin = true
            } catch (e) {
              console.error('Invalid JSON in localStorage:', e);
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          const name = user.email?.split('@')[0];
          this.branch = await this.getRelatedBranche(name!);
        }
        console.log("branch", this.branch);

        await this.getTypes()
        await this.getProducts()
        await this.getAllowableEdits()


        if (this.selectedType.id == '5') {
          await this.initDaily()
        } else {
          await Promise.all([
            this.getDatesToAdd(),
            this.getPreOrders(),
            this.getSettings(),

          ]);

          this.preOrders.forEach((pre: any) => {
            // console.log("pre", pre);
            // console.log("pre", pre.createdAt);
            // console.log("pre", pre.createdAt.toDate());



            this.datesToAdd.forEach((date: any, index: number) => {
              if (date.createdAt.toDate().toISOString().split('T')[0] == pre.createdAt.toDate().toISOString().split('T')[0]) {
                this.datesToAdd.splice(index, 1);
              }
            });
          });
          if (this.preOrders.length > 0) {
            this.selectedPreOrder = this.preOrders[0];
            this.selectedDate = this.preOrders[0].createdAt;
            // console.log(this.preOrders[0]);

            await this.onSelectDate(this.selectedPreOrder);
          }
          this.combineDataWithOrders();
        }
        this.isLoading = false;

      } else {
        this.router.navigate(['/login']);
      }
    });
  }
  async getTypes(): Promise<void> {
    const snapshot = await this.apiService.getData(collectionNames.types);
    this.types = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name'],
      name_en: doc.data()['name_en'],

    }));

    if (environment.enabledDaily && environment.production == false) {
      this.types = [{ id: '5', name: "الجرد اليومي", name_en: 'Daily' }, ...this.types];
      // this.types.push({ id: '5', name: "الجرد اليومي", name_en: 'Daily' })

    }

    // this.types.push({ id:'5', name: "الجرد اليومي", name_en: 'Daily' })
    this.selectedType = this.types[0]

    console.log(this.selectedType);


    // if (this.types.length > 0) {
    //   this.selectedType = this.types[0];
    // }
  }
  async getPreOrders() {

    const city = this.branch.data.city;
    const typeId = this.selectedType.id;
    this.orderUpdates = await this.orderService.getLastupdate(city, typeId, this.apiService)

    this.preOrders = await this.orderService.getOrders(city, typeId, this.branch.id, this.orderUpdates, this.apiService)

    if (this.preOrders.length > 0) {
      this.selectedPreOrder = this.preOrders[0].createdAt
    }
    console.log("preOrders:", this.preOrders);

    // const constraints = [
    //   where("branchId", "==", this.branch.id),
    //   where("typeId", "==", this.selectedType.id),
    //   orderBy("createdAt", "desc")
    // ];
    // const snapshot = await this.apiService.getData(collectionNames.orders, constraints)
    // this.preOrders = snapshot.docs.map(doc => ({
    //   id: doc.id,
    //   name: doc.data()['name'],
    //   status: doc.data()['status'],
    //   createdAt: doc.data()['createdAt']
    // }));
    // const date = new Date()
    // const currentDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    // this.ifCurrentDateInPreOrders1 = this.preOrders.some((o: any) => {
    //   const orderDate = o.createdAt.toDate();
    //   const orderDateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
    //   return orderDateStr === currentDateStr;
    // });
  }
  async getProducts() {
    const city = this.branch.data.city;
    const typeId = this.selectedType.id;


    // const productsInfo = this.productService.getProductsFromLocal(city, typeId);

    const productUpdates = await this.productsServices.getLastupdate(city, typeId, this.apiService);

    this.data = await this.productsServices.getProducts(city, typeId, productUpdates, this.apiService)

    // const productsInfo = this.productsServices.getProductsFromLocal(city, typeId);

    // const shouldFetchFromServer = !productsInfo ||
    //   await this.productsServices.compareDate(city, typeId, productsInfo.fetchedAt, this.apiService);

    // console.log('shouldFetchFromServer', shouldFetchFromServer);

    // if (shouldFetchFromServer) {
    //   const constraints = [
    //     where("city", "==", city),
    //     where("typeId", "==", typeId),
    //     orderBy("createdAt", "asc")
    //   ];

    //   const snapshot = await this.apiService.getData(collectionNames.products, constraints);

    //   this.data = snapshot.docs.map(doc => {
    //     return {
    //       id: doc.id,
    //       name: doc.data()['name'],
    //       unit: doc.data()['unit'],
    //       unitF: doc.data()['unitF'],
    //     };
    //   });

    //   console.log("products get from server");

    //   // Save new products to local
    //   this.productsServices.updateProductInLocal(this.data, city, typeId);
    // } else {
    //   console.log("products get from Local");

    //   this.data = productsInfo.products;
    // }
  }

  async getDatesToAdd(): Promise<void> {
    const constraints = [
      where("typeId", "==", this.selectedType.id)
    ];

    // أضف شرط city فقط إذا كان النوع محدد
    if (this.selectedType.id === "6A64dQOXrkAOGIZYm2G1" || this.selectedType.id === "bt9w9ZB1H1IizPBugiUl") {
      constraints.push(where("city", "==", this.branch.data.city));
    }


    const snapshot = await this.apiService.getData(collectionNames.openDates, constraints)
    this.datesToAdd = snapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data()['createdAt']
    }));
  }
  async getRelatedBranche(name: string) {
    const n = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const constraints = [
      where("name", "==", n),
      limit(1)
    ];

    const snapshot = await this.apiService.getData(collectionNames.branches, constraints)
    if (snapshot.empty) {
      this.router.navigate(['/login']);
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, data: doc.data() };
  }
  async getSettings(): Promise<void> {
    try {


      // Reference to the specific document
      const docRef = doc(this.apiService.db, "settings", this.selectedType.id);
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
  async getBranchOrders(startTimestamp: Timestamp, endTimestamp: Timestamp) {
    const constraints = [
      where("branchId", "==", this.branch.id),
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp),
      orderBy("createdAt", "asc")
    ];
    const snapshot = await this.apiService.getData(collectionNames.branchesOrders, constraints)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      productId: doc.data()['productId'],
      qnt: doc.data()['qnt'],
      qntF: doc.data()['qntF'],
      qntNotRequirement: doc.data()['qntNotRequirement'],
      status: doc.data()['status'],
      isCashEnabled: doc.data()['isCashEnabled'],
      cashValue: doc.data()['cashValue'],
      createdAt: doc.data()['createdAt']
    }));
  }
  /// On Events
  onQntFChange(item: any) {
    if (this.checkIfHasEmptyOrder() == true || this.isToAddMode === true) {
      this.addToOrdersToAdd(item);
    }
    else {
      console.log("itemm", item);

      this.addToOrdersToUpdate(item)
    }
  }
  onQntChange(i: any, item: any) {
    if (this.isPositiveNumber(this.combinedData[i].qnt) && this.combinedData[i].qnt > 9) {
      const confirmed = confirm(`    انت صاحي متأكد الكمية ${this.combinedData[i].qnt}صحيحة ؟`);
      if (!confirmed) {
        this.combinedData[i].qnt = ''
        return
      };
    }
    if (this.checkIfHasEmptyOrder() == true || this.isToAddMode === true) {
      this.addToOrdersToAdd(item);
    }
    else {
      this.addToOrdersToUpdate(item)
    }
  }
  async onSelectDate(order: any) {
    this.selectedPreOrder = order
    console.log('selected', this.selectedPreOrder);

    const selectedTimestamp = this.selectedPreOrder.createdAt
    this.isLoading = true;
    try {
      // Convert selected Timestamp to start and end of day
      const selectedDate = selectedTimestamp.toDate();

      // Start of day (00:00:00.000 UTC)
      const startOfDay = new Date(selectedDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(startOfDay);

      // End of day (23:59:59.999 UTC)
      const endOfDay = new Date(selectedDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      // Get orders for the selected date
      this.branchOrders = await this.getBranchOrders(startTimestamp, endTimestamp);

      // Update combined data with orders from selected date

      console.log("rtrtr", selectedDate);
      console.log("rtrtr2", startOfDay);
      console.log("rtrtr3", endOfDay);

      this.combineDataWithOrders();
      this.isPreSent = this.preOrders.some((o: any) => o.id != -1);
      this.selectedDate = selectedTimestamp
      this.isToAddMode = false
      this.ordersToUpdate = []

      // this.combinedData = this.combinedData.slice(0, 1);

    } catch (error) {
      console.error('Error selecting date:', error);
    } finally {
      this.isLoading = false;
    }
  }
  onStatusChange(order: any) {
    if (order.status == '3') {
      return
    }
    const { qntNotRequirement, ...orderWithoutQntNotRequirement } = order;
    this.addToOrdersToUpdate(orderWithoutQntNotRequirement)
  }
  onUnitChange(order: any) {
    this.addToOrdersToAdd(order)
  }
  onUnitFChange(order: any) {
    this.addToOrdersToAdd(order)
  }
  async onSelectTypeChange() {
    this.isLoading = true
    this.preOrders = []
    this.combinedData = []
    this.selectedDate = null

    if (this.selectedType.id != '5') {
      console.log("selllleee", this.selectedType);




      await Promise.all([
        this.getDatesToAdd(),
        this.getProducts(),
        this.getPreOrders(),
        this.getSettings(),
      ]);

      if (this.selectedPreOrder) {
        // this.selectedPreOrder = order
        console.log('selected', this.selectedPreOrder);

        const selectedTimestamp = this.selectedPreOrder.createdAt
        this.isLoading = true;
        try {
          await Promise.all([

            this.getDatesToAdd(),
            this.getProducts(),
            this.getPreOrders(),
            this.getSettings(),
          ]);

          this.preOrders.forEach((pre: any) => {
            this.datesToAdd.forEach((date: any, index: number) => {
              if (date.createdAt.toDate().toISOString().split('T')[0] == pre.createdAt.toDate().toISOString().split('T')[0]) {
                this.datesToAdd.splice(index, 1);
              }
            });
          });
          if (this.preOrders.length > 0) {
            this.selectedPreOrder = this.preOrders[0];
            this.selectedDate = this.preOrders[0].createdAt;
            console.log(this.preOrders[0]);

            await this.onSelectDate(this.selectedPreOrder);
          }
          this.combineDataWithOrders();
          this.isLoading = false;

          // // Convert selected Timestamp to start and end of day
          // const selectedDate = selectedTimestamp.toDate();

          // // Start of day (00:00:00.000 UTC)
          // const startOfDay = new Date(selectedDate);
          // startOfDay.setUTCHours(0, 0, 0, 0);
          // const startTimestamp = Timestamp.fromDate(startOfDay);

          // // End of day (23:59:59.999 UTC)
          // const endOfDay = new Date(selectedDate);
          // endOfDay.setUTCHours(23, 59, 59, 999);
          // const endTimestamp = Timestamp.fromDate(endOfDay);

          // // Get orders for the selected date
          // this.branchOrders = await this.getBranchOrders(startTimestamp, endTimestamp);

          // // Update combined data with orders from selected date

          // console.log("rtrtr", selectedDate);
          // console.log("rtrtr2", startOfDay);
          // console.log("rtrtr3", endOfDay);

          // this.combineDataWithOrders();
          // this.isPreSent = this.preOrders.some((o: any) => o.id != -1);
          // // this.selectedDate = selectedTimestamp
          // this.isToAddMode = false
          // this.ordersToUpdate = []

          // // this.combinedData = this.combinedData.slice(0, 1);

        } catch (error) {
          console.error('Error selecting date:', error);
        } finally {
          this.isLoading = false;
        }
      }

    } else {
      this.data = null
      await this.getProducts()
      await this.initDaily()

    }
    this.isLoading = false;


  }
  onInputQ($event: Event, _t50: number, item: any) {
    const newValue = ($event.target as HTMLInputElement).valueAsNumber;
    // throw new Error('Method not implemented.');
    console.log(newValue, _t50);
    console.log(this.combinedData[_t50]);
    console.log(this.selectedDate);

    this.addToOrdersToUpdate(item)
    // this.combinedData[_t50].qntNotRequirement = newValue
  }
  onSelectDateToAdd(arg0: any) {
    throw new Error('Method not implemented.');
  }
  ///Helpers
  isValidQuantity(value: any): boolean {
    return value !== null &&
      value !== undefined &&
      !isNaN(parseFloat(value)) &&
      isFinite(value) &&
      parseFloat(value) >= 0;
  }
  validateQuantity(item: any, field: string): void {
    if (!this.isValidQuantity(item[field])) {
      item[field] = null; // Reset to invalid state
    }
  }
  isFullFilled(): boolean {
    if (this.ordersToUpdate.length > 0 || this.ordersToAdd.length == 0) {
      return false
    }
    // Check if combinedData exists and is an array
    if (this.selectedType && this.selectedType.id == 'WbAP06wLDRvZFTYUtkjU') {
      const a = this.combinedData.every((d: any) => {
        return this.isPositiveNumber(d.qntF);
      });
      return a
    }
    // console.log(this.ordersToAdd);
    // console.log(this.combinedData);
    if (this.checkIfHasEmptyOrder() === false && this.isToAddMode == false) {
      return false;
    }


    if (!this.ordersToAdd || !Array.isArray(this.combinedData)) {
      return false;
    }

    // Use every() instead of forEach for proper early termination
    const a = this.combinedData.every((d: any) => {
      return this.isPositiveNumber(d.qnt) && this.isPositiveNumber(d.qntF);
    });
    // console.log(a);
    return a
  }
  isNumber(value: any): boolean {
    // Check for both number type and numeric string values
    return !isNaN(parseFloat(value)) && isFinite(value);
  }
  isPositiveNumber(value: any): boolean {
    if (!this.isNumber(value)) return false;
    const num = parseFloat(value);
    return num >= 0;
  }
  isItemInAdd(item: any): boolean {
    return this.ordersToAdd.some((order: any) => order.productId === item.productId);
  }
  getStatusColor(status: any): string {
    switch (status) {
      case '1': return '#9fff9f';   // تم استلامها
      case '2': return 'red';     // لم يتم استلامها
      case '3': return 'orange';  // كمية غير مطابقة
      // case '4': return 'blue';   // غير مطلوبة
      default: return 'white';  // Default color
    }
  }
  getOrder2(branchId: any, productId: any): any {
    console.log("ordersss", this.branchOrders);

    return this.branchOrders.find((order: any) =>
      order.productId === productId
    );
  }
  combineDataWithOrders() {
    console.log(this.branchOrders);

    this.combinedData = this.data.map((product: any) => {
      const order = this.branchOrders.find((o: any) => o.productId === product.id);
      if (order) {
        this.isPreSent = true;
      }
      console.log("order", order);
      const qnt = order?.qnt ?? '';
      const status = qnt == '0' ? '4' : (order?.status ?? '0');
      return {
        id: order?.id ?? -1,
        name: product.name,
        productId: product.id,
        qnt: qnt,
        qntF: order?.qntF ?? '',
        qntNotRequirement: order?.qntNotRequirement ?? false,
        unit: product?.unit ?? '',
        unitF: product?.unitF ?? '',
        status: status,
        isCashEnabled: order?.isCashEnabled ?? false,
        cashValue: order?.cashValue ?? 0,
      };

    });
  }
  firestoreTimestampToMilliseconds(firestoreTimestamp: any): number {
    const seconds = firestoreTimestamp.seconds || 0;
    const nanoseconds = firestoreTimestamp.nanoseconds || 0;
    return (seconds * 1000) + (nanoseconds / 1000000); // Convert to milliseconds
  }

  checkIfHasEmptyOrder() {
    return this.combinedData.some(e => e.id === -1)
  }


  isUpdateEnabled(): boolean {
    // All items must have status !== "0"
    if (!this.selectedPreOrder.hasOwnProperty('updatedFromUser')) {
      // الكود هنا سيعمل فقط إذا كان الحقل موجوداً فعلياً
      // console.log("NO EDITed");

      return true
    }

    if (this.isSelectedTypeAllowed() && this.ordersToUpdate.length > 0) {
      return true
    }

    if (!this.combinedData.every(e => e.status !== "0")) return false;

    if (this.selectedType.id == 'Ikt6pyFoTwvwn7GBIPvv') {
      const status3Items = this.combinedData.filter(e => e.status === "1");
      return status3Items.every(e =>
        typeof e.qntNotRequirement === 'number' &&
        e.qntNotRequirement > 0
      );
    }
    else {
      // For items with status "3", validate qntNotRequirement
      const status3Items = this.combinedData.filter(e => e.status === "3");
      return status3Items.every(e =>
        typeof e.qntNotRequirement === 'number' &&
        e.qntNotRequirement > 0
      );
    }

  }

  /**
   *  to check previous orders is all have complete change status
   */
  isChangeStatus() {
    const r = this.preOrders.some((e: any) => e.status !== '1')
    return r
  }
  /// Add local
  addToOrdersToAdd(order: any) {
    const existingProductIndex = this.ordersToAdd.findIndex((p: any) => p.productId === order.productId);
    if (existingProductIndex !== -1) {
      this.ordersToAdd[existingProductIndex] = order;
    } else {
      this.ordersToAdd.push(order);
    }
  }
  addToOrdersToUpdate(order: any) {
    console.log("pppppppp", order);

    const existingProductIndex = this.ordersToUpdate.findIndex((p: any) => p.id === order.id);
    if (existingProductIndex !== -1) {
      this.ordersToUpdate[existingProductIndex] = order;
    } else {
      this.ordersToUpdate.push(order);
    }
    console.log("Dddd", this.ordersToUpdate);

  }
  addNewOrder(date: any) {
    if (this.isChangeStatus() === true && this.selectedType.id != this.reportMonthlyTypeId) {
      alert("يجب تسجيل حالة الاستلام للطلبية السابقة"); // "Receipt status must be recorded for previous students"
      return;
    }
    // Check if there is any date in openDates greater than the provided date
    const hasLaterDate = this.datesToAdd?.some(
      (d: any) => d.createdAt.toDate() < date.toDate()
    );
    if (hasLaterDate) {
      alert("يرجى الاضافة اولا لقبل هذا التاريخ"); // "Cannot add a new order before completing previous orders"
      return;
    }
    console.log(date);

    console.log(hasLaterDate);

    this.selectedDate = date
    this.combinedData = this.data.map((product: any) => {
      const s = {
        id: -1,
        name: product.name,
        productId: product.id,
        qnt: '',
        qntF: '',
        unit: product.unit,
        unitF: product.unitF
      };
      return s
    });


    this.isToAddMode = true
    this.isPreSent = false
  }
  /// Other
  logout(): void {
    const auth = getAuth();
    signOut(auth).then(() => {
      this.orderService.remove()
      localStorage.removeItem("exported");
      this.router.navigate(['/login']);
      window.location.reload();
    }).catch(console.error);
  }

  /////////Start Daily reports

  openingStock: any = []
  async getOpeningStock(): Promise<void> {
    const q = query(
      collection(this.apiService.db, collectionNames.openingStock),
      where("branchId", '==', this.branch.id),
      where("typeId", "==", this.selectedType.id),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);

    this.openingStock = snapshot.docs.map(doc => ({
      id: doc.id,
      productId: doc.data()['productId'],
      branchId: doc.data()['branchId'],
      openingStockQnt: doc.data()['openingStockQnt'],
    }));


    console.log('openStock', this.openingStock);

  }

  dailyReports: any = []
  async getDailyReports(startOfDate: Date, endOfDate: Date): Promise<void> {
    // Get the first and last day of the current month

    console.log("ddaaa", this.dailyReportUpdates);
    this.dailyReportUpdates = await this.dailyReportService.getLastupdate(this.branch.id, Timestamp.fromDate(this.normalizeDate(this.dateToAddInDaily!!)), this.apiService)
    this.dailyReports = await this.dailyReportService.getData(this.selectedType.id, this.branch.id, startOfDate, endOfDate, this.dailyReportUpdates, this.apiService)
    // const q = query(
    //   collection(this.apiService.db, collectionNames.dailyReports),
    //   where("branchId", "==", this.branch.id),
    //   where("typeId", "==", this.selectedType.id),
    //   where("date", ">=", Timestamp.fromDate(startOfDate)),
    //   where("date", "<=", Timestamp.fromDate(endOfDate)),
    // );

    // const snapshot = await getDocs(q);
    // this.dailyReports = snapshot.docs.map(doc => ({
    //   id: doc.id,
    //   productId: doc.data()['productId'],
    //   branchId: doc.data()['branchId'],
    //   openingStockId: doc.data()['openingStockId'],
    //   openingStockQnt: doc.data()['openingStockQnt'],
    //   recieved: doc.data()['recieved'],
    //   add: doc.data()['add'],
    //   sales: doc.data()['sales'],
    //   staffMeal: doc.data()['staffMeal'],
    //   transfer: doc.data()['transfer'],
    //   dameged: doc.data()['dameged'],
    //   closeStock: doc.data()['closeStock'],
    // }));

    console.log('dailyReports', this.dailyReports);

  }

  normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }


  dailyReportsDates: any = []
  dailyReportsDates1: any = []
  filteredLocalReports: any
  async getDailyReportsDates(): Promise<void> {


    // Get the first and last day of the current month
    const now = new Date();
    // const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    // const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day of month

    const q = query(
      collection(this.apiService.db, collectionNames.dailyReportsDates),
      where("branchId", "==", this.branch.id),
      where("typeId", "==", this.selectedType.id),
      // where("date", ">=", Timestamp.fromDate(startOfMonth)),
      // where("date", "<=", Timestamp.fromDate(endOfMonth)),
    );

    const snapshot = await getDocs(q);
    this.dailyReportsDates = snapshot.docs.map(doc => ({
      id: doc.id,
      typeId: doc.data()['typeId'],
      branchId: doc.data()['branchId'],
      date: doc.data()['date'],
      note: doc.data()['note'],

    })).sort((a, b) => b.date.seconds - a.date.seconds);
    this.dailyReportsDates1 = this.dailyReportsDates

    // const tempRef = doc(this.apiService.db, 'temp', 'serverTime');
    // const serverTimestamp = Timestamp.now();
    // await setDoc(tempRef, { serverTime: serverTimestamp });
    // const tempSnap = await getDoc(tempRef);
    // const serverDate = tempSnap.data()?.['serverTime']?.toDate?.();


    // console.log("this.dailyReportsDates1", this.dailyReportsDates1);



    // console.log(this.dailyReportsDates);

    const serverDatesKeys = this.dailyReportsDates.map((item: any) =>
      this.dailyReportService.getDateKey(item.date.toDate())
    );

    this.filteredLocalReports = this.dailyReportService.getLocalData().filter((localReport: any) =>
      serverDatesKeys.includes(localReport.date)
    );

    this.dailyReportService.saveToLocal(this.filteredLocalReports)

    // ثم خزّن هذه البيانات المفلترة كبياناتك المحلية الجديدة
    // this.dailyReportService.saveLocalData(filteredLocalReports);

    console.log("dddaaates", this.filteredLocalReports);




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

    if (this.dailyReportsDates.length > 0) {
      const normalizedDates = this.dailyReportsDates.map((item: any) =>
        this.normalizeDate(item.date.toDate())
      );
      // Get the oldest date from the list
      const oldestDate = new Date(Math.min(...normalizedDates.map((d: Date) => d.getTime())));

      // Normalize current date
      const currentDate = this.normalizeDate(new Date());

      // Set starting point for search
      let tempDate = new Date(oldestDate);
      let oldestMissingDate: Date | null = null;

      // Check each date from oldest to today
      while (tempDate < currentDate) {
        const exists = normalizedDates.some(
          (d: Date) => d.getTime() === tempDate.getTime()
        );

        if (!exists) {
          oldestMissingDate = new Date(tempDate); // Found the missing date
          break;
        }

        // Move to next day
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Step 2: Check if today is missing
      const todayExists = normalizedDates.some(
        (d: Date) => d.getTime() === currentDate.getTime()
      );

      // Step 3: Final result
      if (oldestMissingDate) {
        this.dateToAddInDaily = oldestMissingDate;
        console.log('Oldest missing date:', oldestMissingDate);
      } else if (!todayExists) {
        this.dateToAddInDaily = currentDate;
        console.log('Today is missing. Setting today as dateToAddInDaily.');
      } else {
        this.dateToAddInDaily = undefined;
        console.log('No missing dates — including today.');
      }



    } else {
      // console.log("mmmm",now.getMonth());
      // console.log("mmmm",now);


      this.dateToAddInDaily = new Date(now.getFullYear(), now.getMonth(), 1);  // Set the current time if no report exists
      console.log('No report for today.');

      // const itemToDelete = this.getItemsInPreviousMonthFromServer(this.dailyReportsDates1, serverDate)
      // console.log("filterd: : ", itemToDelete);
    }



    // this.selectedDateToAddObject = this.dailyReportsDates1.find((report: any) => {
    //   const reportDate = report.date.toDate(); // تحويل من Firestore Timestamp إلى JavaScript Date
    //   reportDate.setHours(0, 0, 0, 0); // تجاهل الوقت
    //   return reportDate.getTime() === this.dateToAddInDaily!.getTime();
    // });

    // console.log("selectedDateToAddObject",this.selectedDateToAddObject);


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


    this.dailyReportsDates = this.dailyReportsDates.map((data: any) => data.date.toDate())


    const tempRef = doc(this.apiService.db, 'temp', 'serverTime');
    const serverTimestamp = Timestamp.now();
    await setDoc(tempRef, { serverTime: serverTimestamp });
    const tempSnap = await getDoc(tempRef);
    const serverDate = tempSnap.data()?.['serverTime']?.toDate?.();
    const itemToDelete = this.getItemsInPreviousMonthFromServer(this.dailyReportsDates1, serverDate)
    console.log("filterd: : ", itemToDelete);

    // const a = localStorage.getItem("dailyReport")

    const startOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59);

    const filtered = this.filteredLocalReports.filter((item: any) => {
      const itemDate = new Date(item.date); // لأن date عبارة عن string
      return !(itemDate >= startOfPrevMonth && itemDate <= endOfPrevMonth);
    });

    console.log("fresh data", filtered);




    // await this.getDailyReports();




  }

  async initDaily() {

    await this.getDailyReportsDates();
    await this.getOpeningStock();
    await this.deleteOldDailyReportsDatesIfSixthOfMonth();
    this.combineDataWithReports()
    this.groupDatesByMonth();
    console.log('groupedDailyDates', this.groupedDailyDates);

  }


  dateToAddInDaily: Date | undefined


  ifThereisEmptyValue(): boolean {
    return this.combinedData.some(item =>
      item.openingStockQnt === null ||
      item.openingStockQnt === undefined ||
      item.openingStockQnt === ''
    );
  }

  combineDataWithReports() {
    // 1. توليد البيانات الأساسية فقط (بدون حساب closeStock)
    this.combinedData = this.data.map((product: any) => {
      const report = this.dailyReports.find((o: any) => o.productId === product.id && o.branchId === this.branch.id);
      const openingStock = this.openingStock.find((o: any) => o.productId === product.id && o.branchId === this.branch.id);

      var s: any = {
        dailyReportId: report?.id,
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        parentProduct: product.parentProduct,
        openingStockId: this.isReadDailyMode ? (report?.openingStockId ?? 1) : (openingStock?.id ?? -1),
        openingStockQnt: this.isReadDailyMode ? (report?.openingStockQnt ?? '') : (openingStock?.openingStockQnt ?? ''),
        recieved: report?.recieved ?? '',
        add: report?.add ?? '',
        staffMeal: report?.staffMeal ?? '',
        transfer: report?.transfer ?? '',
        dameged: report?.dameged ?? '',
        sales: report?.sales ?? ''
      };
      if (report && report.note) {
        s.note = report.note
      }

      return s
    });



    // 2. دمج المنتجات الفرعية مع الرئيسية

    let productsHaveSubProducts: any[] = [];
    let idsToDelete: any[] = [];

    this.combinedData.forEach((item: any, index1: number) => {
      if (item.parentProduct) {
        const parentProduct1 = this.combinedData.find((element: any) => element.productId == item.parentProduct);

        if (parentProduct1) {
          const index = productsHaveSubProducts.findIndex((d: any) => d.productId == item.parentProduct);

          // استبعاد بعض الحقول من المنتج الفرعي
          const {
            openingStockId, openingStockQnt, recieved, transfer, closeStock, productName1, productUnit,
            ...filteredItem
          } = item;

          // استبعاد الحقول من المنتج الرئيسي
          const {
            add, dameged, parentProduct, sales, staffMeal, ...filteredParent
          } = parentProduct1;

          if (index != -1) {
            productsHaveSubProducts[index].products.push(filteredItem);
          } else {
            filteredParent.products = [filteredItem];
            productsHaveSubProducts.push(filteredParent);
          }

          idsToDelete.push(item.productId);
        }
      }
    });



    // إزالة العناصر الفرعية من القائمة الأصلية
    this.combinedData = this.combinedData
      .filter((item: any) => !idsToDelete.includes(item.productId))
      .concat(productsHaveSubProducts); // إضافة المجموعات الجديدة

    const groupedByProductId = new Map();

    this.combinedData.forEach(item => {
      const existing = groupedByProductId.get(item.productId);

      // إذا كان المنتج الحالي يحتوي على منتجات فرعية أو لم تتم إضافته بعد
      if (!existing || (item.products?.length && (!existing.products || existing.products.length === 0))) {
        groupedByProductId.set(item.productId, item);
      }
    });

    // إعادة تعيين combinedData فقط إلى المنتجات المرغوبة
    this.combinedData = Array.from(groupedByProductId.values());


    // 4. الآن نحسب closeStock بعد الدمج
    this.combinedData = this.combinedData.map((item: any) => {
      const closeStock = this.calculateClosingStock(item, undefined, item.productUnit);
      return {
        ...item,
        closeStock
      };
    });

    console.log('combinedData', this.combinedData);
  }


  // combineDataWithReports() {

  //   this.combinedData = this.data.map((product: any) => {
  //     const report = this.dailyReports.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);
  //     const openingStock = this.openingStock.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);

  //     console.log(report);


  //     console.log(product);

  //     // const qnt = report?.qnt ?? '';
  //     // const status = qnt == '0' ? '4' : (report?.status ?? '0');

  //     var s: any = {
  //       dailyReportId: report ? report.id : undefined,
  //       productId: product.id,
  //       productName: product.name,
  //       productUnit: product.unit,
  //       parentProduct: product.parentProduct,
  //     };

  // if (report && report.note) {
  //   s.note = report.note
  // }

  // return s
  //   });

  // let productsHaveSubProducts: any[] = [];
  // let idsToDelete: any[] = [];

  // this.combinedData.forEach((item: any, index1: number) => {
  //   if (item.parentProduct) {
  //     const parentProduct1 = this.combinedData.find((element: any) => element.productId == item.parentProduct);

  //     if (parentProduct1) {
  //       const index = productsHaveSubProducts.findIndex((d: any) => d.productId == item.parentProduct);

  //       // استبعاد بعض الحقول من المنتج الفرعي
  //       const {
  //         openingStockId, openingStockQnt, recieved, transfer, closeStock, productName1, productUnit,
  //         ...filteredItem
  //       } = item;

  //       // استبعاد الحقول من المنتج الرئيسي
  //       const {
  //         add, dameged, parentProduct, sales, staffMeal, ...filteredParent
  //       } = parentProduct1;

  //       if (index != -1) {
  //         productsHaveSubProducts[index].products.push(filteredItem);
  //       } else {
  //         filteredParent.products = [filteredItem];
  //         productsHaveSubProducts.push(filteredParent);
  //       }

  //       idsToDelete.push(item.productId);
  //     }
  //   }
  // });



  // // إزالة العناصر الفرعية من القائمة الأصلية
  // this.combinedData = this.combinedData
  //   .filter((item: any) => !idsToDelete.includes(item.productId))
  //   .concat(productsHaveSubProducts); // إضافة المجموعات الجديدة

  // const groupedByProductId = new Map();

  // this.combinedData.forEach(item => {
  //   const existing = groupedByProductId.get(item.productId);

  //   // إذا كان المنتج الحالي يحتوي على منتجات فرعية أو لم تتم إضافته بعد
  //   if (!existing || (item.products?.length && (!existing.products || existing.products.length === 0))) {
  //     groupedByProductId.set(item.productId, item);
  //   }
  // });

  // // إعادة تعيين combinedData فقط إلى المنتجات المرغوبة
  // this.combinedData = Array.from(groupedByProductId.values());


  //    this.combinedData = this.data.map((product: any) => {
  //     const report = this.dailyReports.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);
  //     const openingStock = this.openingStock.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);

  //     console.log(report);


  //     console.log(product);

  //     // const qnt = report?.qnt ?? '';
  //     // const status = qnt == '0' ? '4' : (report?.status ?? '0');
  //     const closing1 = this.calculateClosingStock(report, openingStock, product.productUnit);
  //     var s: any = {
  //       dailyReportId: report ? report.id : undefined,
  //       productId: product.id,
  //       productName: product.name,
  //       productUnit: product.unit,
  //       parentProduct: product.parentProduct,
  //       openingStockId: this.isReadDailyMode
  //         ? (report?.openingStockId ?? 1)
  //         : (openingStock?.id ?? -1),
  //       openingStockQnt: this.isReadDailyMode ? (report?.openingStockQnt ?? '') : openingStock?.openingStockQnt ?? '',
  //       recieved: report?.recieved ?? '',
  //       add: report?.add ?? '',
  //       staffMeal: report?.staffMeal ?? '',
  //       transfer: report?.transfer ?? '',
  //       dameged: report?.dameged ?? '',
  //       sales: report?.sales ?? '',

  //       closeStock: this.isReadDailyMode ? (report?.closeStock ?? '') : closing1
  //       // dameged:  report.dameged,

  //     };

  //     if (report && report.note) {
  //       s.note = report.note
  //     }

  //     return s
  //   });


  //   console.log('combinedData', this.combinedData);
  //   console.log('productsHaveSubProducts', productsHaveSubProducts);
  // }

  calculateClosingStock(
    reportOrData: any,
    openingStock?: any,
    unit: number = 1 // default to 1 if not passed
  ): number | string {
    let openingStockQnt: number;
    let recieved: number;
    let add: number;
    let sales: number;
    let staffMeal: number;
    let transfer: number;
    let dameged: number;

    if (openingStock) {
      // Two-argument version
      openingStockQnt = Number(openingStock?.openingStockQnt ?? 0);
      recieved = Number(reportOrData?.recieved ?? 0);
      add = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.add || 0), 0)
        : Number(reportOrData?.add ?? 0);
      sales = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.sales || 0), 0)
        : Number(reportOrData?.sales ?? 0);
      staffMeal = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.staffMeal || 0), 0)
        : Number(reportOrData?.staffMeal ?? 0);
      transfer = Number(reportOrData?.transfer ?? 0);
      dameged = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.dameged || 0), 0)
        : Number(reportOrData?.dameged ?? 0);
    } else {
      // One-object version
      openingStockQnt = Number(reportOrData?.openingStockQnt ?? 0);
      recieved = Number(reportOrData?.recieved ?? 0);
      add = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.add || 0), 0)
        : Number(reportOrData?.add ?? 0);
      sales = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.sales || 0), 0)
        : Number(reportOrData?.sales ?? 0);
      staffMeal = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.staffMeal || 0), 0)
        : Number(reportOrData?.staffMeal ?? 0);
      transfer = Number(reportOrData?.transfer ?? 0);
      dameged = reportOrData?.products
        ? reportOrData.products.reduce((total: number, p: any) => total + Number(p.dameged || 0), 0)
        : Number(reportOrData?.dameged ?? 0);
    }

    const total =
      openingStockQnt +
      (recieved * unit) +
      add -
      sales -
      staffMeal -
      transfer -
      dameged;

    return isNaN(total) ? '-' : total
  }



  isModalOpen = false;

  openModal(field: string, item: any, i: number, subProduct: any = null, isRecieved = false) {
    const productUnit = item.productUnit ?? 1;
    if (this.isModalOpen == false) {
      const modalRef = isRecieved ? this.modalService.open(ReasonDialogComponent2) : this.modalService.open(ReasonDialogComponent);

      modalRef.result.then((result) => {
        if (result === null || result.length == 0) {
          if (field == 'transfer') {
            this.combinedData[i][field] = ""
            this.combinedData[i].note = undefined
          } else {
            if (subProduct) {
              this.combinedData[i].products[subProduct.i].note = undefined
              this.combinedData[i].products[subProduct.i][field] = ""

            } else {
              this.combinedData[i][field] = ""
              this.combinedData[i].note = undefined
            }
          }


          // this.combinedData[i][field] = ""
          // تم الإلغاء من قبل المستخدم
          // console.log("cenceled", this.combinedData[this.handleDilogReson.i]);
          const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
          this.combinedData[i].closeStock = updatedCloseStock;
          this.isModalOpen = false

          return;
        }

        if (field == 'transfer') {
          this.combinedData[i].note = result
        } else {
          if (subProduct) {
            this.combinedData[i].products[subProduct.i].note = result
            // this.combinedData[i].products[subProduct.i][field] = ""

          } else {
            // this.combinedData[i][field] = ""
            this.combinedData[i].note = result
          }

        }

        // const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
        // this.combinedData[i].closeStock = updatedCloseStock;
        console.log('تم:', result);
        this.isModalOpen = false

      }).catch(() => {

        if (field == 'transfer') {
          this.combinedData[i][field] = ""
          this.combinedData[i].note = undefined
        } else {
          if (subProduct) {
            this.combinedData[i].products[subProduct.i].note = undefined
            this.combinedData[i].products[subProduct.i][field] = ""

          } else {
            this.combinedData[i][field] = ""
            this.combinedData[i].note = undefined
          }
        }

        const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
        this.combinedData[i].closeStock = updatedCloseStock;
        console.log('تم الإلغاء');
        this.isModalOpen = false

      });
      this.isModalOpen = true
    }
  }

  onQuantityChange(field: string, item: any, i: number, subProduct: any = null): void {

    if (this.isModalOpen == true) {
      return
    }
    const productUnit = item.productUnit ?? 1;

    // if (field === 'recieved') {
    //   this.combinedData[i].recieved = item.recieved;
    // } else {
    //   // Store other fields as-is or default to '-'
    //   this.combinedData[i][field] = item[field] ?? '';
    // }

    console.log(this.combinedData[i]);
    console.log(subProduct);


    this.combinedData[i][field] = item[field] ?? '';

    if (subProduct) {
      if ((Number(this.combinedData[i].products[subProduct.i][field] ?? 0) < 0) && this.isAdmin === false) {
        if (field !== 'transfer') {
          if (subProduct) {
            this.combinedData[i].products[subProduct.i][field] = ""
          }
          else {

            this.combinedData[i][field] = ""
          }
          // console.log("negative");

          // console.log(this.combinedData[i]);
          // this.combinedData[i].closeStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
          // return;
          // return
        }

      }

    } else {
      if ((Number(this.combinedData[i][field] ?? 0) < 0) && this.isAdmin === false) {
        if (field !== 'transfer') {
          if (subProduct) {
            this.combinedData[i].products[subProduct.i][field] = ""
          }
          else {

            this.combinedData[i][field] = ""
          }
          // console.log("negative");

          // console.log(this.combinedData[i]);
          // this.combinedData[i].closeStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
          return;
        }

      }
    }



    // if (this.ifHaveNegativeValue()) {
    //   if (subProduct) {
    //     this.combinedData[i].products[subProduct.i][field] = ""
    //   }
    //   else {

    //     this.combinedData[i][field] = ""
    //   }
    //   console.log("negative");

    //   console.log(this.combinedData[i]);

    //   return
    // }



    // Recalculate closeStock using productUnit
    const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
    this.combinedData[i].closeStock = updatedCloseStock;
    if (this.combinedData[i].closeStock < 0) {
      const modalRef = this.modalService.open(AlertDialogComponent, {
        text: "يتم عمل جرد ميداني للصنف للتأكد من الكمية"
      });
      this.isModalOpen = true
      modalRef.result.then((result) => {
        if (subProduct) {
          this.combinedData[i].products[subProduct.i][field] = ""
        }
        else {

          this.combinedData[i][field] = ""
        }
        // this.combinedData[i][field] = ""
        const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
        this.combinedData[i].closeStock = updatedCloseStock;
        this.isModalOpen = false

      })

      return
    }


    console.log("eeee", field);
    console.log('eeee', Number(item[field] ?? 0));
    console.log('eeee', item);
    // this.openModal(field, item, i, subProduct)


    if (field === 'add' || field === 'transfer' || field === 'dameged' || field === 'recieved') {
      // console.log("this.handleDilogReson", this.handleDilogReson);
      console.log("eeee1", field);
      console.log('eeee1', Number(item[field] ?? 0));
      console.log('eeee1', item);

      if (this.ifEnabledNoteFiled()) {
        // this.handleDilogReson = { field, item, i, subProduct }

        if (field === 'add') {
          if (subProduct) {
            if (Number(item.products[subProduct.i][field] ?? 0) !== 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct)
            }
          } else {
            if (Number(item[field] ?? 0) !== 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct)


            }
          }
        }

        if (field === 'transfer') {
          console.log('frfrfr', Number(item[field] ?? 0));
          console.log('frfrfr', item);


          if (Number(item[field] ?? 0) !== 0) {
            // this.showReasonDialog = true
            this.openModal(field, item, i, subProduct)

          }
          // if (subProduct) {
          //   if (Number(subProduct[field] ?? 0) !== 0) {
          //     // this.showReasonDialog = true
          //     this.openModal(field, item, i, subProduct)


          //   }
          // } else {
          //   if (Number(item[field] ?? 0) !== 0) {
          //     // this.showReasonDialog = true
          //     this.openModal(field, item, i, subProduct)

          //   }
          // }
        }

        if (field === 'dameged') {
          if (subProduct) {
            if (Number(item.products[subProduct.i][field] ?? 0) > 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct)


            }
          } else {
            if (Number(item[field] ?? 0) > 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct)


            }
          }
        }

        if (field === 'recieved') {
          console.log("RRRWEEE");

          if (subProduct) {
            const a = Number(item.products[subProduct.i][field] ?? 0)
            console.log("aaa", a);

            if (a !== 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct, true)


            }
          } else {
            const a = Number(item[field] ?? 0)
            console.log("aaa2", a);

            if (Number(item[field] ?? 0) !== 0) {
              // this.showReasonDialog = true
              this.openModal(field, item, i, subProduct, true)


            }
          }
        }






        // this.showReasonDialog = true



        // setTimeout(() => {
        //   const input = window.prompt(' السبب:');

        // if (input === null || input.length == 0) {
        //   // this.combinedData[i][field] = ""
        //   // تم الإلغاء من قبل المستخدم
        //   console.log("cenceled", this.combinedData[i]);

        //   return;
        // }

        // if (subProduct) {
        //   this.combinedData[i].products[subProduct.i].note = input
        // } else {
        //   this.combinedData[i].note = input
        // }
        // }, 0); // تأخير بسيط حتى لا يتعارض مع دورة حياة Angular



        // if (field === 'add' || field === 'damaged') {

        // }

        // const a = this.dialyNote.findIndex((data: any) => data.item.dailyReportId == item.dailyReportId)
        // if (a == -1) {

        //   item.note = input
        //   this.dialyNote.push({
        //     item: item,
        //     field: field
        //   })
        // } else {
        //   this.dialyNote[a] = {
        //     item: item,
        //     field: field
        //   }
        // }

      }
      else {
        if (subProduct) {
          this.combinedData[i].products[subProduct.i].note = undefined
        } else {
          this.combinedData[i].note = undefined
        }
        this.handleDilogReson = null
      }
    }


    console.log("proccesed", this.combinedData[i]);
    var meatId = "m1srRxKTFohPt84R9LIA";
    var boxId = "DPQc6kiIuafANKf5G4Ra";
    var cupId = "UTnRc0oWxnF8ndBPrcCW";
    if (this.branch.data.city !== 'ryad') {
      meatId = "WMIfaxRKFwUZwI3o3CHk";
      boxId = "jmGKKo2k53rhgFzWbEkv"
      cupId = "H4g2FAvT5J32lBJFIGf4"
    }



    // فقط إذا تم تعديل المبيعات للحم أو البوكس
    if (field === 'sales' && (this.combinedData[i].productId === meatId || this.combinedData[i].productId === boxId)) {
      const meatIndex = this.combinedData.findIndex(p => p.productId === meatId);
      const boxIndex = this.combinedData.findIndex(p => p.productId === boxId);
      const cupIndex = this.combinedData.findIndex(p => p.productId === cupId);

      if (meatIndex !== -1 && boxIndex !== -1 && cupIndex !== -1) {
        const meatSales = Number(this.combinedData[meatIndex].sales) || 0;
        const boxSales = Number(this.combinedData[boxIndex].sales) || 0;

        // 2 * مبيعات اللحم + 4 * مبيعات البوكس
        const calculatedStaffMeal = (meatSales * 2) + (boxSales * 4);

        // حفظ القيمة في الكاسات
        this.combinedData[cupIndex].staffMeal = calculatedStaffMeal;

        // تحديث المخزون الختامي للكاسات
        const cupUnit = this.combinedData[cupIndex].productUnit ?? 1;
        this.combinedData[cupIndex].closeStock = this.calculateClosingStock(
          this.combinedData[cupIndex],
          undefined,
          cupUnit
        );
      }
    }


    // const meatId = "m1srRxKTFohPt84R9LIA"
    // const boxId = "DPQc6kiIuafANKf5G4Ra"
    // // إذا كان المنتج هو اللحم وتم تعديل المبيعات
    // if (field === 'sales' && (this.combinedData[i].productId === meatId || this.combinedData[i].productId === boxId)) {
    //   const meatSalesRaw = this.combinedData[i].sales;

    //   const cupIndex = this.combinedData.findIndex(p => p.productId === "UTnRc0oWxnF8ndBPrcCW");
    //   const boxIndex = this.combinedData.findIndex(p => p.productId === boxId);
    //   const meatIndex = this.combinedData.findIndex(p => p.productId === meatId);



    //   if (cupIndex !== -1) {
    //     const cupSales = Number(this.combinedData[cupIndex].staffMeal) || 0
    //     if (meatSalesRaw === null || meatSalesRaw === undefined || meatSalesRaw === '') {
    //       // إذا كانت المبيعات فارغة، اجعل staffMeal فارغة
    //       if (boxIndex !== -1 && meatIndex !== -1) {
    //         const meatSales = Number(this.combinedData[meatIndex].staffMeal) || 0
    //         const boxSales = Number(this.combinedData[boxIndex].staffMeal) || 0
    //         this.combinedData[cupIndex].staffMeal = meatSales + boxSales;
    //       }

    //     } else {
    //       const value = this.combinedData[i].productId === meatId ? 2 : 4
    //       // const calculated = this.combinedData[i].productId ===  meatId ? Number(meatSalesRaw) || 0 : 
    //       // const meatSales = Number(meatSalesRaw) || 0;

    //       if (boxIndex !== -1 && meatIndex !== -1) {
    //         const meatSales = Number(this.combinedData[meatIndex].staffMeal) || 0
    //         const boxSales = Number(this.combinedData[boxIndex].staffMeal) || 0
    //         this.combinedData[cupIndex].staffMeal = (meatSales + boxSales) * value;
    //       }

    //       // this.combinedData[cupIndex].staffMeal = (this.combinedData[i].sales * value) + cupSales;
    //     }

    //     // تحديث المخزون الختامي لمنتج الكاسات
    //     const cupProductUnit = this.combinedData[cupIndex].productUnit ?? 1;
    //     this.combinedData[cupIndex].closeStock = this.calculateClosingStock(this.combinedData[cupIndex], undefined, cupProductUnit);
    //   }
    // }

    // if (field === 'sales' && this.combinedData[i].productId === "WMIfaxRKFwUZwI3o3CHk") {
    //   const meatSalesRaw = this.combinedData[i].sales;
    //   const cupIndex = this.combinedData.findIndex(p => p.productId === "H4g2FAvT5J32lBJFIGf4");

    //   if (cupIndex !== -1) {
    //     if (meatSalesRaw === null || meatSalesRaw === undefined || meatSalesRaw === '') {
    //       // إذا كانت المبيعات فارغة، اجعل staffMeal فارغة
    //       this.combinedData[cupIndex].staffMeal = '';
    //     } else {
    //       const meatSales = Number(meatSalesRaw) || 0;
    //       this.combinedData[cupIndex].staffMeal = meatSales * 2;
    //     }

    //     // تحديث المخزون الختامي لمنتج الكاسات
    //     const cupProductUnit = this.combinedData[cupIndex].productUnit ?? 1;
    //     this.combinedData[cupIndex].closeStock = this.calculateClosingStock(this.combinedData[cupIndex], undefined, cupProductUnit);
    //   }
    // }

    if (this.isDisabledDailyField() === false && this.isReadDailyMode == true) {
      const index = this.orderDailyToUpdate.findIndex((data: any) => item.productId == data.productId)
      if (index == -1) {
        this.orderDailyToUpdate.push(item)
      }
      else {
        this.orderDailyToUpdate[index] = item
      }
      /////


      console.log(this.combinedData);
      console.log("item before update", item);
      console.log("item after update", this.combinedData.find((data: any) => item.productId == data.productId));
      console.log("this.orderDailyToUpdate", this.orderDailyToUpdate);

    }
  }
  orderDailyToUpdate: any = []



  async saveDaily() {

    const confirmed = confirm(`هل انت متأكد من تسجيل جميع الاستلامات`);
    if (!confirmed) {
      return
    };
    const confirmed1 = confirm(`هل انت متأكد من جميع الادخالات لايمكن التعديل بعد الحفظ`);
    if (!confirmed1) {
      return
    };

    this.isLoading = true

    let newCombinedData: any[] = [];

    this.combinedData.forEach(group => {
      if (group.products && group.products.length > 0) {
        newCombinedData.push(...group.products); // أضف المنتجات الفرعية
        delete group.products; // احذف الحقل من المنتج الرئيسي
      }
      newCombinedData.push(group); // أضف المنتج الرئيسي بعد الحذف
    });

    // حذف الحقول التي قيمتها undefined أو null من كل عنصر
    newCombinedData = newCombinedData.map(item => {
      Object.keys(item).forEach(key => {
        if (item[key] === undefined || item[key] === null) {
          delete item[key];
        }
      });
      return item;
    });
    // this.combinedData = newCombinedData;
    console.log("nnnnn", newCombinedData);



    try {
      let openStockToAdd: any = []
      let openStockToUpdate: any = []

      newCombinedData.forEach((item: any) => {
        if (item.openingStockId == -1) {
          openStockToAdd.push({ branchId: this.branch.id, productId: item.productId, openingStockQnt: item.closeStock, typeId: this.selectedType.id, createdAt: Timestamp.now() })
        } else {
          openStockToUpdate.push(item)
        }
      })

      const batch = writeBatch(this.apiService.db);


      openStockToUpdate.forEach((item: any) => {
        if (item.openingStockId) {
          const docRef2 = doc(this.apiService.db, collectionNames.openingStock, item.openingStockId);
          batch.update(docRef2, {
            updatedAt: Timestamp.now(),
            openingStockQnt: item.closeStock
          });
        }

      })


      // if (openStockToAdd.length == 0) {
      const firestoreTimestamp = this.dateToAddInDaily
        ? Timestamp.fromDate(this.dateToAddInDaily)
        : undefined;
      const summaryRef = doc(collection(this.apiService.db, collectionNames.dailyReportsDates));
      batch.set(summaryRef, {
        branchId: this.branch.id,
        typeId: this.selectedType.id,
        // note: this.dialyNote,
        date: firestoreTimestamp,
        createdAt: Timestamp.now(),
      });

      // let dailyReportToSaveLocally: any = []
      newCombinedData.forEach((item: any) => {
        const summaryRef = doc(collection(this.apiService.db, collectionNames.dailyReports));

        const { productName, ...itemWithoutProductName } = item;

        // Add createdAt directly to the item
        const itemWithTimestamp = {
          ...itemWithoutProductName,
          branchId: this.branch.id,
          typeId: this.selectedType.id,
          date: firestoreTimestamp,
          createdAt: Timestamp.now(),
        };
        // dailyReportToSaveLocally.push(itemWithTimestamp)

        batch.set(summaryRef, itemWithTimestamp);
      });

      ///
      this.dailyReportUpdates = await this.dailyReportService.getLastupdate(this.branch.id, Timestamp.fromDate(this.normalizeDate(this.dateToAddInDaily!!)), this.apiService)
      // ✅ Corrected document path for updating 
      const docRef2 = doc(this.apiService.db, collectionNames.dailyReportsUpdates, this.dailyReportUpdates.id);

      batch.update(docRef2, {
        updatedAt: Timestamp.now(),
      });

      // } else {
      openStockToAdd.forEach((item: any) => {
        const summaryRef = doc(collection(this.apiService.db, collectionNames.openingStock));
        batch.set(summaryRef, item);
      })
      // }



      await batch.commit();
      // this.dailyReportService.addDataToLocal(dailyReportToSaveLocally, this.dailyReportService.getDateKey(this.dateToAddInDaily!), this.selectedType.id, this.branch.id)
      console.log("done");
      alert("يعطيك العافية تم التحديث بنجاح")
      window.location.reload();
    } catch (error) {
      console.log(error);

    } finally {
      this.isLoading = false
    }

  }

  selectedDateToAddObject: any

  async onDailyDateChange($event: any) {
    // this.dialyNote = []
    this.isReadDailyMode = true
    this.dailyReports = []
    this.combinedData = []
    console.log($event);
    // console.log($event.date.toDate());

    this.dateToAddInDaily = $event

    console.log('this.dailyReportsDates1', this.dailyReportsDates1);

    this.selectedDateToAddObject = this.dailyReportsDates1.find((report: any) => {
      const reportDate = report.date.toDate(); // تحويل من Firestore Timestamp إلى JavaScript Date
      reportDate.setHours(0, 0, 0, 0); // تجاهل الوقت
      return reportDate.getTime() === this.dateToAddInDaily!.getTime();
    });
    // if (this.selectedDateToAddObject) {

    //   if (this.selectedDateToAddObject.note) {
    //     this.dialyNote = this.selectedDateToAddObject.note
    //   }
    // }

    console.log("📅 Selected Date:", $event);
    console.log("✅ Matched Report:", this.selectedDateToAddObject);

    // const now = $event
    // const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    // const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day of month

    this.isLoading = true
    await this.getDailyReports($event, $event);

    this.combineDataWithReports()
    this.orderDailyToUpdate = []

    this.combinedData.forEach((data: any) => {

      if (data.note) {
        this.dialyNote.push(data)
      }
    })

    console.log("dialyNotess", this.dialyNote);

    this.isLoading = false


  }


  async deleteMultipleCollections(): Promise<void> {
    this.isLoading = true
    const collections = ['openingStock', 'dailyReports', 'dailyReportsDates', collectionNames.dailyReportsUpdates];

    try {
      for (const colName of collections) {
        const snapshot = await getDocs(collection(this.apiService.db, colName));
        const deletePromises = snapshot.docs.map(document => {
          return deleteDoc(doc(this.apiService.db, colName, document.id));
        });
        await Promise.all(deletePromises);
        console.log(`✅ تم حذف جميع البيانات من مجموعة: ${colName}`);
      }
    } catch (error) {
      console.error('❌ حدث خطأ أثناء الحذف:', error);
    }
    finally {
      this.isLoading = false

    }
  }


  async resetAllDailyReportForThisBranch(): Promise<void> {
    this.isLoading = true;
    const collections = [
      'openingStock',
      'dailyReports',
      'dailyReportsDates',
      collectionNames.dailyReportsUpdates
    ];

    try {
      for (const colName of collections) {
        const colRef = collection(this.apiService.db, colName);
        const q = query(colRef, where("branchId", "==", this.branch.id)); // فلترة حسب branchId
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(document => {
          return deleteDoc(doc(this.apiService.db, colName, document.id));
        });

        await Promise.all(deletePromises);
        console.log(`✅ تم حذف جميع البيانات الخاصة بالفرع (${this.branch.id}) من مجموعة: ${colName}`);
      }
    } catch (error) {
      console.error("❌ حدث خطأ أثناء الحذف:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async resetAllDailyReportForThisBranchAndSelectedDate(): Promise<void> {
    this.isLoading = true;
    const collections = [
      // 'openingStock',
      'dailyReports',
      'dailyReportsDates',
      collectionNames.dailyReportsUpdates
    ];

    try {
      // const colRef1 = collection(this.apiService.db, 'dailyReports');
      // const q1 = query(colRef1,
      //   where("branchId", "==", this.branch.id),

      // ); // فلترة حسب branchId
      // const snapshot1 = await getDocs(q1);
      // var reports = snapshot1.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data() as any
      // }));

      // // تجميع حسب date
      // const groupedByDate: { [date: string]: any[] } = {};


      // let productsHaveSubProducts: any[] = [];
      // let idsToDelete: any[] = [];

      // reports.forEach((item: any, index1: number) => {
      //   if (item.parentProduct) {
      //     const parentProduct1 = reports.find((element: any) => element.productId == item.parentProduct);

      //     if (parentProduct1) {
      //       const index = productsHaveSubProducts.findIndex((d: any) => d.productId == item.parentProduct);

      //       // استبعاد بعض الحقول من المنتج الفرعي
      //       const {
      //         openingStockId, openingStockQnt, recieved, transfer, closeStock, productName1, productUnit,
      //         ...filteredItem
      //       } = item;

      //       // استبعاد الحقول من المنتج الرئيسي
      //       const {
      //         add, dameged, parentProduct, sales, staffMeal, ...filteredParent
      //       } = parentProduct1;

      //       if (index != -1) {
      //         productsHaveSubProducts[index].products.push(filteredItem);
      //       } else {
      //         filteredParent.products = [filteredItem];
      //         productsHaveSubProducts.push(filteredParent);
      //       }

      //       idsToDelete.push(item.productId);
      //     }
      //   }
      // });



      // // إزالة العناصر الفرعية من القائمة الأصلية
      // reports = reports
      //   .filter((item: any) => !idsToDelete.includes(item.productId))
      //   .concat(productsHaveSubProducts); // إضافة المجموعات الجديدة

      // const groupedByProductId = new Map();

      // reports.forEach(item => {
      //   const existing = groupedByProductId.get(item.productId);

      //   // إذا كان المنتج الحالي يحتوي على منتجات فرعية أو لم تتم إضافته بعد
      //   if (!existing || (item.products?.length && (!existing.products || existing.products.length === 0))) {
      //     groupedByProductId.set(item.productId, item);
      //   }
      // });

      // // إعادة تعيين combinedData فقط إلى المنتجات المرغوبة
      // reports = Array.from(groupedByProductId.values());

      // for (const report of reports) {
      //   const date = report.date.toDate();
      //   const dateKey = date.getFullYear() + '-' +
      //     String(date.getMonth() + 1).padStart(2, '0') + '-' +
      //     String(date.getDate()).padStart(2, '0'); // YYYY-MM-DD


      //   if (!groupedByDate[dateKey]) {
      //     groupedByDate[dateKey] = [];
      //   }

      //   groupedByDate[dateKey].push(report);
      // }


      // for (const dateKey in groupedByDate) {
      //   const items = groupedByDate[dateKey];
      //   console.log("تاريخ:", dateKey);
      //   console.log("العناصر:", items);

      //   for (const item of items) {

      //   }
      // }


      // console.log('groupedByDate', groupedByDate);

      for (const colName of collections) {
        const colRef = collection(this.apiService.db, colName);
        const q = query(colRef,
          where("branchId", "==", this.branch.id),
          where("date", ">=", Timestamp.fromDate(this.dateToAddInDaily!)),
          where("date", "<=", Timestamp.fromDate(this.dateToAddInDaily!)),

        ); // فلترة حسب branchId
        const snapshot = await getDocs(q);




        console.log("sssssnnnn", snapshot.docs);

        const deletePromises = snapshot.docs.map(document => {
          //  console.log("ddddaaa",document)
          return deleteDoc(doc(this.apiService.db, colName, document.id));
        });

        await Promise.all(deletePromises);
        console.log(`✅ تم حذف جميع البيانات الخاصة بالفرع (${this.branch.id}) من مجموعة: ${colName}`);
      }
    } catch (error) {
      console.error("❌ حدث خطأ أثناء الحذف:", error);
    } finally {
      this.isLoading = false;
    }
  }

  getItemsInPreviousMonthFromServer(items: any[], serverDate: Date): any[] {
    const startOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth() - 1, 1, 0, 0, 0);
    const endOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59);

    return items
      .filter(item => {
        const itemDate = item.date?.toDate?.();
        return itemDate instanceof Date &&
          itemDate >= startOfPrevMonth &&
          itemDate <= endOfPrevMonth;
      })
      .map(item => {
        const dateObj = item.date.toDate();
        const readableDate = this.formatDateOnly(dateObj); // مثل: "2025-06-14"
        return { ...item, readableDate };
      });
  }
  formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  async deleteOldDailyReportsDatesIfSixthOfMonth() {
    try {
      // 1. الحصول على وقت السيرفر
      const tempRef = doc(this.apiService.db, 'temp', 'serverTime');
      const tempSnap = await getDoc(tempRef);
      const serverDate = tempSnap.data()?.['serverTime']?.toDate?.();
      console.log("serverTime", serverDate);

      if (!(serverDate instanceof Date)) {
        console.error('فشل في الحصول على وقت السيرفر');
        return;
      }

      // 2. التحقق من اليوم
      if (serverDate.getDate() < 6) {
        console.log('اليوم ليس السادس، لا حاجة للحذف.');
        const start = new Date(serverDate.getFullYear() - 5, 1, 1, 0, 0, 0);
        const end = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59);
        console.log("start", start);
        console.log("end", end);
        return;
      }

      // 3. تحديد المستندات القديمة من dailyReportsDates
      const itemToDelete = this.getItemsInPreviousMonthFromServer(this.dailyReportsDates1, serverDate);
      const deleteRefs: DocumentReference[] = [];
      if (itemToDelete.length == 0) {
        return
      }

      itemToDelete.forEach((item: any) => {
        if (item?.id) {
          deleteRefs.push(doc(this.apiService.db, 'dailyReportsDates', item.id));
        }
      });

      // 4. حذف dailyReports القديمة
      const start = new Date(serverDate.getFullYear() - 5, 1, 1, 0, 0, 0);
      const end = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59);

      const q = query(
        collection(this.apiService.db, collectionNames.dailyReports),
        where("branchId", "==", this.branch.id),
        where("typeId", "==", this.selectedType.id),
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(docSnap => deleteRefs.push(docSnap.ref));

      // 5. حذف dailyReportsUpdates القديمة
      const q1 = query(
        collection(this.apiService.db, collectionNames.dailyReportsUpdates),
        where("branchId", "==", this.branch.id),
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
      );

      const snapshot1 = await getDocs(q1);
      snapshot1.docs.forEach(docSnap => deleteRefs.push(docSnap.ref));

      console.log(`📦 عدد المستندات المراد حذفها: ${deleteRefs.length}`);

      // 6. حذف على دفعات من 300
      const chunkSize = 300;
      for (let i = 0; i < deleteRefs.length; i += chunkSize) {
        const chunk = deleteRefs.slice(i, i + chunkSize);
        const batch = writeBatch(this.apiService.db);
        chunk.forEach(ref => batch.delete(ref));

        try {
          await batch.commit();
          console.log(`✅ تم حذف دفعة ${i / chunkSize + 1} (${chunk.length} مستند)`);
        } catch (error) {
          console.error(`❌ خطأ في دفعة ${i / chunkSize + 1}:`, error);
        }
      }

      const startOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59);

      const filtered = this.filteredLocalReports.filter((item: any) => {
        const itemDate = new Date(item.date); // لأن date عبارة عن string
        return !(itemDate >= startOfPrevMonth && itemDate <= endOfPrevMonth);
      });
      this.dailyReportService.saveToLocal(filtered)


      console.log('✅ تم حذف جميع المستندات القديمة بنجاح.');
      window.location.reload();

    } catch (error) {
      console.error('❌ حدث خطأ أثناء حذف التواريخ القديمة:', error);
    }
  }



  // async deleteOldDailyReportsDatesIfSixthOfMonth() {
  //   try {
  //     // 1. الحصول على وقت السيرفر
  //     const tempRef = doc(this.apiService.db, 'temp', 'serverTime');
  //     const serverTimestamp = Timestamp.now();
  //     // await setDoc(tempRef, { serverTime: serverTimestamp });

  //     const tempSnap = await getDoc(tempRef);
  //     const serverDate = tempSnap.data()?.['serverTime']?.toDate?.();
  //     console.log("serverTime", serverDate);

  //     if (!(serverDate instanceof Date)) {
  //       console.error('فشل في الحصول على وقت السيرفر');
  //       return;
  //     }

  //     // 2. تحقق من أن اليوم هو السادس
  //     console.log(serverDate.getDate());

  //     if (serverDate.getDate() < 6) {
  //       console.log('اليوم ليس السادس، لا حاجة للحذف.');
  //       let start = new Date(serverDate.getFullYear() - 5, 1, 1, 0, 0, 0);
  //       let end = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59); // last day of month

  //       console.log("start", start);
  //       console.log("end", end);


  //       return;
  //     }

  //     // 3. حضّر البيانات للحذف
  //     const batch = writeBatch(this.apiService.db);
  //     let deletedCount = 0;

  //     const itemToDelete = this.getItemsInPreviousMonthFromServer(this.dailyReportsDates1, serverDate)
  //     console.log("filterd: : ", itemToDelete);

  //     itemToDelete.forEach((item: any) => {
  //       console.log("DATE", item);
  //       const reportDate = item.date.toDate()

  //       console.log("DATE", reportDate);

  //       const isPreviousMonth = reportDate instanceof Date &&
  //         (reportDate.getFullYear() <= serverDate.getFullYear() &&
  //           (
  //             reportDate.getMonth() < serverDate.getMonth()));

  //       if (isPreviousMonth && item.id) {
  //         const docRef = doc(this.apiService.db, 'dailyReportsDates', item.id);
  //         batch.delete(docRef);
  //         deletedCount++;
  //       }
  //     });

  //     // 4. تنفيذ الحذف إذا كان هناك شيء للحذف
  //     if (deletedCount > 0) {

  //       let start = new Date(serverDate.getFullYear() - 5, 1, 1, 0, 0, 0);
  //       let end = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59); // last day of month

  //       const q = query(
  //         collection(this.apiService.db, collectionNames.dailyReports),
  //         where("branchId", "==", this.branch.id),
  //         where("typeId", "==", this.selectedType.id),
  //         where("date", ">=", Timestamp.fromDate(start)),
  //         where("date", "<=", Timestamp.fromDate(end)),
  //       );

  //       const snapshot = await getDocs(q);
  //       const dailyReportsToDelete = snapshot.docs.map(doc =>

  //       ({
  //         id: doc.id,
  //         date: doc.data()['date'].toDate(),
  //       }))
  //       console.log('dailyReportsToDelete', dailyReportsToDelete);

  //       dailyReportsToDelete.forEach((item: any) => {
  //         const docRef = doc(this.apiService.db, collectionNames.dailyReports, item.id);
  //         batch.delete(docRef);
  //       })

  //       let start1 = new Date(serverDate.getFullYear() - 5, 1, 1, 0, 0, 0);
  //       let end1 = new Date(serverDate.getFullYear(), serverDate.getMonth(), 0, 23, 59, 59); // last day of month

  //       const q1 = query(
  //         collection(this.apiService.db, collectionNames.dailyReportsUpdates),
  //         where("branchId", "==", this.branch.id),
  //         where("date", ">=", Timestamp.fromDate(start1)),
  //         where("date", "<=", Timestamp.fromDate(end1)),
  //       );

  //       const snapshot1 = await getDocs(q1);
  //       const dailyReportsUpdateToDelete1 = snapshot1.docs.map(doc => ({
  //         id: doc.id,
  //       }))
  //       console.log('dailyReportsUpdateToDelete1', dailyReportsUpdateToDelete1);

  //       dailyReportsUpdateToDelete1.forEach((item: any) => {
  //         const docRef = doc(this.apiService.db, collectionNames.dailyReportsUpdates, item.id);
  //         batch.delete(docRef);
  //       })

  //       console.log(`تم حذف ${dailyReportsUpdateToDelete1.length} من   التحديثات للجرد اليومي القديمة.`);

  //       await batch.commit();
  //       console.log(`تم حذف ${deletedCount} من التواريخ القديمة.`);
  //       window.location.reload()
  //     } else {
  //       console.log('لا توجد تواريخ قديمة للحذف.');
  //     }

  //   } catch (error) {
  //     console.error('حدث خطأ أثناء حذف التواريخ القديمة:', error);
  //   }
  // }

  exportPdfDaily() {
    const pdfService = new PdfService();

    const formattedDate = `${this.dateToAddInDaily!.getFullYear()}-${String(this.dateToAddInDaily!.getMonth() + 1).padStart(2, '0')}-${String(this.dateToAddInDaily!.getDate()).padStart(2, '0')}`;
    console.log("typeee", this.selectedType);
    pdfService.exportPDF5(this.combinedData, formattedDate, this.branch.data.name, this.dialyNote)
    // pdfService.exportPDF5(this.combinedData)


    // pdfService.exportDaily()
  }

  groupedDailyDates: Record<string, { dates: string[]; fullyFilled: boolean, hasBeenExported: boolean, hasBeenExportedNotes: boolean }> = {};

  groupDatesByMonth() {
    const grouped: Record<string, { dates: string[]; fullyFilled: boolean; hasBeenExported: boolean, hasBeenExportedNotes: boolean }> = {};

    // قراءة التواريخ المصدّرة مسبقًا من localStorage
    const exportedDates: string[] = JSON.parse(localStorage.getItem('exportedDailyDates') || '[]');
    const exportedDatesNotes: string[] = JSON.parse(localStorage.getItem('exportedDailyDatesNotes') || '[]');

    for (const dateStr of this.dailyReportsDates) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-based month
      const key = `${year}-${month}`;

      if (!grouped[key]) {
        grouped[key] = { dates: [], fullyFilled: false, hasBeenExported: false, hasBeenExportedNotes: false };
      }

      grouped[key].dates.push(dateStr);
    }

    for (const key in grouped) {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const totalDays = new Date(year, month, 0).getDate();
      const daysSet = new Set<number>();

      for (const dateStr of grouped[key].dates) {
        const date = new Date(dateStr);
        daysSet.add(date.getDate());
      }

      grouped[key].fullyFilled = daysSet.size === totalDays;

      // تحقق إذا تم تصدير كل تواريخ هذا الشهر مسبقًا
      const allExported = exportedDates.includes(key);
      grouped[key].hasBeenExported = allExported;

      const allExportedNotes = exportedDatesNotes.includes(key);
      grouped[key].hasBeenExportedNotes = allExportedNotes;
    }

    this.groupedDailyDates = grouped;
  }


  // groupDatesByMonth(): Record<string, { dates: string[]; fullyFilled: boolean }> {
  //   const grouped: Record<string, { dates: string[]; fullyFilled: boolean }> = {};

  //   for (const dateStr of this.dailyReportsDates) {
  //     const date = new Date(dateStr);
  //     const year = date.getFullYear();
  //     const month = date.getMonth() + 1; // 1-based month
  //     const day = date.getDate();
  //     const key = `${year}-${month}`;

  //     if (!grouped[key]) {
  //       grouped[key] = { dates: [], fullyFilled: false };
  //     }

  //     grouped[key].dates.push(dateStr);
  //   }

  //   // بعد التجميع، نحسب إذا كان كل شهر مكتمل
  //   for (const key in grouped) {
  //     const [yearStr, monthStr] = key.split("-");
  //     const year = parseInt(yearStr, 10);
  //     const month = parseInt(monthStr, 10);
  //     const totalDays = new Date(year, month, 0).getDate(); // ✅ عدد أيام الشهر
  //     const daysSet = new Set<number>();

  //     for (const dateStr of grouped[key].dates) {
  //       const date = new Date(dateStr);
  //       daysSet.add(date.getDate());
  //     }

  //     grouped[key].fullyFilled = daysSet.size === totalDays;
  //     if key in local  grouped[key].hasbeenexported =true

  //   }

  //   return grouped;
  // }



  getFullyFilledMonths(): { month: number; year: number }[] {
    const monthMap = new Map<string, Set<number>>();

    for (const dateStr of this.dailyReportsDates) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0 = Jan, 5 = Jun, etc.
      const day = date.getDate();
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, new Set<number>());
      }
      monthMap.get(key)!.add(day);
    }

    const result: { month: number; year: number }[] = [];

    for (const [key, daysSet] of monthMap.entries()) {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      if (daysSet.size === daysInMonth) {
        result.push({ year, month });
      }
    }

    return result;
  }


  async exportallPdfDaily(date: string, dates: any) {

    this.isLoading = true
    const pdfService = new PdfService();
    let finalData: { date: string, data: any, }[] = [];

    for (const element of dates) {
      // this.dateToAddInDaily = element;

      const dailyReportUpdates = await this.dailyReportService.getLastupdate(
        this.branch.id,
        Timestamp.fromDate(this.normalizeDate(element)),
        this.apiService
      );

      const dailyReports = await this.dailyReportService.getData(
        this.selectedType.id,
        this.branch.id,
        element,
        element,
        dailyReportUpdates,
        this.apiService
      );

      const date = this.dailyReportService.getDateKey(element);

      finalData.push({
        data: this.returnCombineDataWithReports(dailyReports),
        date: date
      });
    }

    this.isReadDailyMode = true
    // اطبع النتيجة للتأكد
    console.log("Final Data", finalData);

    // إنشاء PDF واحد للشهر كله
    pdfService.exportMonthlyReport(date, finalData, this.branch.data.name);


    /// Start save localy
    const key = 'exportedDailyDates';

    // 1. جلب القيمة الحالية من localStorage (كـ JSON array)
    const existing = JSON.parse(localStorage.getItem(key) || '[]');

    // 2. التأكد من أنها مصفوفة
    if (!Array.isArray(existing)) {
      console.warn(`${key} is corrupted. Resetting.`);
      localStorage.setItem(key, JSON.stringify([date]));
      return;
    }

    // 3. إضافة التاريخ فقط إذا لم يكن موجودًا
    if (!existing.includes(date)) {
      existing.push(date);
      localStorage.setItem(key, JSON.stringify(existing));
    }
    ///
    this.isLoading = false
    this.groupDatesByMonth()
  }

  async exportallNotesPdfDaily(date: string, dates: any) {

    this.isLoading = true
    const pdfService = new PdfService();
    let finalData: { date: string, data: any, }[] = [];

    for (const element of dates) {
      // this.dateToAddInDaily = element;

      const dailyReportUpdates = await this.dailyReportService.getLastupdate(
        this.branch.id,
        Timestamp.fromDate(this.normalizeDate(element)),
        this.apiService
      );

      const dailyReports = await this.dailyReportService.getData(
        this.selectedType.id,
        this.branch.id,
        element,
        element,
        dailyReportUpdates,
        this.apiService
      );

      const date = this.dailyReportService.getDateKey(element);

      finalData.push({
        data: this.returnCombineDataWithReports(dailyReports),
        date: date
      });
    }

    this.isReadDailyMode = true
    // اطبع النتيجة للتأكد
    console.log("Final Data", finalData);

    // إنشاء PDF واحد للشهر كله
    pdfService.exportMonthlyReportNotes(date, finalData, this.branch.data.name);


    /// Start save localy
    const key = 'exportedDailyDatesNotes';

    // 1. جلب القيمة الحالية من localStorage (كـ JSON array)
    const existing = JSON.parse(localStorage.getItem(key) || '[]');

    // 2. التأكد من أنها مصفوفة
    if (!Array.isArray(existing)) {
      console.warn(`${key} is corrupted. Resetting.`);
      localStorage.setItem(key, JSON.stringify([date]));
      return;
    }

    // 3. إضافة التاريخ فقط إذا لم يكن موجودًا
    if (!existing.includes(date)) {
      existing.push(date);
      localStorage.setItem(key, JSON.stringify(existing));
    }
    ///
    this.isLoading = false
    this.groupDatesByMonth()
  }

  isLastDayOfMonth(): boolean {
    // const testDate = new Date();
    // testDate.setDate(testDate.getDate() + 1); // أضف يوم واحد
    // return testDate.getDate() === 1; // إذا اليوم التالي هو أول يوم في الشهر، إذن اليوم هو آخر يوم
    return true;
  }

  returnCombineDataWithReports(dailyReports: any) {
    // 1. توليد البيانات الأساسية فقط (بدون حساب closeStock)
    let res = this.data.map((product: any) => {
      const report = dailyReports.find((o: any) => o.productId === product.id && o.branchId === this.branch.id);
      // const openingStock = this.openingStock.find((o: any) => o.productId === product.id && o.branchId === this.branch.id);

      var s: any = {
        dailyReportId: report?.id,
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        parentProduct: product.parentProduct,
        openingStockQnt: report?.openingStockQnt ?? '',
        recieved: report?.recieved ?? '',
        add: report?.add ?? '',
        staffMeal: report?.staffMeal ?? '',
        transfer: report?.transfer ?? '',
        dameged: report?.dameged ?? '',
        sales: report?.sales ?? '',
        closeStock: report?.closeStock ?? '',
      };
      if (report && report.note) {
        s.note = report.note
      }

      return s
    });



    // 2. دمج المنتجات الفرعية مع الرئيسية

    let productsHaveSubProducts: any[] = [];
    let idsToDelete: any[] = [];

    res.forEach((item: any, index1: number) => {
      if (item.parentProduct) {
        const parentProduct1 = res.find((element: any) => element.productId == item.parentProduct);

        if (parentProduct1) {
          const index = productsHaveSubProducts.findIndex((d: any) => d.productId == item.parentProduct);

          // استبعاد بعض الحقول من المنتج الفرعي
          const {
            openingStockId, openingStockQnt, recieved, transfer, closeStock, productName1, productUnit,
            ...filteredItem
          } = item;

          // استبعاد الحقول من المنتج الرئيسي
          const {
            add, dameged, parentProduct, sales, staffMeal, ...filteredParent
          } = parentProduct1;

          if (index != -1) {
            productsHaveSubProducts[index].products.push(filteredItem);
          } else {
            filteredParent.products = [filteredItem];
            productsHaveSubProducts.push(filteredParent);
          }

          idsToDelete.push(item.productId);
        }
      }
    });



    // إزالة العناصر الفرعية من القائمة الأصلية
    res = res
      .filter((item: any) => !idsToDelete.includes(item.productId))
      .concat(productsHaveSubProducts); // إضافة المجموعات الجديدة

    const groupedByProductId = new Map();

    res.forEach((item: any) => {
      const existing = groupedByProductId.get(item.productId);

      // إذا كان المنتج الحالي يحتوي على منتجات فرعية أو لم تتم إضافته بعد
      if (!existing || (item.products?.length && (!existing.products || existing.products.length === 0))) {
        groupedByProductId.set(item.productId, item);
      }
    });

    // إعادة تعيين combinedData فقط إلى المنتجات المرغوبة
    res = Array.from(groupedByProductId.values());


    // 4. الآن نحسب closeStock بعد الدمج
    // res = res.map((item: any) => {
    //   const closeStock = this.calculateClosingStock(item, undefined, item.productUnit);
    //   return {
    //     ...item,
    //     closeStock
    //   };
    // });

    console.log('combinedDataRes', res);

    return res
  }


  getOrdersDaily(dailyReports: any): any[][] {
    const data = this.data;
    console.log(data);

    const result: any[][] = [];

    // for (let i = 0; i < data.length; i++) {
    //   const product = data[i];
    //   const daily = dailyReports.find((item: any) =>
    //     item.productId === product.id
    //   );

    //   console.log("product.id", product.id);

    //   console.log("daily", daily);


    //   if (daily) {
    //     result.push([
    //       product.name,
    //       daily.openingStockQnt,
    //       daily.recieved,
    //       daily.add,
    //       daily.sales,
    //       daily.staffMeal,
    //       daily.transfer,
    //       daily.dameged,
    //       daily.closeStock
    //     ]);
    //   }
    // }

    dailyReports.forEach((item: any) => {
      if (item.products) {
        let products: any = []
        item.products.forEach((element: any) => {
          products.push([
            element.productName,
            element.add,
            element.sales,
            element.staffMeal,
            element.dameged,
          ])
        });
        result.push([
          item.productName,
          item.openingStockQnt,
          item.recieved,
          products,
          item.transfer,
          item.closeStock
        ]);
      } else {
        result.push([
          item.productName,
          item.openingStockQnt,
          item.recieved,
          item.add,
          item.sales,
          item.staffMeal,
          item.transfer,
          item.dameged,
          item.closeStock
        ]);
      }

    })
    return result;

  }


  // console.log('data', data);




  //   getOrderDaily2( productId: any): any {
  //   console.log("ordersss", this.branchOrders);

  //   return this.branchOrders.find((order: any) =>
  //     order.productId === productId
  //   );
  // }

  ///////Report Monthly
  reportMonthlyTypeId = "WbAP06wLDRvZFTYUtkjU"


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
      // this.isLoading = false
    }
  }
  isSelectedTypeAllowed(): boolean {
    if (!this.selectedPreOrder.hasOwnProperty('updatedFromUser')) {
      // الكود هنا سيعمل فقط إذا كان الحقل موجوداً فعلياً
      // console.log("NO EDITed");

      return true
    }
    if (this.allowableEdits) {
      return this.allowableEdits.includes(this.selectedType.id);
    }
    else return false

  }

  isDisabledDropDown(): boolean {
    const changeStatus = this.isChangeStatus();
    const isActive = this.isOn;
    const isPreOrderStatusOne = this.selectedPreOrder.status === '1';
    const hasEmptyOrder = this.checkIfHasEmptyOrder();
    const isTypeAllowed = this.isSelectedTypeAllowed();

    // console.log('isChangeStatus():', changeStatus);
    // console.log('isOn:', isActive);
    // console.log('selectedPreOrder.status === "1":', isPreOrderStatusOne);
    // console.log('checkIfHasEmptyOrder():', hasEmptyOrder);
    // console.log('isSelectedTypeAllowed():', isTypeAllowed);
    if (isPreOrderStatusOne === true) {
      if (isActive === false) {
        return true
      }
      return false
    }
    else {
      if (changeStatus === true) {
        if (isTypeAllowed === true) {
          return false
        }
      }
      return true
    }
    ////


    // return (
    //   !changeStatus ||
    //   !isActive ||
    //   isPreOrderStatusOne ||
    //   hasEmptyOrder ||
    //   !isTypeAllowed
    // );
  }


  async saveChangesDaily() {
    if (this.orderDailyToUpdate.length === 0) return;

    // this.orderDailyToUpdate = this.orderDailyToUpdate.map((item: any) => {
    //   // إذا كانت المنتجات الفرعية موجودة
    //   if (item.products && Array.isArray(item.products)) {
    //     item.products = item.products.map((sub: any) => {
    //       if (sub.note === undefined) {
    //         delete sub.note;
    //       }
    //       return sub;
    //     });
    //   }

    //   // للمنتج الرئيسي نفسه
    //   if (item.note === undefined) {
    //     delete item.note;
    //   }

    //   return item;
    // });

    this.isLoading = true;
    const batch1 = writeBatch(this.apiService.db);

    const batch = writeBatch(this.apiService.db);

    try {
      const docRef2 = doc(this.apiService.db, collectionNames.dailyReportsUpdates, this.dailyReportUpdates.id);
      batch.update(docRef2, { updatedAt: Timestamp.now() });
      ////
      for (const element of this.orderDailyToUpdate) {
        // تحديث المنتجات الفرعية
        if (element.products) {
          for (const subProduct of element.products) {
            const { dailyReportId, productName, ...filtedSubProduct } = subProduct;

            const updatedSubProduct = {
              ...filtedSubProduct,
              updatedAt: Timestamp.now(),
            };

            console.log(updatedSubProduct);

            if (dailyReportId) {
              const docRef = doc(this.apiService.db, collectionNames.dailyReports, dailyReportId);
              batch1.update(docRef, updatedSubProduct);
            } else {
              const docRef = doc(collection(this.apiService.db, collectionNames.dailyReports)); // توليد doc ID تلقائي
              batch1.set(docRef, {
                ...updatedSubProduct,
                branchId: this.branch.id,
                typeId: this.selectedType.id,
                date: Timestamp.fromDate(this.dateToAddInDaily!),
                createdAt: Timestamp.now()

              });
            }

            // const docRef = doc(this.apiService.db, collectionNames.dailyReports, dailyReportId);
            // batch1.update(docRef, updatedSubProduct);
            // if (dailyReportId) {

            // }
            // else {
            //   add
            // }

          }
        }

        if (element.parentProduct === undefined) {
          delete element.parentProduct;
        }

        // تحديث المنتج الرئيسي
        const { productUnit, dailyReportId, productName, products, ...filtedParentProduct } = element;

        console.log("element", element);
        console.log("filtedParentProduct", filtedParentProduct);


        const updatedParentProduct = {
          ...filtedParentProduct,
          updatedAt: Timestamp.now(),
        };

        console.log("updatedParentProduct", updatedParentProduct);


        const parentDocRef = doc(this.apiService.db, collectionNames.dailyReports, dailyReportId);

        const parentDocSnap = await getDoc(parentDocRef);

        if (parentDocSnap.exists()) {
          console.log("📄 بيانات المستند:", parentDocSnap.data());
        } else {
          console.log("❌ المستند غير موجود");
        }

        batch1.update(parentDocRef, updatedParentProduct);


        const parentDocSnap1 = await getDoc(parentDocRef);

        if (parentDocSnap.exists()) {
          console.log("📄 2بيانات المستند:", parentDocSnap1.data());
        } else {
          console.log("❌ 2المستند غير موجود");
        }



      }
      await batch1.commit();


      for (const element of this.orderDailyToUpdate) {

        const q1 = query(
          collection(this.apiService.db, collectionNames.dailyReports),
          where("branchId", "==", this.branch.id),
          where("productId", "==", element.productId),
          where("date", ">=", Timestamp.fromDate(this.dateToAddInDaily!))
        );

        const snapshot1 = await getDocs(q1);
        const dailyReportsToUpdate = snapshot1.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data["date"],
            productId: data["productId"],
            openingStockQnt: data["openingStockQnt"],
            recieved: data["recieved"],
            add: data["add"],
            sales: data["sales"],
            staffMeal: data["staffMeal"],
            transfer: data["transfer"],
            dameged: data["dameged"],
            closeStock: data["closeStock"]
          };
        });


        var fcloseStock = 0
        for (const item of dailyReportsToUpdate) {

          const docRef1 = doc(this.apiService.db, collectionNames.dailyReports, item.id);

          const add = element.products
            ? element.products.reduce((total: number, p: any) => total + Number(p.add || 0), 0)
            : Number(item.add || 0);

          const sales = element.products
            ? element.products.reduce((total: number, p: any) => total + Number(p.sales || 0), 0)
            : Number(item.sales || 0);

          const staffMeal = element.products
            ? element.products.reduce((total: number, p: any) => total + Number(p.staffMeal || 0), 0)
            : Number(item.staffMeal || 0);

          const dameged = element.products
            ? element.products.reduce((total: number, p: any) => total + Number(p.dameged || 0), 0)
            : Number(item.dameged || 0);

          const closeStock =
            Number(item.openingStockQnt || 0) +
            Number((item.recieved * element.productUnit) || 0) +
            add -
            sales -
            staffMeal -
            Number(item.transfer || 0) -
            dameged;

          const updateData: any = {
            updatedAt: Timestamp.now(),
            closeStock,
            openingStockQnt: item.openingStockQnt,
          };

          if (!element.parentProduct) {
            updateData.sales = sales;
            updateData.staffMeal = staffMeal;
            updateData.dameged = dameged;
            updateData.add = add;
          }

          console.log("item to update", item);
          console.log("closeStock", closeStock);
          batch.update(docRef1, updateData);
          fcloseStock = closeStock
        }

        if (element.openingStockId && element.openingStockId != -1) {
          const docRef3 = doc(this.apiService.db, collectionNames.openingStock, element.openingStockId);
          batch.update(docRef3, {
            openingStockQnt: fcloseStock,
            updatedAt: Timestamp.now(),
          });
        }
        else {
          await this.getOpeningStock()
          const openStock = this.openingStock.find(
            (o: any) => o.productId === element.productId
          );
          const docRef3 = doc(this.apiService.db, collectionNames.openingStock, openStock.id);
          batch.update(docRef3, {
            openingStockQnt: fcloseStock,
            updatedAt: Timestamp.now(),
          });

        }

      }

      await batch.commit();
      console.log('تم التحديث بنجاح');
      alert("يعطيك العافية تم التحديث بنجاح")

      this.orderDailyToUpdate = []
    } catch (error) {
      console.error('فشل في التحديث:', error);
    } finally {
      this.isLoading = false;
    }
  }



  // async saveChangesDaily() {
  //   if (this.orderDailyToUpdate.length == 0) {
  //     return
  //   }
  //   /////
  //   this.isLoading = true
  //   const batch = writeBatch(this.apiService.db);
  //   try {

  //     const docRef2 = doc(this.apiService.db, collectionNames.dailyReportsUpdates, this.dailyReportUpdates.id);
  //     batch.update(docRef2, {
  //       updatedAt: Timestamp.now(),
  //     });

  //     this.orderDailyToUpdate.forEach(async (element: any) => {
  //       if (element.products) {
  //         element.products.forEach(async (subProduct: any) => {
  //           console.log("subProducts", subProduct);

  //           const { dailyReportId, productName, ...filtedSubProduct } = subProduct

  //           console.log("filtedSubProduct", filtedSubProduct);

  //           const updatedSubProduct = {
  //             ...filtedSubProduct,
  //             updatedAt: Timestamp.now(),
  //           };

  //           const docRef = doc(this.apiService.db, collectionNames.dailyReports, subProduct.dailyReportId);
  //           batch.update(docRef, updatedSubProduct);
  //         });
  //       }

  //       const { productUnit, dailyReportId, productName, products, ...filtedParentProduct } = element

  //       console.log("ParentProduct", element);

  //       console.log("filtedParentProduct", filtedParentProduct);

  //       const updatedParentProduct = {
  //         ...filtedParentProduct,
  //         updatedAt: Timestamp.now(),
  //       };
  //       const docRef = doc(this.apiService.db, collectionNames.dailyReports, element.dailyReportId);
  //       batch.update(docRef, updatedParentProduct);

  //       const q1 = query(
  //         collection(this.apiService.db, collectionNames.dailyReports),
  //         where("branchId", "==", this.branch.id),
  //         where("productId", "==", element.productId),
  //         where("date", ">=", Timestamp.fromDate(this.dateToAddInDaily!)),
  //       );


  //       const snapshot1 = await getDocs(q1);
  //       const dailyReportsToUpdate = snapshot1.docs.map(doc => {
  //         const data = doc.data();

  //         return {
  //           id: doc.id,
  //           date: data["date"],
  //           productId: data["productId"],
  //           openingStockQnt: data["openingStockQnt"],
  //           recieved: data["recieved"],
  //           add: element.products ? data["add"] : undefined,
  //           sales: element.products ? data["sales"] : undefined,
  //           staffMeal: element.products ? data["staffMeal"] : undefined,
  //           transfer: data["transfer"],
  //           dameged: element.products ? data["dameged"] : undefined,
  //           closeStock: data["closeStock"]
  //         };
  //       });

  //       dailyReportsToUpdate.forEach((item: any, index: number) => {
  //         const docRef1 = doc(this.apiService.db, collectionNames.dailyReports, item.id);

  //         const add = item.products
  //           ? item.products.reduce((total: number, p: any) => total + Number(p.add || 0), 0)
  //           : Number(item.add || 0);

  //         const sales = item.products
  //           ? item.products.reduce((total: number, p: any) => total + Number(p.sales || 0), 0)
  //           : Number(item.sales || 0);

  //         const staffMeal = item.products
  //           ? item.products.reduce((total: number, p: any) => total + Number(p.staffMeal || 0), 0)
  //           : Number(item.staffMeal || 0);

  //         const dameged = item.products
  //           ? item.products.reduce((total: number, p: any) => total + Number(p.dameged || 0), 0)
  //           : Number(item.dameged || 0);

  //         const closeStock =
  //           Number(item.openingStockQnt || 0) +
  //           Number(item.recieved || 0) +
  //           add -
  //           sales -
  //           staffMeal -
  //           Number(item.transfer || 0) -
  //           dameged;


  //         console.log("total1", closeStock);

  //         // Build the update object with the fields you always want to update.
  //         const updateData: any = {
  //           updatedAt: Timestamp.now(),
  //           closeStock,
  //           openingStockQnt: item.openingStockQnt,
  //         };

  //         // Conditionally add the 'sales' field if item.parentProduct is falsy.
  //         // That is, if there's no parent product, then include sales.
  //         if (!item.parentProduct) {
  //           updateData.sales = sales;
  //           updateData.staffMeal = staffMeal;
  //           updateData.dameged = dameged;
  //           updateData.add = add;
  //         }

  //         // Use the constructed object in your batch update.
  //         batch.update(docRef1, updateData);

  //       });
  //     })
  //     await batch.commit()
  //     console.log('تم التحديث بنجاح');
  //   } catch (error) {

  //     console.error('فشل في التحديث:', error);

  //   } finally {
  //     this.isLoading = false;
  //   }


  // }


  // async saveDailyNote() {
  //   if (!this.selectedDateToAddObject) {
  //     return
  //   }

  //   try {
  //     this.isLoading = true;
  //     const batch = writeBatch(this.apiService.db);
  //     const docRef = doc(this.apiService.db, collectionNames.dailyReportsDates, this.selectedDateToAddObject.id);
  //     batch.update(docRef, {
  //       note: this.dialyNote,
  //       updatedAt: Timestamp.now()
  //     });

  //     await batch.commit();
  //     this.selectedDateToAddObject.note = this.dialyNote
  //     console.log("Doneee");

  //   } catch (error) {
  //     console.log(error);

  //   }
  //   this.isLoading = false
  // }
  ifEnabledNoteFiled() {

    // console.log("");

    // if (!Array.isArray(this.combinedData)) return false;

    return this.combinedData.some((item: any) => {
      console.log(item);

      if (item.products) {
        return item.products.some((subitem: any) => {
          const isAddNegative = Number(subitem?.add ?? 0) !== 0;
          const isTransferNonZero = Number(item.transfer) !== 0;
          const isRecieved = Number(item.recieved) !== 0;

          const isDamagedPositive = Number(subitem?.dameged ?? 0) > 0;

          return isAddNegative || isTransferNonZero || isDamagedPositive || isRecieved;
        });
      } else {
        const isAddNegative = Number(item.add) !== 0;
        const isTransferNonZero = Number(item.transfer) !== 0;
        const isDamagedPositive = Number(item.dameged) > 0;
        const isRecieved = Number(item.recieved) !== 0;

        console.log('isAddNegative', isAddNegative);
        console.log('isTransferNonZero', isTransferNonZero);
        console.log('isDamagedPositive', isDamagedPositive);
        console.log('isREcievesPositive', isRecieved);



        return isAddNegative || isTransferNonZero || isDamagedPositive || isRecieved;
      }

    });
  }

  ifHaveNegativeValue() {

    return this.combinedData.some((item: any) => {
      if (Array.isArray(item.products) && item.products.length > 0) {
        return item.products.some((subitem: any) => {
          const isAddNegative = Number(item?.recieved ?? 0) < 0;
          const isTransferNegative = Number(subitem?.staffMeal ?? 0) < 0;
          const isDamagedNegative = Number(subitem?.dameged ?? 0) < 0;

          return isAddNegative || isTransferNegative || isDamagedNegative;
        });

      } else {
        const isAddNegative = Number(item?.recieved ?? 0) < 0;
        const isTransferNegative = Number(item?.staffMeal ?? 0) < 0;
        const isDamagedNegative = Number(item?.dameged ?? 0) < 0;

        return isAddNegative || isTransferNegative || isDamagedNegative;
      }
    });

  }
  ifSalesCompleted(): boolean {
    return this.combinedData.every((item: any) => {
      if (item.products && item.products.length > 0) {
        // تحقق من أن كل منتج فرعي لديه قيمة رقمية في حقل sales
        return item.products.every((subitem: any) => {
          return subitem?.sales !== null &&
            subitem?.sales !== undefined &&
            subitem?.sales !== '' &&
            !isNaN(Number(subitem.sales));
        });
      } else {
        // تحقق من المنتج الرئيسي إذا لم يكن لديه منتجات فرعية
        return item?.sales !== null &&
          item?.sales !== undefined &&
          item?.sales !== '' &&
          !isNaN(Number(item.sales));
      }
    });
  }


  handleDilogReson: any = null
  showReasonDialog = false;
  pendingItem: any;


  handleReasonConfirm(reason: string) {
    if (reason === null || reason.length == 0) {
      // this.combinedData[i][field] = ""
      // تم الإلغاء من قبل المستخدم
      console.log("cenceled", this.combinedData[this.handleDilogReson.i]);

      return;
    }

    if (this.handleDilogReson.subProduct) {
      this.combinedData[this.handleDilogReson.i].products[this.handleDilogReson.subProduct.i].note = reason
    } else {
      this.combinedData[this.handleDilogReson.i].note = reason
    }

    this.handleDilogReson = null;

    this.showReasonDialog = false;
  }

  handleReasonCancel() {
    this.combinedData[this.handleDilogReson.i][this.handleDilogReson.field] = ""
    this.combinedData[this.handleDilogReson.i].note = ""

    this.handleDilogReson = null
    this.showReasonDialog = false;
  }


  isDisabledDailyField() {
    // isReadDailyMode === true && isAdmin==false
    if (this.isAdmin == false) {
      if (this.isReadDailyMode == false) {
        return false;
      }

      if (this.allowableEdits.includes('5')) {
        return false;
      }
      return true;
    } else {

      return false;
    }
  }

  onCashToggle(i: number, item: any) {
    // لما يلغي التفعيل نصفر القيمة
    if (!this.combinedData[i].isCashEnabled) {
      this.combinedData[i].cashValue = null;
      this.combinedData[i].isCashEnabled = false;
    }
    this.addToOrdersToUpdate(item)
  }

  onCashInput(i: number, item: any) {
    console.log("item::: " + JSON.stringify(item))
    this.addToOrdersToUpdate(item)
    const value = this.combinedData[i].cashValue;

    // تحقق أساسي
    if (value === null || value === '' || value <= 0) {
      return;
    }

    // تقدر تضيف تحقق إضافي هنا إذا تحتاج
  }

}

