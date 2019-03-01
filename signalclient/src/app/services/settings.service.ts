import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public apiBaseUrl: string;

  constructor() {
    if (environment.production) {
      this.apiBaseUrl = 'https://notexisting.azurewebsites.net/api/';
    } else {
      this.apiBaseUrl = 'https://localhost:44348/api/';
    }
  }
}
