import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
  phone?: string;
  status: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'user';
  department?: string;
  phone?: string;
  status?: string;
  isActive?: boolean;
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
export class UserService {
  private apiUrl = '/api/users';
  private usersSubject = new BehaviorSubject<User[]>([]);

  public users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {}

  // User CRUD Operations
  getUsers(filters?: UserFilters): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this.usersSubject.next(response.data);
          }
        })
      );
  }

  getUser(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

  createUser(userData: CreateUserData): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}`, userData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshUsers();
          }
        })
      );
  }

  updateUser(id: string, userData: UpdateUserData): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, userData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshUsers();
          }
        })
      );
  }

  deleteUser(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshUsers();
          }
        })
      );
  }

  resetPassword(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/reset-password`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshUsers();
          }
        })
      );
  }

  // User Activity
  getUserActivity(id: string, filters?: any): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/${id}/activity`, { params });
  }

  // Utility Methods
  private refreshUsers(): void {
    this.getUsers().subscribe();
  }

  getCurrentUsers(): User[] {
    return this.usersSubject.value;
  }

  // Helper Methods
  getRoleIcon(role: string): string {
    const iconMap: { [key: string]: string } = {
      'admin': 'fas fa-crown',
      'manager': 'fas fa-user-tie',
      'user': 'fas fa-user'
    };
    return iconMap[role] || 'fas fa-user';
  }

  getRoleColor(role: string): string {
    const colorMap: { [key: string]: string } = {
      'admin': 'success',
      'manager': 'warning',
      'user': 'primary'
    };
    return colorMap[role] || 'secondary';
  }

  getStatusIcon(isActive: boolean): string {
    return isActive ? 'fas fa-check-circle' : 'fas fa-times-circle';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  // Bulk Operations
  bulkUpdateUsers(ids: string[], data: UpdateUserData): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/bulk`, {
      ids,
      data
    }).pipe(
      tap(response => {
        if (response.success) {
          this.refreshUsers();
        }
      })
    );
  }

  bulkDeleteUsers(ids: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/bulk`, {
      body: { ids }
    }).pipe(
      tap(response => {
        if (response.success) {
          this.refreshUsers();
        }
      })
    );
  }

  // Search and Filter
  searchUsers(query: string): Observable<ApiResponse<User[]>> {
    return this.getUsers({ search: query });
  }

  filterUsersByRole(role: string): Observable<ApiResponse<User[]>> {
    return this.getUsers({ role });
  }

  filterUsersByDepartment(department: string): Observable<ApiResponse<User[]>> {
    return this.getUsers({ department });
  }

  // Statistics
  getUserStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/stats`);
  }
}
