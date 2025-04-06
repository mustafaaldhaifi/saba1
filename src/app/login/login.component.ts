import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

// import { RouterModule, Routes, RouterLink, Route } from '@angular/router';
// import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { environment } from '../../env';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { Router } from '@angular/router';

// import { provideRouter } from '@angular/router';

@Component({
  selector: 'app-root',
  // declarations: [
  //   MainComponent // <----- DON'T FORGET TO DECLARE THIS
  // ],
  imports: [
    CommonModule,
    // RouterModule.forRoot(appRoutes),
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  title = 'saba1';

  email = ""
  password = ""

  selectedOption: any
  options: any = []
  // options = [
  //   "Admin",
  //   "Panaroma",
  //   "Gallary",
  //   "Qasar"
  // ]

  // constructor(private router: Router) {

  //   // Initialize Firebase app with the environment config
  //   // initializeApp(environment.firebaseConfig);
  //   initializeApp(environment.firebase);
  // }
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    initializeApp(environment.firebase);
  }

  // ngOnInit() {
  //  {
  //     // this.setupAuthListener();
  //   }
  // }

  isLoading = false
  isLogin: any


  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {

      if (localStorage.getItem("pass")) {
        this.password = localStorage.getItem("pass")!
      }
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          // If the user is logged in, navigate to dashboard or home page
          console.log('User is logged in:', user);
          // this.router.navigate(['/dashboard']);  // Adjust as needed
          this.isLogin = true
        } else {
          // If the user is not logged in, navigate to login page
          console.log('No user is logged in');
          this.isLogin = false
          await this.getData()
          // this.router.navigate(['/login']);
        }
      });
      this.getData()
    }
    // Check if the user is already logged in on app initialization


  }


  async getData() {
    this.isLoading = true
    try {
      const db = getFirestore();

      // Fetch all collections concurrently
      const [branchesSnapshot] = await Promise.all([
        getDocs(collection(db, "branches")),

      ]);

      this.options = branchesSnapshot.docs.map(doc => {
        return doc.data()['name'];
      });

      this.options.push("Admin")




      // let newData = [];
      // for (let product of this.data) {
      //   for (let branch of this.barnches) {
      //     let exists = this.barnchesOrders.some((order:any) => order.branchId === branch.id && order.productId === product.id);

      //     if (!exists) {
      //       newData.push({ qnt: 0, productId: product.id, branchId: branch.id });
      //     }
      //   }
      // }

      // // Add the new data to barnchesOrders
      // this.barnchesOrders.push(...newData);

      // // Optionally, log the data if needed
      // console.log(this.barnches, this.data, this.barnchesOrders);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
    this.isLoading = false
    // console.log(this.data);

  }
  // Import the functions you need from the SDKs you need
  // import { initializeApp } from "firebase/app";
  // import { getAnalytics } from "firebase/analytics";
  // // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional


  // Initialize Firebase


  login() {
    this.isLoading = true
    const auth = getAuth();

    signInWithEmailAndPassword(auth, this.selectedOption + "@saba321.com", this.password)
      .then((userCredential) => {
        this.isLoading = false
        // Signed in successfully
        const user = userCredential.user;
        console.log('Logged in as:', user);
        this.isLogin = true

        if (user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2") {
          this.router.navigate(['/dashboard']);
        }
        else {
          this.router.navigate(['/branch']);
        }
        localStorage.setItem("pass", this.password)
        // Navigate to a dashboard or another page
        // this.router.navigate(['/dashboard']);  // Adjust based on your routing
      })
      .catch((error) => {
        this.isLoading = false
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(`Login failed: ${errorCode} - ${errorMessage}`);
        alert(`Login failed: ${errorMessage}`);
      });
  }
}
