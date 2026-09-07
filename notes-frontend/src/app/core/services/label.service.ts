import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LabelDto } from '../../shared/models/label.model';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/labels`;

  private labelsSignal = signal<LabelDto[]>([]);
  public labels = this.labelsSignal.asReadonly();

  loadLabels() {
    return this.http.get<LabelDto[]>(this.apiUrl).pipe(
      tap(labels => this.labelsSignal.set(labels))
    );
  }

  createLabel(name: string) {
    return this.http.post<LabelDto>(this.apiUrl, { name }).pipe(
      tap(label => this.labelsSignal.update(labels => [...labels, label].sort((a, b) => a.name.localeCompare(b.name))))
    );
  }

  updateLabel(id: string, name: string) {
    return this.http.put(`${this.apiUrl}/${id}`, { id, name }).pipe(
      tap(() => {
        this.labelsSignal.update(labels => {
          const index = labels.findIndex(l => l.id === id);
          if (index !== -1) {
            labels[index] = { ...labels[index], name };
          }
          return [...labels].sort((a, b) => a.name.localeCompare(b.name));
        });
      })
    );
  }

  deleteLabel(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.labelsSignal.update(labels => labels.filter(l => l.id !== id)))
    );
  }
}
