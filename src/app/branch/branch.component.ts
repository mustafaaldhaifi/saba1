import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ApiService } from '../api.service';
import { collectionNames } from '../Shareds';
import { environment } from '../../env';
import { PdfService } from '../pdf.service';
import { ProductsService } from '../products.service';
import { OrdersService } from '../orders.service copy';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch.component.html',
  styleUrls: ['./branch.component.css']
})
export class BranchComponent {


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
            order.qnt,
            product.unit
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

  version: any
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private productsServices: ProductsService,
    private orderService: OrdersService
  ) {
    this.version = environment.version
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
      const s = { status: '1' }
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
          this.router.navigate(['/dashboard']);
        } else {
          const name = user.email?.split('@')[0];
          this.branch = await this.getRelatedBranche(name!);
          await this.getTypes()
          await this.getProducts()


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
        }
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
      createdAt: doc.data()['createdAt']
    }));
  }
  /// On Events
  onQntFChange(item: any) {
    if (this.checkIfHasEmptyOrder() == true || this.isToAddMode === true) {
      this.addToOrdersToAdd(item);
    }
    else {
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
    if (this.selectedType.id != '5') {
      console.log("selllleee", this.selectedType);


      this.preOrders = []
      this.combinedData = []
      this.selectedDate = null

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
    this.combinedData = this.data.map((product: any) => {
      const order = this.branchOrders.find((o: any) => o.productId === product.id);
      if (order) {
        this.isPreSent = true;
      }
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
        status: status
      };
    });
  }
  firestoreTimestampToMilliseconds(firestoreTimestamp: any): number {
    const seconds = firestoreTimestamp.seconds || 0;
    const nanoseconds = firestoreTimestamp.nanoseconds || 0;
    return (seconds * 1000) + (nanoseconds / 1000000); // Convert to milliseconds
  }

  checkIfHasEmptyOrder() {

    return this.combinedData.some(e => e.id === -1);



  }


  isUpdateEnabled(): boolean {
    // All items must have status !== "0"
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
    if (this.isChangeStatus() == true) {
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
  async getDailyReports(): Promise<void> {
    // Get the first and last day of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day of month

    const q = query(
      collection(this.apiService.db, collectionNames.dailyReports),
      where("branchId", "==", this.branch.id),
      where("typeId", "==", this.selectedType.id),
      where("date", ">=", Timestamp.fromDate(startOfMonth)),
      where("date", "<=", Timestamp.fromDate(endOfMonth)),
    );

    const snapshot = await getDocs(q);
    this.dailyReports = snapshot.docs.map(doc => ({
      id: doc.id,
      productId: doc.data()['productId'],
      branchId: doc.data()['branchId'],
      openingStock: doc.data()['openingStock'],
      recieved: doc.data()['recieved'],
      add: doc.data()['add'],
      staffMeal: doc.data()['staffMeal'],
      transfer: doc.data()['transfer'],
      dameged: doc.data()['dameged'],

    }));

    console.log('dailyReports', this.dailyReports);

  }

  normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }


  dailyReportsDates: any = []
  async getDailyReportsDates(): Promise<void> {
    console.log(serverTimestamp());

    // Get the first and last day of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day of month

    const q = query(
      collection(this.apiService.db, collectionNames.dailyReportsDates),
      where("branchId", "==", this.branch.id),
      where("typeId", "==", this.selectedType.id),
      where("date", ">=", Timestamp.fromDate(startOfMonth)),
      where("date", "<=", Timestamp.fromDate(endOfMonth)),
    );

    const snapshot = await getDocs(q);
    this.dailyReportsDates = snapshot.docs.map(doc => ({
      id: doc.id,
      typeId: doc.data()['typeId'],
      branchId: doc.data()['branchId'],
      date: doc.data()['date'],
    }));
    console.log(this.dailyReportsDates);



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
      this.dateToAddInDaily = now;  // Set the current time if no report exists
      console.log('No report for today.');
    }

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
    await this.getOpeningStock();
    this.combineDataWithReports()



  }

  async initDaily() {

    await this.getDailyReportsDates();

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
    this.combinedData = this.data.map((product: any) => {
      const report = this.dailyReports.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);
      const openingStock = this.openingStock.find((o: any) => o.productId === product.id && o.branchId == this.branch.id);


      console.log(product);

      // const qnt = report?.qnt ?? '';
      // const status = qnt == '0' ? '4' : (report?.status ?? '0');
      const closing1 = this.calculateClosingStock(report, openingStock, product.productUnit);
      return {
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        openingStockId: openingStock?.id ?? -1,
        openingStockQnt: openingStock?.openingStockQnt ?? '',
        recieved: report?.recieved ?? '',
        add: report?.add ?? '',
        staffMeal: report?.staffMeal ?? '',
        transfer: report?.transfer ?? '',
        closeStock: closing1
        // dameged:  report.dameged,

      };
    });

    console.log('combinedData', this.combinedData);
  }

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
      add = Number(reportOrData?.add ?? 0);
      sales = Number(reportOrData?.sales ?? 0);
      staffMeal = Number(reportOrData?.staffMeal ?? 0);
      transfer = Number(reportOrData?.transfer ?? 0);
      dameged = Number(reportOrData?.dameged ?? 0);
    } else {
      // One-object version
      openingStockQnt = Number(reportOrData?.openingStockQnt ?? 0);
      recieved = Number(reportOrData?.recieved ?? 0);
      add = Number(reportOrData?.add ?? 0);
      sales = Number(reportOrData?.sales ?? 0);
      staffMeal = Number(reportOrData?.staffMeal ?? 0);
      transfer = Number(reportOrData?.transfer ?? 0);
      dameged = Number(reportOrData?.dameged ?? 0);
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


  onQuantityChange(field: string, item: any, i: number): void {
    const productUnit = item.productUnit ?? 1;

    // if (field === 'recieved') {
    //   this.combinedData[i].recieved = item.recieved;
    // } else {
    //   // Store other fields as-is or default to '-'
    //   this.combinedData[i][field] = item[field] ?? '';
    // }

    this.combinedData[i][field] = item[field] ?? '';


    // Recalculate closeStock using productUnit
    const updatedCloseStock = this.calculateClosingStock(this.combinedData[i], undefined, productUnit);
    this.combinedData[i].closeStock = updatedCloseStock;
    console.log(this.combinedData);

  }

  async saveDaily() {
    const confirmed = confirm(`هل انت متأكد من ادخال البيانات صحيحة`);
    if (!confirmed) {
      return
    };
    const confirmed1 = confirm(`هل انت متأكد من ارسال البيانات وحفظها`);
    if (!confirmed1) {
      return
    };

    this.isLoading = true
    try {
      let openStockToAdd: any = []
      let openStockToUpdate: any = []

      this.combinedData.forEach((item: any) => {
        if (item.openingStockId == -1) {
          openStockToAdd.push({ branchId: this.branch.id, productId: item.productId, openingStockQnt: item.closeStock, typeId: this.selectedType.id, createdAt: Timestamp.now() })
        } else {
          openStockToUpdate.push(item)
        }
      })

      const batch = writeBatch(this.apiService.db);
      openStockToAdd.forEach((item: any) => {
        const summaryRef = doc(collection(this.apiService.db, collectionNames.openingStock));
        batch.set(summaryRef, item);
      })

      openStockToUpdate.forEach((item: any) => {
        const docRef2 = doc(this.apiService.db, collectionNames.openingStock, item.openingStockId);
        batch.update(docRef2, {
          updatedAt: Timestamp.now(),
          openingStockQnt: item.closeStock
        });
      })

      const firestoreTimestamp = this.dateToAddInDaily
        ? Timestamp.fromDate(this.dateToAddInDaily)
        : undefined;
      const summaryRef = doc(collection(this.apiService.db, collectionNames.dailyReportsDates));
      batch.set(summaryRef, {
        branchId: this.branch.id,
        typeId: this.selectedType.id,
        date: firestoreTimestamp,
        createdAt: Timestamp.now(),
      });

      this.combinedData.forEach((item: any) => {
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

        batch.set(summaryRef, itemWithTimestamp);
      });

      await batch.commit();
      console.log("done");
      alert("يعطيك العافية تم التحديث بنجاح")
      window.location.reload();
    } catch (error) {
      console.log(error);

    } finally {
      this.isLoading = false
    }

  }
}

