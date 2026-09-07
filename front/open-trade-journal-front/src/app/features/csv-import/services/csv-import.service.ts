import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environments} from '../../../../environments/environments';
@Injectable({
  providedIn: 'root',
})
export class CsvImportService {

  private apiUrl = environments.apiUrl + '/trades';

  constructor(
    private http: HttpClient
  ) {}

  uploadCsv(file: File): Observable<string> {
    const formData = new FormData();
    formData.append(
      'file',
      file
    );
    return this.http.post(
      this.apiUrl,
      formData,
      {
        responseType: 'text'
      }
    );

  }

}
