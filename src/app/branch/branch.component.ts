import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, getFirestore, limit, orderBy, query, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch.component.html',
  styleUrls: ['./branch.component.css']
})
export class BranchComponent {

  addNewOrder
    () {
    this.selectedDate = this.currentTimestamp
    this.combinedData = this.data.map((product: any) => {
      const order = this.branchOrders.find((o: any) => o.productId === product.id);

      console.log("order", order);
      console.log("product", product);


      const s = {
        // ...product,
        id: -1,
        name: product.name,
        productId: product.id,
        qnt: '',
        qntF: '',
      };

      console.log("new order", s);
      return s
    });


    this.isToAddMode = true
    this.isPreSent = false
  }
  // async saveUpdates() {
  //   console.log("ttttt", this.ordersToUpdate);

  //   this.isLoading = true
  //   const db = getFirestore();

  //   // Loop over the products to update
  //   for (const element of this.ordersToUpdate) {
  //     console.log("frfrfr", element);

  //     const productRef = doc(db, "branchesOrders", element.id);

  //     // Exclude the 'id' field from the update data using destructuring
  //     const { id, ...updatedData } = element; // This removes `id` from the object

  //     try {
  //       // Update the product in Firestore with the fields (without `id`)
  //       await updateDoc(productRef, updatedData);
  //       console.log(`Order with ID: ${element.id} updated successfully.`);
  //       this.isLoading = false
  //     } catch (e) {
  //       this.isLoading = false

  //       console.error("Error updating product: ", e);
  //     }
  //   }

  async saveUpdates() {
    console.log("ttttt", this.ordersToUpdate);

    this.isLoading = true;
    const db = getFirestore();

    // Create a batch instance
    const batch = writeBatch(db);

    // Loop over the orders to update
    for (const element of this.ordersToUpdate) {
      console.log("frfrfr", element);

      const productRef = doc(db, "branchesOrders", element.id);

      // Exclude the 'id' field from the update data using destructuring
      const { id, ...updatedData } = element; // This removes `id` from the object

      try {
        // Add the update operation to the batch
        batch.update(productRef, updatedData);
        console.log(`Order with ID: ${element.id} added to batch for update.`);
      } catch (e) {
        console.error("Error preparing batch update for order:", e);
      }
    }

    try {
      // Commit the batch (all updates happen in one command)
      await batch.commit();
      this.ordersToUpdate = []
      console.log("All orders updated successfully.");
    } catch (e) {
      console.error("Error committing batch update:", e);
    } finally {
      this.isLoading = false;
    }
  }


  firestoreTimestampToMilliseconds(firestoreTimestamp: any): number {
    const seconds = firestoreTimestamp.seconds || 0;
    const nanoseconds = firestoreTimestamp.nanoseconds || 0;
    return (seconds * 1000) + (nanoseconds / 1000000); // Convert to milliseconds
  }

  ifCurrentDateInPreOrders1 = false
  // Check if the current date is within a range from createdAt

  ordersToAdd: any = [];
  ordersToUpdate: any = [];

  preOrders: any = [];
  isLoading = false;
  branch: any;
  data: any = [];
  orders: any = [];
  units: any = [];
  selectedDate: any;
  combinedData: any[] = [];
  branchOrders: any[] = [];

  isToAddMode = false
  isPreSent = false

  currentTimestamp: any  // Get the current Firebase Timestamp

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // initializeApp(environment.firebase);
  }



  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTimestamp = Timestamp.now();
      await this.getBranch();
    }

  }

  onQntChange(item: any) {
    if (item.qnt <= 0) {
      return
    }
    if (this.isToAddMode == true) {
      this.addToOrdersToAdd(item);
    }
    else {
      this.addToOrdersToUpdate(item)
    }
  }
  onQntFChange(item: any) {

    if (item.qntF <= 0) {
      return
    }
    if (this.isToAddMode == true) {
      this.addToOrdersToAdd(item);
    }
    else {
      this.addToOrdersToUpdate(item)
    }
  }

  addToOrdersToAdd(order: any) {
    console.log("ooo", order);


    const existingProductIndex = this.ordersToAdd.findIndex((p: any) => p.productId === order.productId);
    console.log("ooo2", existingProductIndex);

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
          console.log("bbbb", this.branch.data);

          await Promise.all([
            this.getProducts(),
            // this.getUnits(),
            this.getPreOrders(),
            // this.fetchOrders(startTimestamp, endTimestamp)
          ]);

          // await this.getProducts();
          // await this.getPreOrders();

          if (this.preOrders.length > 0) {
            this.selectedDate = this.preOrders[0].createdAt;
            await this.onSelectDate(this.selectedDate);
          } else {
            this.selectedDate = this.currentTimestamp
            this.isToAddMode = true
          }

          this.combineDataWithOrders();
          this.isLoading = false;
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
  isItemInAdd(item: any): boolean {
    return this.ordersToAdd.some((order: any) => order.productId === item.productId);
  }

  async onSelectDate(selectedTimestamp: Timestamp) {
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

    } catch (error) {
      console.error('Error selecting date:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async getProducts() {
    const db = getFirestore();
    const productsRef = collection(db, "products");
    const q = query(productsRef,
      where("city", '==', this.branch.data.city),

      orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);

    this.data = querySnapshot.docs.map(doc => {
      this.orders.push({ qnt: 0, productId: doc.id });
      return {
        id: doc.id,
        name: doc.data()['name'],
        unit: doc.data()['unit'],
        unitF: doc.data()['unitF'],


      };
    });
  }
  async getUnits() {
    const db = getFirestore();
    const productsRef = collection(db, "units");
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);

    this.units = querySnapshot.docs.map(doc => {
      // this.orders.push({ qnt: 0, productId: doc.id });
      return {
        id: doc.id,
        name: doc.data()['name']
      };
    });
  }

  async getPreOrders() {
    const db = getFirestore();
    const productsRef = collection(db, "orders");
    const q = query(
      productsRef,
      where("branchId", "==", this.branch.id),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    this.preOrders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name'],
      createdAt: doc.data()['createdAt']
    }));
    console.log("currentTime", this.currentTimestamp);

    // Check if the current timestamp is in the list

    const currentDateStr = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD

    this.ifCurrentDateInPreOrders1 = this.preOrders.some(
      (o: any) => o.createdAt.toDate().toISOString().split('T')[0] === currentDateStr
    );
  }

  async getBranchOrders(startTimestamp: Timestamp, endTimestamp: Timestamp) {
    const db = getFirestore();
    const productsRef = collection(db, "branchesOrders");

    const q = query(
      productsRef,
      where("branchId", "==", this.branch.id),
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp),
      orderBy("createdAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      productId: doc.data()['productId'],
      // productId: doc.data()['productId'],

      qnt: doc.data()['qnt'],
      qntF: doc.data()['qntF'],
      unitId: doc.data()['unitId'],
      unitFId: doc.data()['unitFId'],
      status: doc.data()['status'],
      createdAt: doc.data()['createdAt']
    }));
  }

  getOrder(productId: string) {
    return this.orders.find((order: any) => order.productId === productId);
  }

  async addOrders() {
    if (this.ordersToAdd.length === 0) return;

    this.isLoading = true;
    const db = getFirestore();
    const batch = writeBatch(db); // Initialize batch

    try {
      // 1. Add all order items
      this.ordersToAdd.forEach((element: any) => {
        console.log("element", element);

        const orderRef = doc(collection(db, "branchesOrders")); // Auto-generate ID
        batch.set(orderRef, {
          branchId: this.branch.id,
          productId: element.productId,
          qnt: element.qnt,
          qntF: element.qntF,
        city: this.branch.data.city,

          status: '0',
          createdAt: this.currentTimestamp // Better than manual timestamp
        });
      });

      // 2. Add the summary document
      const summaryRef = doc(collection(db, "orders"));
      batch.set(summaryRef, {
        branchId: this.branch.id,
        city: this.branch.data.city,
        qntNumber: this.ordersToAdd.length,
        createdAt: this.currentTimestamp // Server-side timestamp
      });

      // 3. Execute everything as a single batch
      await batch.commit(); // Single network call

      this.ordersToAdd = [];
      // alert('All orders added successfully in one operation!');
      window.location.reload()
    } catch (e) {
      console.error("Batch write failed: ", e);
      alert('No orders were added. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  // async addOrders() {
  //   if (this.ordersToAdd.length === 0) return;

  //   this.isLoading = true;
  //   const db = getFirestore();

  //   try {
  //     // Add each order to branchesOrders
  //     for (const element of this.ordersToAdd) {
  //       await addDoc(collection(db, "branchesOrders"), {
  //         branchId: this.branch.id,
  //         productId: element.productId,
  //         qnt: element.qnt,
  //         status: '0',
  //         createdAt: Timestamp.fromDate(new Date())
  //       });
  //     }

  //     // Add summary to orders collection
  //     await addDoc(collection(db, "orders"), {
  //       branchId: this.branch.id,
  //       qntNumber: this.ordersToAdd.length,
  //       createdAt: Timestamp.fromDate(new Date())
  //     });

  //     // Clear the orders to add
  //     this.ordersToAdd = [];
  //     alert('Orders added successfully!');
  //   } catch (e) {
  //     console.error("Error adding order: ", e);
  //     alert('Error adding orders');
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }

  async getRelatedBranche(name: string) {
    const db = getFirestore();
    const n = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const q = query(
      collection(db, "branches"),
      where("name", "==", n),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    const doc = querySnapshot.docs[0];

    return { id: doc.id, data: doc.data() };
  }

  combineDataWithOrders() {
    this.combinedData = this.data.map((product: any) => {
      const order = this.branchOrders.find((o: any) => o.productId === product.id);

      console.log("order", order);
      console.log("product", product);

      if (order) {
        this.isPreSent = true
      }
      var unitName

      if (order && order.unitId) {
        const unit = this.units.find((unit: any) => unit.unitId === order.unitId);

        if (unit) {
          unitName = unit.name
        } else {
          unitName = ""
        }


      } else {
        unitName = ""
      }

      var unitNameF

      if (order && order.unitFId) {
        const unit = this.units.find((unit: any) => unit.unitFId === order.unitFId);

        if (unit) {
          unitNameF = unit.name
        } else {
          unitNameF = ""
        }


      } else {
        unitNameF = ""
      }


      const s = {
        // ...product,
        id: order ? order.id : -1,
        name: product.name,
        // units: product.units,
        productId: product.id,
        qnt: order ? order.qnt : '',
        qntF: order ? order.qntF : '',

        // qntF: order ? order.qntF : '',
        unit: product ? product.unit : '',
        unitF: product ? product.unitF : '',
        // unitF: order ? unitNameF : '',
        status: order ? order.status : 0
      };

      console.log("new order", s);
      return s
    });
  }

  add() {

  }



  onStatusChange(order: any) {
    // Handle the status change for the order 
    // console.log('Order status updated:', order);

    this.addToOrdersToUpdate(order)

  }

  onUnitChange(order: any) {
    // Handle the status change for the order 
    // console.log('Order status updated:', order);

    this.addToOrdersToAdd(order)

  }
  onUnitFChange(order: any) {
    // Handle the status change for the order 
    // console.log('Order status updated:', order);

    this.addToOrdersToAdd(order)

  }

  getUnit(unitId: string) {
    const unit = this.units.find((unit: any) => unit.unitFId === unitId);

  }
}

