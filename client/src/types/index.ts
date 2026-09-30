export type Role = 'ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'DISABLED';
export type AccessLevel = 'VIEW' | 'EDIT' | 'MANAGE';
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED' | 'ON_HOLD';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  title?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  owner: User;
  members: User[];
  status: ProjectStatus;
  priority: Priority;
  deadline?: string;
  progress: number;
  taskCount?: number;
  doneTaskCount?: number;
  pageCount?: number;
  createdBy?: User;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  _id: string;
  name: string;
  parentId?: string | null;
  projectId?: string | null;
  createdBy: User;
  pageCount?: number;
  tableCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  _id: string;
  title: string;
  content: string;
  folderId?: string | Folder | null;
  projectId?: string | Project | null;
  createdBy: User;
  updatedBy: User;
  isPinned: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageRevision {
  _id: string;
  pageId: string;
  version: number;
  title: string;
  content: string;
  editedBy: User;
  changeSummary: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  projectId: string | { _id: string; name: string };
  assignedTo?: User | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  order: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface TableColumn {
  key: string;
  name: string;
  type: 'text' | 'number' | 'status' | 'date' | 'email' | 'phone';
}

export interface DataTable {
  _id: string;
  name: string;
  folderId?: string | null;
  projectId?: string | null;
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  createdBy: User;
  updatedBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  actor: User;
  action: string;
  resourceType: 'PROJECT' | 'FOLDER' | 'PAGE' | 'TASK' | 'USER' | 'PERMISSION' | 'WORKSPACE';
  resourceId?: string;
  resourceTitle: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender?: User;
  type: 'TASK_ASSIGNED' | 'PROJECT_ADDED' | 'FOLDER_ACCESS' | 'PAGE_EDITED' | 'PERMISSION_CHANGED' | 'SYSTEM';
  message: string;
  resourceType?: string;
  resourceId?: string;
  read: boolean;
  createdAt: string;
}

export interface Permission {
  _id: string;
  userId: string;
  resourceType: 'PROJECT' | 'FOLDER';
  resourceId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  createdAt: string;
}
