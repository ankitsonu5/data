import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Auth, User } from '../services/auth';
import { DocumentService, DocumentModel, Category } from '../services/document';
import { UserService } from '../services/user.service';
import { UserManagement } from '../users/user-management/user-management';
import { DocumentList } from '../documents/document-list/document-list';
import { DocumentUpload } from '../documents/document-upload/document-upload';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, UserManagement, DocumentList, DocumentUpload],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  currentUser: User | null = null;
  activeTab: string = 'dashboard';
  notificationCount: number = 3;
  mobileMenuOpen: boolean = false;

  // Real-time data
  documents: DocumentModel[] = [];
  categories: Category[] = [];
  users: any[] = [];

  stats = {
    totalDocuments: 0,
    pendingDocuments: 0,
    totalCategories: 0,
    totalUsers: 0
  };

  private subscriptions: Subscription[] = [];

  recentActivity: any[] = [
    {
      action: 'upload',
      description: 'New document uploaded: Test Document.pdf',
      timestamp: new Date()
    },
    {
      action: 'approve',
      description: 'Document approved: Project Proposal.docx',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      action: 'download',
      description: 'Document downloaded: User Manual.pdf',
      timestamp: new Date(Date.now() - 7200000)
    }
  ];

  constructor(
    private authService: Auth,
    private documentService: DocumentService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to current user
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Check for tab parameter in URL
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    // Load real-time data
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.mobileMenuOpen = false; // Close mobile menu when tab is selected
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  quickUpload(): void {
    this.setActiveTab('upload');
  }

  quickSearch(): void {
    // TODO: Implement quick search modal
    console.log('Quick search');
  }

  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActiveUsersToday(): number {
    return Math.floor(this.stats.totalUsers * 0.7); // Mock: 70% of users active today
  }

  viewPendingDocuments(): void {
    // TODO: Filter documents by pending status
    this.setActiveTab('documents');
  }

  viewAllActivity(): void {
    // TODO: Show activity modal or navigate to activity page
    console.log('View all activity');
  }

  createCategory(): void {
    // TODO: Show create category modal
    console.log('Create category');
  }

  generateReport(): void {
    // TODO: Show report generation modal
    console.log('Generate report');
  }

  viewSettings(): void {
    // TODO: Show settings modal
    console.log('View settings');
  }

  createUser(): void {
    // TODO: Show create user modal
    console.log('Create user');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getUserIcon(role?: string): string {
    const icons: { [key: string]: string } = {
      'admin': 'fas fa-crown',
      'manager': 'fas fa-user-tie',
      'user': 'fas fa-user'
    };
    return icons[role || 'user'] || 'fas fa-user';
  }

  showNotifications(): void {
    // TODO: Implement notifications modal
    console.log('Show notifications');
  }

  showProfile(): void {
    // TODO: Implement profile modal
    console.log('Show profile');
  }

  getActivityIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'upload': 'fas fa-upload',
      'download': 'fas fa-download',
      'approve': 'fas fa-check-circle',
      'reject': 'fas fa-times-circle',
      'delete': 'fas fa-trash',
      'update': 'fas fa-edit'
    };
    return icons[action] || 'fas fa-file-alt';
  }

  private loadDashboardData(): void {
    // Load documents
    this.documentService.getDocuments({ limit: 50 }).subscribe({
      next: (response) => {
        if (response.success) {
          this.documents = response.data;
          this.updateStats();
        }
      },
      error: (error) => {
        console.error('Error loading documents:', error);
      }
    });

    // Load categories
    this.documentService.getCategories().subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data;
          this.updateStats();
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });

    // Load users (admin only)
    if (this.currentUser?.role === 'admin') {
      this.userService.getUsers({ limit: 100 }).subscribe({
        next: (response) => {
          if (response.success) {
            this.users = response.data;
            this.updateStats();
          }
        },
        error: (error) => {
          console.error('Error loading users:', error);
        }
      });
    }
  }

  private setupRealTimeUpdates(): void {
    // Subscribe to real-time document updates
    this.subscriptions.push(
      this.documentService.documents$.subscribe(documents => {
        this.documents = documents;
        this.updateStats();
        this.updateRecentActivity();
      })
    );

    // Subscribe to real-time category updates
    this.subscriptions.push(
      this.documentService.categories$.subscribe(categories => {
        this.categories = categories;
        this.updateStats();
      })
    );

    // Subscribe to real-time user updates (admin only)
    if (this.currentUser?.role === 'admin') {
      this.subscriptions.push(
        this.userService.users$.subscribe(users => {
          this.users = users;
          this.updateStats();
        })
      );
    }
  }

  private updateStats(): void {
    this.stats = {
      totalDocuments: this.documents.length,
      pendingDocuments: this.documents.filter(doc => doc.status === 'pending').length,
      totalCategories: this.categories.length,
      totalUsers: this.users.length
    };
  }

  private updateRecentActivity(): void {
    // Generate recent activity from documents
    const recentDocs = this.documents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    this.recentActivity = recentDocs.map(doc => ({
      action: 'upload',
      description: `New document uploaded: ${doc.title}`,
      timestamp: new Date(doc.createdAt),
      user: doc.uploadedBy.name,
      document: doc
    }));

    // Add approval activities
    const approvedDocs = this.documents
      .filter(doc => doc.status === 'approved' && doc.approvedAt)
      .sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime())
      .slice(0, 3);

    approvedDocs.forEach(doc => {
      this.recentActivity.push({
        action: 'approve',
        description: `Document approved: ${doc.title}`,
        timestamp: new Date(doc.approvedAt!),
        user: doc.approvedBy?.name || 'System',
        document: doc
      });
    });

    // Sort by timestamp
    this.recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.recentActivity = this.recentActivity.slice(0, 10);
  }
}
