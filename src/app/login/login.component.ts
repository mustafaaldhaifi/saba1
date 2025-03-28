import { Component } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

// import { RouterModule, Routes, RouterLink, Route } from '@angular/router';
// import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { environment } from '../../env';
import { CommonModule } from '@angular/common';

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
  options = [
    "Admin",
    "Panaroma",
    "Gallary",
    "Qasar"
  ]

  constructor() {

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
        // If the user is logged in, navigate to dashboard or home page
        console.log('User is logged in:', user);
        // this.router.navigate(['/dashboard']);  // Adjust as needed
        this.isLogin = true
      } else {
        // If the user is not logged in, navigate to login page
        console.log('No user is logged in');
        this.isLogin = false
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


  login() {
    const auth = getAuth();

    signInWithEmailAndPassword(auth, this.selectedOption + "@saba321.com", this.password)
      .then((userCredential) => {
        // Signed in successfully
        const user = userCredential.user;
        console.log('Logged in as:', user);
        this.isLogin = true
        // Navigate to a dashboard or another page
        // this.router.navigate(['/dashboard']);  // Adjust based on your routing
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(`Login failed: ${errorCode} - ${errorMessage}`);
        alert(`Login failed: ${errorMessage}`);
      });
  }
}
