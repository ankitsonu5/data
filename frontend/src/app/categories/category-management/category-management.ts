import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentService, Category } from '../../services/document';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-management.html',
  styleUrls: ['./category-management.css']
})
export class CategoryManagement implements OnInit {
  categories: Category[] = [];
  loading = false;
  showAddModal = false;
  showEditModal = false;
  selectedCategory: Category | null = null;

  categoryForm!: FormGroup;
  editForm!: FormGroup;

  constructor(private docService: DocumentService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      parent: [''],
      allowedFileTypes: [[]],
      maxFileSize: [50, [Validators.min(1)]],
      requiresApproval: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      parent: [''],
      allowedFileTypes: [[]],
      maxFileSize: [50, [Validators.min(1)]],
      requiresApproval: [true]
    });

    this.load();
  }

  load(): void {
    this.loading = true;
    this.docService.getCategories().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) this.categories = res.data;
      },
      error: () => (this.loading = false)
    });
  }

  openAdd(): void { this.showAddModal = true; this.categoryForm.reset({ requiresApproval: true, maxFileSize: 50 }); }
  closeAdd(): void { this.showAddModal = false; this.categoryForm.reset(); }
  openEdit(cat: Category): void { this.selectedCategory = cat; this.showEditModal = true; this.editForm.patchValue(cat as any); }
  closeEdit(): void { this.showEditModal = false; this.selectedCategory = null; this.editForm.reset(); }

  create(): void {
    if (this.categoryForm.invalid) return;
    this.docService.createCategory(this.categoryForm.value).subscribe({
      next: (res) => { if (res.success) { this.closeAdd(); this.load(); } }
    });
  }

  update(): void {
    if (!this.selectedCategory || this.editForm.invalid) return;
    this.docService.updateCategory(this.selectedCategory._id, this.editForm.value).subscribe({
      next: (res) => { if (res.success) { this.closeEdit(); this.load(); } }
    });
  }

  remove(cat: Category): void {
    if (!confirm(`Delete category ${cat.name}?`)) return;
    this.docService.deleteCategory(cat._id).subscribe({
      next: (res) => { if (res.success) { this.load(); } }
    });
  }
}

