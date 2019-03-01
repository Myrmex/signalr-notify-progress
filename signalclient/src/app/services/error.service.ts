import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

// https://angular.io/guide/http

/**
 * Error handler for services. To use this in your service, pipe a catchError
 * operator with its argument equal to the handleError method of this service.
 * Note: pipe this method after retry, if using it.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  /**
   * Handle the specified error response.
   * @param error The error response.
   */
  public handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('A client-side or network error occurred: ', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  }
}
