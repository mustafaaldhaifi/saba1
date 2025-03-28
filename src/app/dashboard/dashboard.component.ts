import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../env';
import { getAuth, signOut } from 'firebase/auth';
import { Router } from '@angular/router';
import { addDoc, and, collection, doc, getDocs, getFirestore, orderBy, query, Timestamp, updateDoc } from "firebase/firestore";
import { CommonModule } from '@angular/common';
import { log } from 'console';
// import { AngularFirestoreModule } from '@angular/fire/firestore';
// import { doc, docData, DocumentReference, Firestore, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, collectionData, Timestamp } from "@angular/fire/firestore";

@Component({
  selector: 'app-root',
  imports: [
    FormsModule, CommonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  // firestore: Firestore = inject(Firestore);
  title = 'saba1';

  constructor(private router: Router) {
    // this.getProducts()
    // this.getBranches()
    // this.getBranchesOrders()
  }

  async ngOnInit(): Promise<void> {
    // Call the asynchronous functions in ngOnInit
    await this.getProducts();
    await this.getBranches();
    await this.getBranchesOrders();
  }

  data: any = []
  barnches: any = []
  barnchesOrders: any = []

  logout() {
    const auth = getAuth();

    signOut(auth).then(() => {
      // Optionally, you can navigate the user to a login page after logout
      this.router.navigateByUrl('/login');
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  }


  async getBranches() {
    const db = getFirestore()
    const querySnapshot = await getDocs(collection(db, "branches"));
    console.log(querySnapshot.docs[0].data()['name']);
    this.barnches = querySnapshot.docs
  }
  async getProducts() {
    const db = getFirestore()
    // Reference to the "products" collection
    const productsRef = collection(db, "products");

    // Create a query to order the documents by the "createdAt" field in ascending order
    const q = query(productsRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    this.data = querySnapshot.docs.map(doc => {
      // Returning an object with 'id' and 'name' from each document
      return {
        id: doc.id, // Firestore document ID
        name: doc.data()['name'] // 'name' field from Firestore document
      };
    });
    console.log(this.data);

    // console.log(querySnapshot.docs[0].data()['name']);
    // this.data = querySnapshot.docs

  }

  // async getProducts() {
  //   const db = getFirestore()
  //   const querySnapshot = await getDocs(collection(db, "products"));
  //   console.log(querySnapshot.name);
  //   console.log(querySnapshot.id);

  //   this.data = querySnapshot.docs
  // }

  async getBranchesOrders() {
    const db = getFirestore()
    const querySnapshot = await getDocs(collection(db, "branchesOrders"));
    // console.log(querySnapshot.docs[0].data()['Quantity']);
    // this.barnchesOrders = querySnapshot.docs


    this.barnchesOrders = querySnapshot.docs.map(doc => {
      // Returning an object with 'id' and 'name' from each document
      return {
        id: doc.id, // Firestore document ID
        qnt: doc.data()['qnt'] // 'name' field from Firestore document,
        ,
        productId: doc.data()['productId'],
        branchId: doc.data()['branchId'],
      };
    })

    // console.log("gt", this.br);

    let newData = [];

    for (let index = 0; index < this.data.length; index++) {
      const product = this.data[index];

      for (let index2 = 0; index2 < this.barnches.length; index2++) {
        const branch = this.barnches[index2];

        // Check if the combination of productId and branchId already exists in barnchesOrders
        let exists = false;
        for (let index3 = 0; index3 < this.barnchesOrders.length; index3++) {
          const order = this.barnchesOrders[index3];

          // Check if this order matches the current product and branch
          if (order.branchId === branch.id && order.productId === product.id) {
            exists = true;
            break;  // Exit early as we found a matching order
          }
        }

        // If the combination doesn't exist, add it to newData
        if (!exists) {
          newData.push({ qnt: 0, productId: product.id, branchId: branch.id });
        }
      }
    }

    // Add the new data to barnchesOrders
    this.barnchesOrders.push(...newData);
  }



  async addProducts() {
    const db = getFirestore();
    for (const element of this.productsToAdd) {
      try {
        // Add a new document with the product data to the "products" collection
        const docRef = await addDoc(collection(db, "products"), {
          name: element.name
          ,
          createdAt: Timestamp.fromDate(new Date())
        });
        console.log("Product added with ID: ", docRef.id);
      } catch (e) {
        console.error("Error adding product: ", e);
      }
    }

  }

  async addOrders() {
    const db = getFirestore();
    for (const element of this.ordersToAdd) {
      try {
        // Add a new document with the product data to the "products" collection
        const docRef = await addDoc(collection(db, "branchesOrders"), {
          branchId: element.branchId,
          productId: element.productId,
          qnt: element.qnt,
          createdAt: Timestamp.fromDate(new Date())
        });
        console.log("Order added with ID: ", docRef.id);
      } catch (e) {
        console.error("Error adding order: ", e);
      }
    }

  }
  onStatusChange(order: any) {
    // Handle the status change for the order
    console.log('Order status updated:', order);
  }
  

  async updateProducts() {
    const db = getFirestore();

    // Loop over the products to update
    for (const element of this.productsToUpdate) {
      const productRef = doc(db, "products", element.id);

      // Exclude the 'id' field from the update data using destructuring
      const { id, ...updatedData } = element; // This removes `id` from the object

      try {
        // Update the product in Firestore with the fields (without `id`)
        await updateDoc(productRef, updatedData);
        console.log(`Product with ID: ${element.id} updated successfully.`);
      } catch (e) {
        console.error("Error updating product: ", e);
      }
    }

  }

  async updateOrders() {
    const db = getFirestore();

    // Loop over the products to update
    for (const element of this.ordersToUpdate) {
      const productRef = doc(db, "branchesOrders", element.id);

      // Exclude the 'id' field from the update data using destructuring
      const { id, ...updatedData } = element; // This removes `id` from the object

      try {
        // Update the product in Firestore with the fields (without `id`)
        await updateDoc(productRef, updatedData);
        console.log(`Order with ID: ${element.id} updated successfully.`);
      } catch (e) {
        console.error("Error updating product: ", e);
      }
    }

  }


  // getCollectionData(path: string) {
  //   return collectionData(collection(this.firestore, path), { idField: 'id' }) as Observable<Travel[] | Stop[]>
  // }

  productsToAdd: any = []


  addToProductsToAdd() {
    this.productsToAdd.push({ name: "" })
    console.log(this.productsToAdd);
  }
  productsToUpdate: any = [];

  // Method to add or update a product in the productsToUpdate array
  addToProductsToUpdate(product: any) {
    // Find product by ID
    const existingProductIndex = this.productsToUpdate.findIndex((p: any) => p.id === product.id);

    if (existingProductIndex !== -1) {
      // Product exists, update it
      this.productsToUpdate[existingProductIndex].name = product.name;
      console.log(`Updated product: ${product.name}`);
    } else {
      // Product doesn't exist, add it
      this.productsToUpdate.push(product);
      console.log(`Added new product: ${product.name}`);
    }

    // Log updated array for debugging
    console.log(this.productsToUpdate);
  }

  // Method to handle changes in product name (triggered by input change)
  onProductNameChange(index: number, id: string, updatedName: string) {
    console.log(`Product at index ${index} updated to: ${updatedName} id ${id}`);

    // Add or update product in the productsToUpdate array
    this.addToProductsToUpdate({ id: id, name: updatedName });
    // if (updatedName != originalValue) {

    // }
    // else {
    //   const productIndex = this.productsToUpdate.findIndex((product: any) => product.id === id);

    //   if (productIndex !== -1) {
    //     // Remove the product from the array
    //     this.productsToUpdate.splice(productIndex, 1);
    //     // console.log(`Removed product with ID: ${productId}`);
    //   }
    // }

    // Optionally log the changes
    console.log("Current products to update:", this.productsToUpdate);
  }


  //
  ordersToAdd: any = []
  ordersToUpdate: any = []

  addToOrdersToUpdate(order: any) {
    // Find product by ID
    const existingProductIndex = this.ordersToUpdate.findIndex((p: any) => p.id === order.id);

    if (existingProductIndex !== -1) {
      // Product exists, update it
      this.ordersToUpdate[existingProductIndex] = order;
      // console.log(`Updated product: ${product.name}`);
    } else {
      // Product doesn't exist, add it
      this.ordersToUpdate.push(order);
    }

    // Log updated array for debugging
    console.log(this.productsToUpdate);
  }

  addToOrdersToAdd(order: any) {
    // Find product by ID
    const existingProductIndex = this.ordersToAdd.findIndex((p: any) => p.productId === order.productId && p.branchId === order.branchId);

    if (existingProductIndex !== -1) {
      // Product exists, update it
      this.ordersToAdd[existingProductIndex] = order;
      // console.log(`Updated product: ${product.name}`);
    } else {
      // Product doesn't exist, add it
      this.ordersToAdd.push(order);
    }

    // Log updated array for debugging
    console.log(this.productsToUpdate);
  }

  onOrderChange(order: any, event: any) {
    // console.log("vvvvv",event);
    // console.log("vvvvv",order);


    // const existingOrderIndex = this.barnchesOrders.findIndex((p: any) => p.productId === order.productId && p.branchId === order.branchId);
    if (order.id) {
      this.addToOrdersToUpdate(order)
    } else {
      this.addToOrdersToAdd(order)
    }
    console.log("ggg", this.ordersToAdd.length);
    console.log("ppp", this.ordersToUpdate.length);


  }

  // Method to check if there are any changes in the product arrays
  ifHaveChanges() {
    return this.productsToAdd.length > 0 || this.productsToUpdate.length > 0 || this.ordersToAdd.length > 0 || this.ordersToUpdate.length > 0;
  }

  async saveChanges() {
    if (this.productsToAdd.length > 0) {
      await this.addProducts()
    }
    if (this.productsToUpdate.length > 0) {
      console.log("ddffdfdf");
      await this.updateProducts()
    }
    if (this.ordersToAdd.length > 0) {
      await this.addOrders()
    }
    if (this.ordersToUpdate.length > 0) {
      console.log("ddffdfdf");
      await this.updateOrders()
    }

    window.location.reload();

  }


}
