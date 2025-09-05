import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService, User as UserModel, UserFilters } from '../../services/user.service';
import { Auth, User } from '../../services/auth';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagement implements OnInit, OnDestroy {
  users: UserModel[] = [];
  currentUser: User | null = null;
  loading = false;
  showAddModal = false;
  showEditModal = false;
  selectedUser: UserModel | null = null;

  userForm!: FormGroup;
  editForm!: FormGroup;

  filters: UserFilters = {
    search: '',
    role: '',
    department: '',
    status: 'active',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  totalUsers = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private userService: UserService,
    private authService: Auth,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.initializeForms();
    this.loadUsers();

    // Subscribe to real-time updates
    this.subscriptions.push(
      this.userService.users$.subscribe(users => {
        this.users = users;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeForms(): void {
    this.userForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', [Validators.required]],
      department: [''],
      phone: [''],
      status: ['active', [Validators.required]]
    });

    this.editForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      department: [''],
      phone: [''],
      status: ['', [Validators.required]]
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers(this.filters).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.users = response.data;
          this.totalUsers = response.pagination?.total || response.data.length;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading users:', error);
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      role: '',
      department: '',
      status: 'active',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.loadUsers();
  }

  // Add User Modal
  openAddModal(): void {
    this.showAddModal = true;
    this.userForm.reset({
      role: 'user',
      status: 'active'
    });
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.userForm.reset();
  }

  onAddUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    const userData = this.userForm.value;
    this.userService.createUser(userData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('User created successfully');
          this.closeAddModal();
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error creating user:', error);
      }
    });
  }

  // Edit User Modal
  openEditModal(user: UserModel): void {
    this.selectedUser = user;
    this.showEditModal = true;
    this.editForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || '',
      status: user.status
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editForm.reset();
  }

  onEditUser(): void {
    if (this.editForm.invalid || !this.selectedUser) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    const userData = this.editForm.value;
    this.userService.updateUser(this.selectedUser._id, userData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('User updated successfully');
          this.closeEditModal();
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error updating user:', error);
      }
    });
  }

  // User Actions
  toggleUserStatus(user: UserModel): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      this.userService.updateUser(user._id, { status: newStatus }).subscribe({
        next: (response) => {
          if (response.success) {
            console.log(`User ${action}d successfully`);
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error(`Error ${action}ing user:`, error);
        }
      });
    }
  }

  deleteUser(user: UserModel): void {
    if (user._id === this.currentUser?._id) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      this.userService.deleteUser(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('User deleted successfully');
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  resetPassword(user: UserModel): void {
    if (confirm(`Reset password for ${user.name}? A new temporary password will be generated.`)) {
      this.userService.resetPassword(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            alert(`Password reset successfully. New password: ${response.data.tempPassword}`);
          }
        },
        error: (error) => {
          console.error('Error resetting password:', error);
        }
      });
    }
  }

  // Helper Methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  canEditUser(user: UserModel): boolean {
    return this.currentUser?.role === 'admin' ||
           (this.currentUser?.role === 'manager' && user.role === 'user');
  }

  canDeleteUser(user: UserModel): boolean {
    return this.currentUser?.role === 'admin' && user._id !== this.currentUser._id;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'manager': return 'badge-warning';
      case 'user': return 'badge-primary';
      default: return 'badge-secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    return status === 'active' ? 'badge-success' : 'badge-secondary';
  }

  // Pagination
  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadUsers();
  }

  getTotalPages(): number {
    return Math.ceil(this.totalUsers / (this.filters.limit || 20));
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.filters.page || 1;
    const pages: number[] = [];

    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Sorting
  onSortChange(field: string): void {
    if (this.filters.sortBy === field) {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = field;
      this.filters.sortOrder = 'asc';
    }
    this.loadUsers();
  }

  getSortIcon(field: string): string {
    if (this.filters.sortBy !== field) return 'fas fa-sort';
    return this.filters.sortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }
}
