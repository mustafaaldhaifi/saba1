// import { Component, inject } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { environment } from '../../env';
// import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
// import { Router } from '@angular/router';
// import { addDoc, and, arrayRemove, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, Timestamp, updateDoc, where, writeBatch } from "firebase/firestore";
// import { CommonModule } from '@angular/common';
// import { log } from 'console';
// // import { AngularFirestoreModule } from '@angular/fire/firestore';
// // import { doc, docData, DocumentReference, Firestore, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, collectionData, Timestamp } from "@angular/fire/firestore";

// @Component({
//   selector: 'app-root',
//   imports: [
//     FormsModule, CommonModule
//   ],
//   templateUrl: './dashboard.component.html',
//   styleUrl: './dashboard.component.css'
// })
// export class DashboardComponent {
//   deleteProduct(id: string) {
//     const confirmed = window.confirm('Are you sure you want to delete this product and associated orders?');

//     if (!confirmed) {
//       console.log('Deletion canceled');
//       return; // Exit the function if the user cancels the action
//     }

//     console.log("Deleting product with ID:", id);

//     this.isLoading = true; // Set loading state to true

//     const db = getFirestore(); // Get Firestore instance
//     const batch = writeBatch(db); // Create a batch write instance

//     // Step 1: Delete the product from the 'products' collection
//     const productDocRef = doc(db, 'products', id);
//     batch.delete(productDocRef); // Add product deletion to batch

//     // Step 2: Get orders that contain this productId and delete those orders
//     const ordersQuery = query(collection(db, 'branchesOrders'), where('productId', '==', id));

//     // Step 3: Fetch affected orders in one call
//     getDocs(ordersQuery)
//       .then((snapshot) => {
//         snapshot.forEach((orderDoc) => {
//           const orderDocRef = doc(db, 'branchesOrders', orderDoc.id);

//           // Step 4: Delete the entire order document
//           batch.delete(orderDocRef);
//         });

//         // Step 5: Commit the batch (perform all the deletes atomically)
//         batch.commit()
//           .then(() => {
//             console.log('Batch write successful: Product and associated orders deleted');
//             this.isLoading = false; // Hide loading state
//             this.data = this.data.filter((product: any) => product.id !== id);
//             // this.removeProductFromUI(id); // Optionally update the UI without reloading the page
//           })
//           .catch((error: any) => {
//             console.error('Error with batch write:', error);
//             this.isLoading = false; // Hide loading state in case of error
//           });
//       })
//       .catch((error) => {
//         console.error('Error fetching orders:', error);
//         this.isLoading = false; // Hide loading state in case of error
//       });
//   }

//   async onSelectDate(arg0: any) {
//     this.selectedDate = arg0.toDate();
//     await this.getData(this.selectedDate)
//   }
//   // firestore: Firestore = inject(Firestore);
//   title = 'saba1';
//   isLoading = false
//   isAdmin = false

//   constructor(private router: Router) {
//   }

//   async ngOnInit(): Promise<void> {
//     const auth = getAuth();
//     onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         if (user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2") {
//           this.isAdmin = true
//           await this.getData()
//         }
//         else {
//           this.router.navigate(['/branch']);
//         }

//         // If the user is logged in, navigate to dashboard or home page
//         console.log('User is logged in:', user);

//       } else {
//         // If the user is not logged in, navigate to login page

//         this.router.navigate(['/login']);
//         // this.router.navigate(['/login']);
//       }
//     });
//   }



//   async getPreOrders() {
//     const db = getFirestore();
//     const productsRef = collection(db, "orders");
//     const q = query(
//       productsRef,
//       orderBy("createdAt", "desc")
//     );

//     const querySnapshot = await getDocs(q);
//     this.preOrders = querySnapshot.docs.map(doc => ({
//       id: doc.id,
//       branchId: doc.data()['branchId'],
//       createdAt: doc.data()['createdAt']
//     }));
//     this.actualPreOrders = this.preOrders
//     // console.log("ffdfd", this.actualPreOrders);
//     const groupedPreOrders = new Map();

//     // Iterate over the preOrders and group by the formatted createdAt date
//     this.actualPreOrders.forEach((preOrder: any) => {
//       // Format createdAt to YYYY-MM-DD to ignore the time part
//       const createdAtKey = preOrder.createdAt.toDate().toISOString().split('T')[0];  // Format as 'YYYY-MM-DD'

//       // If the key doesn't exist in the map, initialize it with an empty array and count 0
//       if (!groupedPreOrders.has(createdAtKey)) {
//         console.log("yes");

//         groupedPreOrders.set(createdAtKey, { count: 0, orders: [] });
//       }

//       // Increment the count and add the preOrder to the group
//       const group = groupedPreOrders.get(createdAtKey);
//       group.count += 1;
//       group.orders.push(preOrder);
//     });
//     console.log("ggg", groupedPreOrders);


//     // Convert the Map to an array of grouped orders with count
//     this.preOrders = Array.from(groupedPreOrders.entries()).map(([createdAt, { count, orders }]) => {
//       return {
//         createdAt: Timestamp.fromDate(new Date(createdAt)), // Convert createdAt to Firestore Timestamp
//         count: count, // The count of orders for that date
//         orders: orders // The list of orders for that date
//       };
//     });


//     // console.log("ffdfd4545", this.preOrders);


//     // this.preOrders.forEach((preOrder: any) => {
//     //   // Format createdAt to a string, e.g., YYYY-MM-DD (you can adjust as needed)
//     //   const createdAtKey = preOrder.createdAt.toDate().toISOString().split('T')[0];

//     //   if (!this.actualPreOrders.has(createdAtKey)) {
//     //     groupedPreOrders.set(createdAtKey, { createdAt: createdAtKey, count: 0, orders: [] });
//     //   }

//     //   // Add the current preOrder to the appropriate group and increment the count
//     //   groupedPreOrders.get(createdAtKey).count += 1;
//     //   groupedPreOrders.get(createdAtKey).orders.push(preOrder);
//     // });


//   }

//   preOrders: any = []
//   actualPreOrders: any = []

//   data: any = []
//   barnches: any = []
//   barnchesOrders: any = []

//   logout() {
//     const auth = getAuth();

//     signOut(auth).then(() => {
//       // Optionally, you can navigate the user to a login page after logout
//       this.router.navigateByUrl('/login');
//     }).catch((error) => {
//       console.error('Logout error:', error);
//     });
//   }

//   selectedDate: any
//   async getData(date: any = null) {
//     this.isLoading = true
//     try {
//       const db = getFirestore();

//       await this.getPreOrders();
//       // if (this.preOrders.length > 0) {

//       // }
//       var selectedDate
//       if (date != null) {
//         selectedDate = date
//         this.selectedDate = selectedDate

//       } else {
//         selectedDate = Timestamp.now().toDate()
//         this.selectedDate = selectedDate

//         // if (this.preOrders.length > 0) {
//         //   selectedDate = this.preOrders[0].createdAt.toDate();
//         //   this.selectedDate = selectedDate
//         // } else {
//         //   selectedDate = Timestamp.now().toDate()
//         //   this.selectedDate = selectedDate

//         // }
//       }


//       // Start of day (00:00:00.000 UTC)
//       const startOfDay = new Date(selectedDate);
//       startOfDay.setUTCHours(0, 0, 0, 0);
//       const startTimestamp = Timestamp.fromDate(startOfDay);

//       // End of day (23:59:59.999 UTC)
//       const endOfDay = new Date(selectedDate);
//       endOfDay.setUTCHours(23, 59, 59, 999);
//       const endTimestamp = Timestamp.fromDate(endOfDay);


//       console.log("rtrtr", selectedDate);
//       console.log("rtrtr2", startOfDay);
//       console.log("rtrtr3", endOfDay);


//       // Fetch all collections concurrently
//       const [branchesSnapshot, productsSnapshot, branchesOrdersSnapshot] = await Promise.all([
//         getDocs(collection(db, "branches")),
//         getDocs(query(collection(db, "products"), orderBy("createdAt", "asc"))),
//         getDocs(query(collection(db, "branchesOrders"),
//           where("createdAt", ">=", startTimestamp),
//           where("createdAt", "<=", endTimestamp),
//         )),


//       ]);

//       // Process branches
//       this.barnches = branchesSnapshot.docs.map(doc => {
//         return { id: doc.id, name: doc.data()['name'] };
//       });

//       // Process products
//       this.data = productsSnapshot.docs.map(doc => {
//         return { id: doc.id, name: doc.data()['name'] };
//       });

//       // Process branchesOrders
//       this.barnchesOrders = branchesOrdersSnapshot.docs.map(doc => {
//         return {
//           id: doc.id,
//           qnt: doc.data()['qnt'],
//           status: doc.data()['status'],
//           productId: doc.data()['productId'],
//           branchId: doc.data()['branchId'],
//         };
//       });

//       // Logic for combining branches, products, and orders
//       let newData = [];

//       for (let index = 0; index < this.data.length; index++) {
//         const product = this.data[index];

//         for (let index2 = 0; index2 < this.barnches.length; index2++) {
//           const branch = this.barnches[index2];

//           // Check if the combination of productId and branchId already exists in barnchesOrders
//           let exists = false;
//           for (let index3 = 0; index3 < this.barnchesOrders.length; index3++) {
//             const order = this.barnchesOrders[index3];

//             // Check if this order matches the current product and branch
//             if (order.branchId === branch.id && order.productId === product.id) {
//               exists = true;
//               break;  // Exit early as we found a matching order
//             }
//           }

//           // If the combination doesn't exist, add it to newData
//           if (!exists) {
//             newData.push({ qnt: 0, productId: product.id, branchId: branch.id });
//           }
//         }
//       }


//       // Add the new data to barnchesOrders
//       this.barnchesOrders.push(...newData);
//       // let newData = [];
//       // for (let product of this.data) {
//       //   for (let branch of this.barnches) {
//       //     let exists = this.barnchesOrders.some((order:any) => order.branchId === branch.id && order.productId === product.id);

//       //     if (!exists) {
//       //       newData.push({ qnt: 0, productId: product.id, branchId: branch.id });
//       //     }
//       //   }
//       // }

//       // // Add the new data to barnchesOrders
//       // this.barnchesOrders.push(...newData);

//       // // Optionally, log the data if needed
//       // console.log(this.barnches, this.data, this.barnchesOrders);

//     } catch (error) {
//       console.error("Error fetching data:", error);
//     }
//     this.isLoading = false
//     // console.log(this.data);

//   }


//   async getBranches() {
//     const db = getFirestore()
//     const querySnapshot = await getDocs(collection(db, "branches"));
//     console.log(querySnapshot.docs[0].data()['name']);
//     this.barnches = querySnapshot.docs
//   }
//   async getProducts() {
//     const db = getFirestore()
//     // Reference to the "products" collection
//     const productsRef = collection(db, "products");

//     // Create a query to order the documents by the "createdAt" field in ascending order
//     const q = query(productsRef, orderBy("createdAt", "asc"));
//     const querySnapshot = await getDocs(q);
//     this.data = querySnapshot.docs.map(doc => {
//       // Returning an object with 'id' and 'name' from each document
//       return {
//         id: doc.id, // Firestore document ID
//         name: doc.data()['name'] // 'name' field from Firestore document
//       };
//     });
//     console.log(this.data);

//     // console.log(querySnapshot.docs[0].data()['name']);
//     // this.data = querySnapshot.docs

//   }
//   async getBranchesOrders() {
//     const db = getFirestore()
//     const querySnapshot = await getDocs(collection(db, "branchesOrders"));
//     // console.log(querySnapshot.docs[0].data()['Quantity']);
//     // this.barnchesOrders = querySnapshot.docs


//     this.barnchesOrders = querySnapshot.docs.map(doc => {
//       // Returning an object with 'id' and 'name' from each document
//       return {
//         id: doc.id, // Firestore document ID
//         qnt: doc.data()['qnt'] // 'name' field from Firestore document,
//         ,
//         status: doc.data()['status'],
//         productId: doc.data()['productId'],
//         branchId: doc.data()['branchId'],
//       };
//     })

//     // console.log("gt", this.br);

//     let newData = [];

//     for (let index = 0; index < this.data.length; index++) {
//       const product = this.data[index];

//       for (let index2 = 0; index2 < this.barnches.length; index2++) {
//         const branch = this.barnches[index2];

//         // Check if the combination of productId and branchId already exists in barnchesOrders
//         let exists = false;
//         for (let index3 = 0; index3 < this.barnchesOrders.length; index3++) {
//           const order = this.barnchesOrders[index3];

//           // Check if this order matches the current product and branch
//           if (order.branchId === branch.id && order.productId === product.id) {
//             exists = true;
//             break;  // Exit early as we found a matching order
//           }
//         }

//         // If the combination doesn't exist, add it to newData
//         if (!exists) {
//           newData.push({ qnt: 0, productId: product.id, branchId: branch.id });
//         }
//       }
//     }

//     // Add the new data to barnchesOrders
//     this.barnchesOrders.push(...newData);
//   }



//   async addProducts() {
//     const db = getFirestore();
//     for (const element of this.productsToAdd) {
//       try {
//         // Add a new document with the product data to the "products" collection
//         const docRef = await addDoc(collection(db, "products"), {
//           name: element.name
//           ,
//           createdAt: Timestamp.fromDate(new Date())
//         });
//         console.log("Product added with ID: ", docRef.id);
//       } catch (e) {
//         console.error("Error adding product: ", e);
//       }
//     }

//   }

//   async addOrders() {
//     const db = getFirestore();
//     for (const element of this.ordersToAdd) {
//       try {
//         // Add a new document with the product data to the "products" collection
//         const docRef = await addDoc(collection(db, "branchesOrders"), {
//           branchId: element.branchId,
//           productId: element.productId,
//           qnt: element.qnt,
//           status: '0',
//           createdAt: Timestamp.fromDate(new Date())
//         });
//         console.log("Order added with ID: ", docRef.id);
//       } catch (e) {
//         console.error("Error adding order: ", e);
//       }
//     }

//   }
//   onStatusChange(order: any) {
//     // Handle the status change for the order 
//     // console.log('Order status updated:', order);
//     if (order.id) {
//       this.addToOrdersToUpdate(order)
//     } else {
//       this.addToOrdersToAdd(order)
//     }
//   }


//   async updateProducts() {
//     const db = getFirestore();

//     // Loop over the products to update
//     for (const element of this.productsToUpdate) {
//       const productRef = doc(db, "products", element.id);

//       // Exclude the 'id' field from the update data using destructuring
//       const { id, ...updatedData } = element; // This removes `id` from the object

//       try {
//         // Update the product in Firestore with the fields (without `id`)
//         await updateDoc(productRef, updatedData);
//         console.log(`Product with ID: ${element.id} updated successfully.`);
//       } catch (e) {
//         console.error("Error updating product: ", e);
//       }
//     }

//   }

//   async updateOrders() {
//     const db = getFirestore();

//     // Loop over the products to update
//     for (const element of this.ordersToUpdate) {
//       const productRef = doc(db, "branchesOrders", element.id);

//       // Exclude the 'id' field from the update data using destructuring
//       const { id, ...updatedData } = element; // This removes `id` from the object

//       try {
//         // Update the product in Firestore with the fields (without `id`)
//         await updateDoc(productRef, updatedData);
//         console.log(`Order with ID: ${element.id} updated successfully.`);
//       } catch (e) {
//         console.error("Error updating product: ", e);
//       }
//     }

//   }


//   // getCollectionData(path: string) {
//   //   return collectionData(collection(this.firestore, path), { idField: 'id' }) as Observable<Travel[] | Stop[]>
//   // }

//   productsToAdd: any = []


//   addToProductsToAdd() {
//     this.productsToAdd.push({ name: "" })
//     console.log(this.productsToAdd);
//   }
//   productsToUpdate: any = [];

//   // Method to add or update a product in the productsToUpdate array
//   addToProductsToUpdate(product: any) {
//     // Find product by ID
//     const existingProductIndex = this.productsToUpdate.findIndex((p: any) => p.id === product.id);

//     if (existingProductIndex !== -1) {
//       // Product exists, update it
//       this.productsToUpdate[existingProductIndex].name = product.name;
//       console.log(`Updated product: ${product.name}`);
//     } else {
//       // Product doesn't exist, add it
//       this.productsToUpdate.push(product);
//       console.log(`Added new product: ${product.name}`);
//     }

//     // Log updated array for debugging
//     console.log(this.productsToUpdate);
//   }

//   // Method to handle changes in product name (triggered by input change)
//   onProductNameChange(index: number, id: string, updatedName: string) {
//     console.log(`Product at index ${index} updated to: ${updatedName} id ${id}`);

//     // Add or update product in the productsToUpdate array
//     this.addToProductsToUpdate({ id: id, name: updatedName });
//     // if (updatedName != originalValue) {

//     // }
//     // else {
//     //   const productIndex = this.productsToUpdate.findIndex((product: any) => product.id === id);

//     //   if (productIndex !== -1) {
//     //     // Remove the product from the array
//     //     this.productsToUpdate.splice(productIndex, 1);
//     //     // console.log(`Removed product with ID: ${productId}`);
//     //   }
//     // }

//     // Optionally log the changes
//     console.log("Current products to update:", this.productsToUpdate);
//   }


//   //
//   ordersToAdd: any = []
//   ordersToUpdate: any = []

//   addToOrdersToUpdate(order: any) {
//     // Find product by ID
//     const existingProductIndex = this.ordersToUpdate.findIndex((p: any) => p.id === order.id);

//     if (existingProductIndex !== -1) {
//       // Product exists, update it
//       this.ordersToUpdate[existingProductIndex] = order;
//       // console.log(`Updated product: ${product.name}`);
//     } else {
//       // Product doesn't exist, add it
//       this.ordersToUpdate.push(order);
//     }

//     // Log updated array for debugging
//     console.log(this.productsToUpdate);
//   }

//   addToOrdersToAdd(order: any) {
//     // Find product by ID
//     const existingProductIndex = this.ordersToAdd.findIndex((p: any) => p.productId === order.productId && p.branchId === order.branchId);

//     if (existingProductIndex !== -1) {
//       // Product exists, update it
//       this.ordersToAdd[existingProductIndex] = order;
//       // console.log(`Updated product: ${product.name}`);
//     } else {
//       // Product doesn't exist, add it
//       this.ordersToAdd.push(order);
//     }

//     // Log updated array for debugging
//     console.log(this.productsToUpdate);
//   }

//   onOrderChange(order: any, event: any) {
//     // console.log("vvvvv",event);
//     // console.log("vvvvv",order);


//     // const existingOrderIndex = this.barnchesOrders.findIndex((p: any) => p.productId === order.productId && p.branchId === order.branchId);
//     if (order.id) {
//       this.addToOrdersToUpdate(order)
//     } else {
//       this.addToOrdersToAdd(order)
//     }
//   }

//   // Method to check if there are any changes in the product arrays
//   ifHaveChanges() {
//     return this.productsToAdd.length > 0 || this.productsToUpdate.length > 0 || this.ordersToAdd.length > 0 || this.ordersToUpdate.length > 0;
//   }

//   async saveChanges() {
//     this.isLoading = true
//     if (this.productsToAdd.length > 0) {
//       await this.addProducts()
//     }
//     if (this.productsToUpdate.length > 0) {
//       console.log("ddffdfdf");
//       await this.updateProducts()
//     }
//     if (this.ordersToAdd.length > 0) {
//       await this.addOrders()
//     }
//     if (this.ordersToUpdate.length > 0) {
//       console.log("ddffdfdf");
//       await this.updateOrders()
//     }

//     window.location.reload();

//   }


// }


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
  deleteDoc
} from "firebase/firestore";

interface Product {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Order {
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
  isLoading = false;
  isAdmin = false;
  selectedDate: Date | null = null;

  data: Product[] = [];
  branches: Branch[] = [];
  orders: Order[] = [];

  preOrders: GroupedPreOrder[] = [];
  actualPreOrders: PreOrder[] = [];

  productsToAdd: Partial<Product>[] = [];
  productsToUpdate: Product[] = [];
  ordersToAdd: Order[] = [];
  ordersToUpdate: Order[] = [];

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
      const { startTimestamp, endTimestamp } = this.getDateRangeTimestamps(this.selectedDate);

      const [branches, products, orders] = await Promise.all([
        this.fetchBranches(),
        this.fetchProducts(),
        this.fetchOrders(startTimestamp, endTimestamp)
      ]);

      this.branches = branches;
      this.data = products;
      this.orders = orders;

      this.addMissingOrders();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.isLoading = false;
    }
  }

  private getDateRangeTimestamps(date: Date): { startTimestamp: Timestamp; endTimestamp: Timestamp } {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return {
      startTimestamp: Timestamp.fromDate(startOfDay),
      endTimestamp: Timestamp.fromDate(endOfDay)
    };
  }

  private async fetchBranches(): Promise<Branch[]> {
    const db = getFirestore();
    const snapshot = await getDocs(collection(db, "branches"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name']
    }));
  }

  private async fetchProducts(): Promise<Product[]> {
    const db = getFirestore();
    const q = query(collection(db, "products"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data()['name']
    }));
  }

  private async fetchOrders(start: Timestamp, end: Timestamp): Promise<Order[]> {
    const db = getFirestore();
    const q = query(
      collection(db, "branchesOrders"),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      qnt: doc.data()['qnt'],
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
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    this.actualPreOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      branchId: doc.data()['branchId'],
      createdAt: doc.data()['createdAt']
    }));


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
      const dateKey = order.createdAt.toDate().toISOString().split('T')[0];

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
    this.productsToAdd.push({ name: "" });
  }

  onProductNameChange(index: number, id: string, name: string): void {
    const existingIndex = this.productsToUpdate.findIndex(p => p.id === id);

    if (existingIndex !== -1) {
      this.productsToUpdate[existingIndex].name = name;
    } else {
      this.productsToUpdate.push({ id, name });
    }
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
    order.qnt = qnt;
    this.updateOrderCollections(order);
  }

  onStatusChange(order: Order): void {
    this.updateOrderCollections(order);
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

    this.productsToAdd.forEach(product => {
      if (product.name) {
        // const tempId = doc(collection(db, 'products')).id;
        const docRef = doc(collection(db, 'products'));
        const newData = {
          name: product.name,
          createdAt: Timestamp.fromDate(new Date())
        }
        batch.set(docRef, newData);
        // this.data.push({
        //   id: tempId,
        //   name: product.name,
        // })
      }

    });

    await batch.commit();
    this.productsToAdd = [];
    window.location.reload();


  }

  private async updateProducts(): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);

    this.productsToUpdate.forEach(product => {
      const docRef = doc(db, 'products', product.id);
      batch.update(docRef, { name: product.name });
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
        batch.update(docRef, {
          qnt: order.qnt,
          status: order.status
        });
      }
    });

    await batch.commit();
    this.ordersToUpdate = [];
  }

  exportToExcel() {
    // Prepare the data
    const excelData = [];

    // Add headers - separate columns for Quantity and Status for each branch
    const headers = ['Product Name'];
    this.branches.forEach(branch => {
      headers.push(`${branch.name} Qty`);
      headers.push(`${branch.name} Status`);
    });
    excelData.push(headers);

    // Add product rows
    this.data.forEach(product => {
      const row = [product.name];

      this.branches.forEach(branch => {
        const order = this.orders.find(o =>
          o.branchId === branch.id && o.productId === product.id
        );

        // Add quantity
        row.push(order ? order.qnt.toString() : '');

        // Add status with the specified logic
        let statusText = '';
        if (order) {
          if (order.status === '1') {
            statusText = 'Received';
          } else if (order.status === '0') {
            statusText = 'Not Received';
          } else {
            statusText = 'No Action';
          }
        }
        row.push(statusText);
      });

      excelData.push(row);
    });

    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate file name
    const fileName = `orders_${this.selectedDate?.toISOString().split('T')[0] || 'all'}.xlsx`;

    // Export to Excel
    XLSX.writeFile(wb, fileName);
  }
}