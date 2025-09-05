import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DocumentService, Category } from '../../services/document';
import { Auth, User } from '../../services/auth';

@Component({
  selector: 'app-document-upload',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-upload.html',
  styleUrl: './document-upload.css'
})
export class DocumentUpload implements OnInit, OnDestroy {
  uploadForm!: FormGroup;
  selectedFiles: File[] = [];
  categories: Category[] = [];
  currentUser: User | null = null;

  uploading = false;
  uploadProgress = 0;
  isDragOver = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private documentService: DocumentService,
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.initializeForm();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeForm(): void {
    this.uploadForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      description: [''],
      category: ['', [Validators.required]],
      tags: [''],
      department: ['']
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

  // File Selection Methods
  onFileSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.addFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []) as File[];
    this.addFiles(files);
  }

  addFiles(files: File[]): void {
    const validFiles = files.filter(file => this.isValidFile(file));
    this.selectedFiles = [...this.selectedFiles, ...validFiles];

    // Auto-fill title if only one file
    if (this.selectedFiles.length === 1 && !this.uploadForm.get('title')?.value) {
      const fileName = this.selectedFiles[0].name;
      const titleWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      this.uploadForm.patchValue({ title: titleWithoutExtension });
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);

    // Clear title if no files left
    if (this.selectedFiles.length === 0) {
      this.uploadForm.patchValue({ title: '' });
    }
  }

  isValidFile(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      alert(`File type ${file.type} is not supported`);
      return false;
    }

    if (file.size > maxSize) {
      alert(`File ${file.name} is too large. Maximum size is 10MB`);
      return false;
    }

    return true;
  }

  // Form Submission
  onSubmit(): void {
    if (this.uploadForm.invalid || this.selectedFiles.length === 0) {
      this.markFormGroupTouched();
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();

    // Add form fields
    formData.append('title', this.uploadForm.get('title')?.value);
    formData.append('description', this.uploadForm.get('description')?.value || '');
    formData.append('category', this.uploadForm.get('category')?.value);
    formData.append('department', this.uploadForm.get('department')?.value || '');

    // Add tags
    const tags = this.uploadForm.get('tags')?.value;
    if (tags) {
      const tagArray = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      tagArray.forEach((tag: string) => formData.append('tags', tag));
    }

    // Add files
    this.selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    this.documentService.uploadDocument(formData).subscribe({
      next: (response) => {
        this.uploading = false;
        this.uploadProgress = 100;

        if (response.success) {
          alert('Documents uploaded successfully!');
          this.clearForm();
          this.router.navigate(['/dashboard'], { queryParams: { tab: 'documents' } });
        }
      },
      error: (error) => {
        this.uploading = false;
        this.uploadProgress = 0;
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
      }
    });
  }

  // Helper Methods
  clearForm(): void {
    this.selectedFiles = [];
    this.uploadForm.reset();
    this.uploading = false;
    this.uploadProgress = 0;
  }

  goToDocuments(): void {
    this.router.navigate(['/dashboard'], { queryParams: { tab: 'documents' } });
  }

  getFileIcon(mimetype: string): string {
    return this.documentService.getFileIcon(mimetype);
  }

  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.uploadForm.controls).forEach(key => {
      const control = this.uploadForm.get(key);
      control?.markAsTouched();
    });
  }

  // Validation Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.uploadForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.uploadForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
    }
    return '';
  }

  // File Type Validation
  getAllowedFileTypes(): string[] {
    return [
      'PDF Documents (.pdf)',
      'Word Documents (.doc, .docx)',
      'Excel Spreadsheets (.xls, .xlsx)',
      'PowerPoint Presentations (.ppt, .pptx)',
      'Text Files (.txt)',
      'Images (.jpg, .jpeg, .png, .gif)'
    ];
  }

  getMaxFileSize(): string {
    return '10 MB';
  }

  // Progress Tracking
  updateProgress(progress: number): void {
    this.uploadProgress = Math.round(progress);
  }

  // Category Helpers
  getCategoryById(id: string): Category | undefined {
    return this.categories.find(cat => cat._id === id);
  }

  getCategoryRequiresApproval(): boolean {
    const categoryId = this.uploadForm.get('category')?.value;
    const category = this.getCategoryById(categoryId);
    return category?.requiresApproval || false;
  }

  // File Preview
  canPreviewFile(file: File): boolean {
    const previewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    return previewableTypes.includes(file.type);
  }

  getFilePreviewUrl(file: File): string {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return '';
  }

  // Bulk Upload Helpers
  getTotalFileSize(): number {
    return this.selectedFiles.reduce((total, file) => total + file.size, 0);
  }

  getFileCount(): number {
    return this.selectedFiles.length;
  }

  hasLargeFiles(): boolean {
    const largeFileThreshold = 5 * 1024 * 1024; // 5MB
    return this.selectedFiles.some(file => file.size > largeFileThreshold);
  }

  // Auto-suggestions
  suggestTags(): string[] {
    const commonTags = ['document', 'report', 'presentation', 'spreadsheet', 'image', 'contract', 'invoice', 'manual'];
    const fileTypes = this.selectedFiles.map(file => {
      if (file.type.includes('pdf')) return 'pdf';
      if (file.type.includes('word')) return 'document';
      if (file.type.includes('excel')) return 'spreadsheet';
      if (file.type.includes('powerpoint')) return 'presentation';
      if (file.type.includes('image')) return 'image';
      return 'file';
    });

    return [...new Set([...commonTags, ...fileTypes])];
  }

  addSuggestedTag(tag: string): void {
    const currentTags = this.uploadForm.get('tags')?.value || '';
    const tagArray = currentTags.split(',').map((t: string) => t.trim()).filter((t: string) => t);

    if (!tagArray.includes(tag)) {
      tagArray.push(tag);
      this.uploadForm.patchValue({ tags: tagArray.join(', ') });
    }
  }
}
