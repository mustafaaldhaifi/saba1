// import { Component } from '@angular/core';
// import { initializeApp } from 'firebase/app';
// import { getAuth, onAuthStateChanged } from 'firebase/auth';

// import { RouterModule, Router } from '@angular/router';
// import { environment } from '../env';

// // import { provideRouter } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   // declarations: [
//   //   MainComponent // <----- DON'T FORGET TO DECLARE THIS
//   // ],
//   imports: [
//     RouterModule,
//     // BrowserModule,
//     // // RouterModule.forRoot(appRoutes),
//     // FormsModule 
//   ],
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.css'
// })
// export class AppComponent {

//   title = 'saba1';

//   email = ""
//   password = ""

//   constructor(private router: Router) {

//     // Initialize Firebase app with the environment config
//     // initializeApp(environment.firebaseConfig);
//     initializeApp(environment.firebase);
//   }

//   isLogin: any
//   ngOnInit() {
//     // Check if the user is already logged in on app initialization
//     const auth = getAuth();
//     onAuthStateChanged(auth, (user) => {
//       if (user) {
//         if (user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2") {
//           setTimeout(() => {
//             this.router.navigate(['/dashboard']);
//           }, 0);
//           // this.router.navigate(['/dashboard']);
//         }
//         else{
//           setTimeout(() => {
//             this.router.navigate(['/branch']);
//           }, 0);

//           // this.router.navigate(['/branch']);
//         }

//         // If the user is logged in, navigate to dashboard or home page
//         console.log('User is logged in:', user);
//         // this.router.navigate(['/dashboard']);  // Adjust as needed
//         this.isLogin = true
//       } else {
//         // If the user is not logged in, navigate to login page
//         console.log('No user is logged in');
//         this.isLogin = false

//         setTimeout(() => {
//           this.router.navigate(['/login']);
//         }, 0);

//         // this.router.navigate(['/login']);
//         // this.router.navigate(['/login']);
//       }
//     });
//   }
//   // Import the functions you need from the SDKs you need
//   // import { initializeApp } from "firebase/app";
//   // import { getAnalytics } from "firebase/analytics";
//   // // TODO: Add SDKs for Firebase products that you want to use
//   // https://firebase.google.com/docs/web/setup#available-libraries

//   // Your web app's Firebase configuration
//   // For Firebase JS SDK v7.20.0 and later, measurementId is optional


//   // Initialize Firebase
// }


import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../env';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'saba1';
  email = "";
  password = "";
  isLogin: boolean | null = null;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    initializeApp(environment.firebase);
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupAuthListener();
    }
  }

  private setupAuthListener(): void {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.isLogin = true;
        const targetRoute = user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2"
          ? '/dashboard'
          : '/branch';
        this.router.navigate([targetRoute]);
      } else {
        this.isLogin = false;
        this.router.navigate(['/login']);
      }
    });
  }
}