import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Dashboard } from './dashboard/dashboard';
import { DocumentList } from './documents/document-list/document-list';
import { DocumentUpload } from './documents/document-upload/document-upload';
import { UserManagement } from './users/user-management/user-management';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'documents', component: DocumentList },
  { path: 'upload', component: DocumentUpload },
  { path: 'users', component: UserManagement },
  { path: '**', redirectTo: '/login' }
];
