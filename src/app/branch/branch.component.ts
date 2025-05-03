import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ApiService } from '../api.service';
import { collectionNames } from '../Shareds';
import { environment } from '../../env';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch.component.html',
  styleUrls: ['./branch.component.css']
})
export class BranchComponent {


  ifCurrentDateInPreOrders1 = false
  ordersToAdd: any = [];
  ordersToUpdate: any = [];
  preOrders: any = [];
  isLoading = false;
  branch: any;
  data: any = [];
  orders: any = [];
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

  version: any
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService
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
    const db = getFirestore();

    // Create a batch instance
    const batch = writeBatch(this.apiService.db);

    const orderRef = doc(this.apiService.db, collectionNames.orders, this.selectedPreOrder.id);

    // const productRef = doc(db, "branchesOrders", element.id);
    // Loop over the orders to update

    console.log("rfrf0", this.ordersToUpdate);

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
  async addOrders() {
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

      // 2. Add the summary document
      const summaryRef = doc(collection(this.apiService.db, collectionNames.branchesOrders));
      batch.set(summaryRef, {
        status: 0,
        branchId: this.branch.id,
        city: this.branch.data.city,
        typeId: this.selectedType.id,
        // qntNumber: this.ordersToAdd.length,
        createdAt: this.selectedDate // Server-side timestamp
      });

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
          await this.getTypes(),
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
      name: doc.data()['name']
    }));

    if (this.types.length > 0) {
      this.selectedType = this.types[0];
    }
  }
  async getPreOrders() {
    const constraints = [
      where("branchId", "==", this.branch.id),
      where("typeId", "==", this.selectedType.id),
      orderBy("createdAt", "desc")
    ];
    const snapshot = await this.apiService.getData(collectionNames.orders, constraints)
    this.preOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name'],
      status: doc.data()['status'],
      createdAt: doc.data()['createdAt']
    }));
    const date = new Date()
    const currentDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.ifCurrentDateInPreOrders1 = this.preOrders.some((o: any) => {
      const orderDate = o.createdAt.toDate();
      const orderDateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      return orderDateStr === currentDateStr;
    });
  }
  async getProducts() {
    const constraints = [
      where("city", '==', this.branch.data.city),
      where("typeId", "==", this.selectedType.id),
      orderBy("createdAt", "asc")
    ];
    const snapshot = await this.apiService.getData(collectionNames.products, constraints)
    this.data = snapshot.docs.map(doc => {
      this.orders.push({ qnt: 0, productId: doc.id });
      return {
        id: doc.id,
        name: doc.data()['name'],
        unit: doc.data()['unit'],
        unitF: doc.data()['unitF'],
      };
    });
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
    if (this.isToAddMode == true) {
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
    if (this.isToAddMode == true) {
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
    if (!this.ordersToAdd || !Array.isArray(this.combinedData)) {
      return false;
    }

    // Use every() instead of forEach for proper early termination
    const a = this.combinedData.every((d: any) => {
      return this.isPositiveNumber(d.qnt) && this.isPositiveNumber(d.qntF);
    });
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
  getOrder(productId: string) {
    return this.orders.find((order: any) => order.productId === productId);
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
  isUpdateEnabled(): boolean {
    // All items must have status !== "0"
    if (!this.combinedData.every(e => e.status !== "0")) return false;

    // For items with status "3", validate qntNotRequirement
    const status3Items = this.combinedData.filter(e => e.status === "3");
    return status3Items.every(e =>
      typeof e.qntNotRequirement === 'number' &&
      e.qntNotRequirement > 0
    );
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
    const existingProductIndex = this.ordersToUpdate.findIndex((p: any) => p.id === order.id);
    if (existingProductIndex !== -1) {
      this.ordersToUpdate[existingProductIndex] = order;
    } else {
      this.ordersToUpdate.push(order);
    }
  }
  addNewOrder(date: any) {
    if (this.isChangeStatus() == true) {
      alert("يجب تسجيل حالة الاستلام للطلبية السابقة"); // "Receipt status must be recorded for previous students"
      return;
    }
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
      this.router.navigate(['/login']);
    }).catch(console.error);
  }
}

