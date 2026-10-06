import { Injectable } from '@angular/core';
import { collection, onSnapshot } from 'firebase/firestore';
import { ApiService } from '../api.service'; // استورد خدمة الـ API الخاصة بك
import { Observable } from 'rxjs';

export interface ColumnConstraint {
  id?: string;
  action: 'lock' | 'default_value';
  dates?: string[];
  branchIds?: string[];
  itemIds?: string[];
  items?: Array<{
    itemId: string;
    columns: {
      [colName: string]: { qnt: number; enabled: boolean };
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ColumnConstraintsService {
  constructor(private apiService: ApiService) {}

  // جلب كافة القيود بشكل لحظي Realtime
  getConstraints(): Observable<ColumnConstraint[]> {
    return new Observable((observer) => {
      // نستخدم db الموجودة في apiService تماماً كما فعلت في getSettings()
      const colRef = collection(this.apiService.db, 'column_constraints');

      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as ColumnConstraint[];

          observer.next(data);
        },
        (error) => {
          console.error('Error fetching column_constraints:', error);
          observer.error(error);
        }
      );

      // إلغاء الاشتراك عند التدمير لمنع تسريب الذاكرة
      return () => unsubscribe();
    });
  }
}