import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlaybookDto, PageResponse, PlaybookPerformance } from '../models/playbook.model';
import { environments } from '../../../../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class PlaybookService {
  private http = inject(HttpClient);
  private apiUrl = environments.apiUrl + '/playbooks';

  create(playbook: PlaybookDto): Observable<PlaybookDto> {
    return this.http.post<PlaybookDto>(this.apiUrl, playbook);
  }

  findAll(
    page: number = 0,
    size: number = 10,
    sort: string = 'id',
    direction: 'asc' | 'desc' = 'asc',
  ): Observable<PageResponse<PlaybookDto>> {
    const params = {
      page: page.toString(),
      size: size.toString(),
      sort: `${sort},${direction}`,
    };

    return this.http.get<PageResponse<PlaybookDto>>(this.apiUrl, { params });
  }

  findById(id: number): Observable<PlaybookDto> {
    return this.http.get<PlaybookDto>(`${this.apiUrl}/${id}`);
  }

  update(id: number, playbook: PlaybookDto): Observable<PlaybookDto> {
    return this.http.put<PlaybookDto>(`${this.apiUrl}/${id}`, playbook);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getPerformance(): Observable<PlaybookPerformance[]> {
    return this.http.get<PlaybookPerformance[]>(
      `${environments.apiUrl}/playbooks/trades/analytics/playbooks`,
    );
  }

  findDefaultPlaybooks(page = 0, size = 100): Observable<PageResponse<PlaybookDto>> {
    const params = {
      page: page.toString(),
      size: size.toString(),
    };
    return this.http.get<PageResponse<PlaybookDto>>(`${this.apiUrl}/defaults`, { params });
  }
}
