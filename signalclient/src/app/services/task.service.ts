import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from './settings.service';
import { ErrorService } from './error.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private _http: HttpClient,
    private _settings: SettingsService,
    private _error: ErrorService) { }

  public startJob(): Observable<any> {
    const url = `${this._settings.apiBaseUrl}task/lengthy`;

    return this._http.get<any>(url)
      .pipe(catchError(this._error.handleError));
  }
}
