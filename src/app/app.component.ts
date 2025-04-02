import { Component } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { RouterModule, Router } from '@angular/router';
import { environment } from '../env';

// import { provideRouter } from '@angular/router';

@Component({
  selector: 'app-root',
  // declarations: [
  //   MainComponent // <----- DON'T FORGET TO DECLARE THIS
  // ],
  imports: [
    RouterModule,
    // BrowserModule,
    // // RouterModule.forRoot(appRoutes),
    // FormsModule 
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  title = 'saba1';

  email = ""
  password = ""

  constructor(private router: Router) {

    // Initialize Firebase app with the environment config
    // initializeApp(environment.firebaseConfig);
    initializeApp(environment.firebase);
  }

  isLogin: any
  ngOnInit() {
    // Check if the user is already logged in on app initialization
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.uid === "z8B2PHGNnaRIRCqEsvesvE5IeAL2") {
          this.router.navigate(['/dashboard']);
        }
        else{
          this.router.navigate(['/branch']);
        }
        
        // If the user is logged in, navigate to dashboard or home page
        console.log('User is logged in:', user);
        // this.router.navigate(['/dashboard']);  // Adjust as needed
        this.isLogin = true
      } else {
        // If the user is not logged in, navigate to login page
        console.log('No user is logged in');
        this.isLogin = false
        this.router.navigate(['/login']);
        // this.router.navigate(['/login']);
      }
    });
  }
  // Import the functions you need from the SDKs you need
  // import { initializeApp } from "firebase/app";
  // import { getAnalytics } from "firebase/analytics";
  // // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional


  // Initialize Firebase
}
