import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterModule],
  templateUrl: './app.component.html', styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'saba1';
  // Start one shared session listener. Guards handle initial navigation.
  constructor(readonly auth: AuthService) {}
}
