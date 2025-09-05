import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface DocumentModel {
  _id: string;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  tags: string[];
  department?: string;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: Date;
  rejectionReason?: string;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  requiresApproval: boolean;
  permissions: {
    upload: string[];
    view: string[];
    manage: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentFilters {
  search?: string;
  category?: string;
  status?: string;
  uploadedBy?: string;
  department?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = '/api';
  private documentsSubject = new BehaviorSubject<DocumentModel[]>([]);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

  public documents$ = this.documentsSubject.asObservable();
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCategories();
  }

  // Document CRUD Operations
  getDocuments(filters?: DocumentFilters): Observable<ApiResponse<DocumentModel[]>> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params = params.append(key, v));
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<ApiResponse<DocumentModel[]>>(`${this.apiUrl}/documents`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this.documentsSubject.next(response.data);
          }
        })
      );
  }

  getDocument(id: string): Observable<ApiResponse<DocumentModel>> {
    return this.http.get<ApiResponse<DocumentModel>>(`${this.apiUrl}/documents/${id}`);
  }

  uploadDocument(formData: FormData): Observable<ApiResponse<DocumentModel>> {
    return this.http.post<ApiResponse<DocumentModel>>(`${this.apiUrl}/documents`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshDocuments();
          }
        })
      );
  }

  updateDocument(id: string, data: Partial<DocumentModel>): Observable<ApiResponse<DocumentModel>> {
    return this.http.put<ApiResponse<DocumentModel>>(`${this.apiUrl}/documents/${id}`, data)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshDocuments();
          }
        })
      );
  }

  deleteDocument(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/documents/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshDocuments();
          }
        })
      );
  }

  downloadDocument(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${id}/download`, {
      responseType: 'blob'
    });
  }

  approveDocument(id: string, approved: boolean, reason?: string): Observable<ApiResponse<DocumentModel>> {
    return this.http.put<ApiResponse<DocumentModel>>(`${this.apiUrl}/documents/${id}/approval`, {
      approved,
      reason
    }).pipe(
      tap(response => {
        if (response.success) {
          this.refreshDocuments();
        }
      })
    );
  }

  // Category CRUD Operations
  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/categories`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.categoriesSubject.next(response.data);
          }
        })
      );
  }

  getCategory(id: string): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/categories/${id}`);
  }

  createCategory(data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(`${this.apiUrl}/categories`, data)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadCategories();
          }
        })
      );
  }

  updateCategory(id: string, data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.put<ApiResponse<Category>>(`${this.apiUrl}/categories/${id}`, data)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadCategories();
          }
        })
      );
  }

  deleteCategory(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/categories/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadCategories();
          }
        })
      );
  }

  // Utility Methods
  private refreshDocuments(): void {
    this.getDocuments().subscribe();
  }

  private loadCategories(): void {
    this.getCategories().subscribe();
  }

  // Helper Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimetype: string): string {
    const iconMap: { [key: string]: string } = {
      'application/pdf': 'fas fa-file-pdf',
      'application/msword': 'fas fa-file-word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word',
      'application/vnd.ms-excel': 'fas fa-file-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel',
      'application/vnd.ms-powerpoint': 'fas fa-file-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fas fa-file-powerpoint',
      'text/plain': 'fas fa-file-alt',
      'text/csv': 'fas fa-file-csv',
      'application/zip': 'fas fa-file-archive',
      'application/x-rar-compressed': 'fas fa-file-archive',
      'image/jpeg': 'fas fa-file-image',
      'image/png': 'fas fa-file-image',
      'image/gif': 'fas fa-file-image',
      'image/svg+xml': 'fas fa-file-image',
      'video/mp4': 'fas fa-file-video',
      'video/avi': 'fas fa-file-video',
      'audio/mp3': 'fas fa-file-audio',
      'audio/wav': 'fas fa-file-audio'
    };
    return iconMap[mimetype] || 'fas fa-file';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'draft': 'secondary',
      'pending': 'warning',
      'approved': 'success',
      'rejected': 'danger',
      'archived': 'dark'
    };
    return colorMap[status] || 'secondary';
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'draft': 'fas fa-edit',
      'pending': 'fas fa-clock',
      'approved': 'fas fa-check-circle',
      'rejected': 'fas fa-times-circle',
      'archived': 'fas fa-archive'
    };
    return iconMap[status] || 'fas fa-file';
  }

  // Search and Filter Helpers
  buildSearchQuery(filters: DocumentFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value.toString());
        }
      }
    });
    return params.toString();
  }

  // Real-time Updates
  getCurrentDocuments(): DocumentModel[] {
    return this.documentsSubject.value;
  }

  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  // Bulk Operations
  bulkUpdateDocuments(ids: string[], data: Partial<DocumentModel>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/documents/bulk`, {
      ids,
      data
    }).pipe(
      tap(response => {
        if (response.success) {
          this.refreshDocuments();
        }
      })
    );
  }

  bulkDeleteDocuments(ids: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/documents/bulk`, {
      body: { ids }
    }).pipe(
      tap(response => {
        if (response.success) {
          this.refreshDocuments();
        }
      })
    );
  }
}
