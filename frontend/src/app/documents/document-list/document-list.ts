import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DocumentService, DocumentModel, Category, DocumentFilters } from '../../services/document';
import { Auth, User } from '../../services/auth';

@Component({
  selector: 'app-document-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './document-list.html',
  styleUrl: './document-list.css'
})
export class DocumentList implements OnInit, OnDestroy {
  documents: DocumentModel[] = [];
  categories: Category[] = [];
  currentUser: User | null = null;
  loading = false;
  viewMode: 'grid' | 'list' = 'grid';
  totalDocuments = 0;

  filters: DocumentFilters = {
    search: '',
    category: '',
    status: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private documentService: DocumentService,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.loadDocuments();
    this.loadCategories();

    // Subscribe to real-time updates
    this.subscriptions.push(
      this.documentService.documents$.subscribe(documents => {
        this.documents = documents;
      }),
      this.documentService.categories$.subscribe(categories => {
        this.categories = categories;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadDocuments(): void {
    this.loading = true;
    this.documentService.getDocuments(this.filters).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.documents = response.data;
          this.totalDocuments = response.pagination?.total || response.data.length;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading documents:', error);
      }
    });
  }

  loadCategories(): void {
    this.documentService.getCategories().subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1; // Reset to first page
    this.loadDocuments();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      category: '',
      status: '',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.loadDocuments();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  openUploadModal(): void {
    // TODO: Implement upload modal
    console.log('Open upload modal');
  }

  viewDocument(document: DocumentModel): void {
    // TODO: Implement document viewer
    console.log('View document:', document);
  }

  downloadDocument(doc: DocumentModel): void {
    this.documentService.downloadDocument(doc._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = doc.originalName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
      }
    });
  }

  editDocument(document: DocumentModel): void {
    // TODO: Implement edit modal
    console.log('Edit document:', document);
  }

  shareDocument(document: DocumentModel): void {
    // TODO: Implement share functionality
    console.log('Share document:', document);
  }

  approveDocument(document: DocumentModel): void {
    this.documentService.approveDocument(document._id, true).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Document approved successfully');
          this.loadDocuments();
        }
      },
      error: (error) => {
        console.error('Error approving document:', error);
      }
    });
  }

  rejectDocument(document: DocumentModel): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.documentService.approveDocument(document._id, false, reason).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Document rejected successfully');
            this.loadDocuments();
          }
        },
        error: (error) => {
          console.error('Error rejecting document:', error);
        }
      });
    }
  }

  deleteDocument(document: DocumentModel): void {
    if (confirm(`Are you sure you want to delete "${document.title}"?`)) {
      this.documentService.deleteDocument(document._id).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Document deleted successfully');
            this.loadDocuments();
          }
        },
        error: (error) => {
          console.error('Error deleting document:', error);
        }
      });
    }
  }

  exportDocuments(): void {
    // TODO: Implement export functionality
    console.log('Export documents');
  }

  // Permission Checks
  canApprove(document: DocumentModel): boolean {
    return (this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager')
           && document.status === 'pending';
  }

  canReject(document: DocumentModel): boolean {
    return (this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager')
           && document.status === 'pending';
  }

  canEdit(document: DocumentModel): boolean {
    return this.currentUser?.role === 'admin' ||
           document.uploadedBy._id === this.currentUser?._id;
  }

  canDelete(document: DocumentModel): boolean {
    return this.currentUser?.role === 'admin' ||
           document.uploadedBy._id === this.currentUser?._id;
  }

  // Helper Methods
  getFileIcon(mimetype: string): string {
    return this.documentService.getFileIcon(mimetype);
  }

  getStatusColor(status: string): string {
    return this.documentService.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return this.documentService.getStatusIcon(status);
  }

  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }

  // Pagination
  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadDocuments();
  }

  onPageSizeChange(size: number): void {
    this.filters.limit = size;
    this.filters.page = 1;
    this.loadDocuments();
  }

  // Sorting
  onSortChange(field: string): void {
    if (this.filters.sortBy === field) {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = field;
      this.filters.sortOrder = 'asc';
    }
    this.loadDocuments();
  }

  getSortIcon(field: string): string {
    if (this.filters.sortBy !== field) return 'fas fa-sort';
    return this.filters.sortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Bulk Operations
  selectedDocuments: string[] = [];

  toggleDocumentSelection(documentId: string): void {
    const index = this.selectedDocuments.indexOf(documentId);
    if (index > -1) {
      this.selectedDocuments.splice(index, 1);
    } else {
      this.selectedDocuments.push(documentId);
    }
  }

  isDocumentSelected(documentId: string): boolean {
    return this.selectedDocuments.includes(documentId);
  }

  selectAllDocuments(): void {
    this.selectedDocuments = this.documents.map(doc => doc._id);
  }

  clearSelection(): void {
    this.selectedDocuments = [];
  }

  bulkApprove(): void {
    if (this.selectedDocuments.length === 0) return;

    if (confirm(`Approve ${this.selectedDocuments.length} selected documents?`)) {
      // TODO: Implement bulk approve
      console.log('Bulk approve:', this.selectedDocuments);
    }
  }

  bulkReject(): void {
    if (this.selectedDocuments.length === 0) return;

    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      // TODO: Implement bulk reject
      console.log('Bulk reject:', this.selectedDocuments, reason);
    }
  }

  bulkDelete(): void {
    if (this.selectedDocuments.length === 0) return;

    if (confirm(`Delete ${this.selectedDocuments.length} selected documents? This action cannot be undone.`)) {
      this.documentService.bulkDeleteDocuments(this.selectedDocuments).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Documents deleted successfully');
            this.clearSelection();
            this.loadDocuments();
          }
        },
        error: (error) => {
          console.error('Error deleting documents:', error);
        }
      });
    }
  }

  // Pagination Helper Methods
  getTotalPages(): number {
    return Math.ceil(this.totalDocuments / (this.filters.limit || 20));
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.filters.page || 1;
    const pages: number[] = [];

    // Show max 5 page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
