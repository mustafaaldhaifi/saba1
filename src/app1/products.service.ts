import { Injectable } from '@angular/core';
import { collection, doc, Firestore, getDocs, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private name = 'products';
  private productsInfo: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.name);
      const productsInfo = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(productsInfo)) {
        this.saveToLocal([]);
      } else {
        this.productsInfo = productsInfo;
      }
    }
  }

  private saveToLocal(data: any[]) {
    this.productsInfo = data;
    localStorage.setItem(this.name, JSON.stringify(data));
  }

  getProductsFromLocal(city: string, typeId: string) {
    return this.productsInfo.find((item: any) => item.city === city && item.typeId === typeId);
  }

  async compareDate(city: string, typeId: string, fetchedAt: Date, apiService: ApiService): Promise<boolean> {
    try {
      const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
      const latestUpdate = await this.getLastupdate(city, typeId, apiService);

      if (!latestUpdate) {
        return false; // No update found in Firestore
      }

      return latestUpdate.updatedAt.getTime() > fetchedDate.getTime();

    } catch (error) {
      console.error("Error fetching product update info:", error);
      return false;
    }
  }

  compareDate2(latestUpdate: Date, fetchedAt: Date): boolean {
    try {
      const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
      // const latestUpdate = await this.getLastupdate(city, typeId, apiService);

      // if (!latestUpdate) {
      //   return false; // No update found in Firestore
      // }

      return latestUpdate.getTime() > fetchedDate.getTime();

    } catch (error) {
      console.error("Error fetching product update info:", error);
      return false;
    }
  }



  addProductToLocal(products: any, city: string, typeId: string) {
    this.productsInfo.push({ city, typeId, products });
    this.saveToLocal(this.productsInfo);
  }

  updateProductInLocal(products: any, city: string, typeId: string) {
    const index = this.productsInfo.findIndex(
      (item: any) => item.city === city && item.typeId === typeId
    );

    const now = new Date();

    if (index !== -1) {
      this.productsInfo[index].products = products;
      this.productsInfo[index].fetchedAt = now;
    } else {
      this.productsInfo.push({
        city,
        typeId,
        products,
        fetchedAt: now
      });
    }

    this.saveToLocal(this.productsInfo);
  }

  async getLastupdate(city: string, typeId: string, apiService: ApiService): Promise<{ id: string, updatedAt: Date } | false> {
    const constraints = [
      where("city", "==", city),
      where("typeId", "==", typeId),
    ];

    const snapshot = await apiService.getData("productUpdates", constraints);

    if (snapshot.empty) {
      const docRef = doc(collection(apiService.db, "productUpdates"));

      const now = Timestamp.now();
      await setDoc(docRef, {
        city,
        typeId,
        updatedAt: now,
      });

      return {
        id: docRef.id,
        updatedAt: now.toDate(),
      };
    }

    // Get the most recent updatedAt and its document ID
    const sorted = snapshot.docs
      .map(doc => {
        const ts = doc.data()['updatedAt'];
        const updatedAt = ts instanceof Date ? ts : ts.toDate();
        return { id: doc.id, updatedAt };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return sorted[0]; // { id, updatedAt }
  }

  async getProducts(city: string, typeId: string, productUpdates: any, apiService: ApiService): Promise<any[]> {
    // const city = this.selectedOption;
    // const typeId = this.selectedType.id;

    const productsInfo = this.getProductsFromLocal(city, typeId);

    // this.productUpdates = await this.getLastupdate(city, typeId, apiService);

    // console.log("productUpdates2", this.productUpdates);
    // console.log("productsInfo", productsInfo);


    const shouldFetchFromServer = !productsInfo || this.compareDate2(productUpdates.updatedAt, productsInfo.fetchedAt);

    if (shouldFetchFromServer) {
      const q = query(
        collection(apiService.db, "products"),
        where("city", '==', city),
        where("typeId", "==", typeId),
        // orderBy("sortOrder", "asc"),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);

      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data()['name'],
        isSales: doc.data()['isSales'] ?? false,
        deductions: doc.data()['deductions'] ?? [],
        // deductAmount: doc.data()['deductAmount'] ?? 0,
        // deductFromProduct: doc.data()['deductFromProduct'] ?? '',
        sortOrder: doc.data()['sortOrder'] ?? 0, // القيمة الافتراضية 0
        parentProduct: doc.data()['parentProduct'],
        unit: doc.data()['unit'],
        showOn: doc.data()['showOn'] ?? ['*'],
        unitF: doc.data()['unitF'],
        createdAt: doc.data()['createdAt']?.toDate()
      }));

      products.sort((a, b) => {
        // 1. إذا كان كلاهما يملك sortOrder أكبر من 0
        if (a.sortOrder > 0 && b.sortOrder > 0) {
          return a.sortOrder - b.sortOrder;
        }

        // 2. إذا كان أحدهما فقط يملك sortOrder (اجعله في المقدمة)
        if (a.sortOrder > 0 && b.sortOrder === 0) return -1;
        if (a.sortOrder === 0 && b.sortOrder > 0) return 1;

        // 3. إذا كان كلاهما صفر، رتب حسب التاريخ (الأقدم أولاً أو الأحدث حسب رغبتك)
        // هنا الترتيب من الأقدم للأحدث ليحافظ على تسلسل "المنتجات السابقة"
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      this.updateProductInLocal(products, city, typeId);
      console.log("products get from server");
      return products;
    } else {
      console.log("products get from Local");
      return productsInfo.products;
    }
  }

}
