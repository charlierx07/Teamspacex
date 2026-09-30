import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Project } from '../models/Project.js';
import { Folder } from '../models/Folder.js';
import { Page } from '../models/Page.js';
import { PageRevision } from '../models/PageRevision.js';
import { Task } from '../models/Task.js';
import { DataTable } from '../models/DataTable.js';
import { Permission } from '../models/Permission.js';
import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_MEMBER_PASSWORD, ROLES, USER_STATUS } from '../config/constants.js';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting generic Teamspace database seeding...');
    await connectDB();

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Workspace.deleteMany({}),
      Project.deleteMany({}),
      Folder.deleteMany({}),
      Page.deleteMany({}),
      PageRevision.deleteMany({}),
      Task.deleteMany({}),
      DataTable.deleteMany({}),
      Permission.deleteMany({}),
      Activity.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('✓ Cleared database collections');

    const adminPass = ADMIN_PASSWORD;
    const memberPass = DEFAULT_MEMBER_PASSWORD || ADMIN_PASSWORD;

    if (!adminPass || !memberPass) {
      throw new Error('ADMIN_PASSWORD and DEFAULT_MEMBER_PASSWORD must be configured in environment variables to seed database.');
    }

    // 1. Create Users
    const defaultPasswordHash = await bcrypt.hash(memberPass, 12);
    const adminPasswordHash = await bcrypt.hash(adminPass, 12);

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      title: 'Workspace Admin & Team Lead'
    });

    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@agency.com',
      passwordHash: defaultPasswordHash,
      role: ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
      title: 'Lead Developer'
    });

    const aman = await User.create({
      name: 'Aman Verma',
      email: 'aman@agency.com',
      passwordHash: defaultPasswordHash,
      role: ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
      title: 'Software Engineer'
    });

    const sneha = await User.create({
      name: 'Sneha Patel',
      email: 'sneha@agency.com',
      passwordHash: defaultPasswordHash,
      role: ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
      title: 'Product Specialist'
    });

    console.log('✓ Generic users created: Admin (Chetan), Rahul, Aman, Sneha');

    // 2. Create Workspace
    const workspace = await Workspace.create({
      name: 'Demo Workspace',
      description: 'Generic collaborative workspace for multi-project execution',
      ownerId: admin._id
    });

    const wId = workspace._id;

    // 3. Create Projects
    const pAlpha = await Project.create({
      workspaceId: wId,
      name: 'Project Alpha',
      description: 'Core infrastructure, modular data pipelines, and scalable microservices.',
      owner: admin._id,
      members: [admin._id, rahul._id],
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      progress: 70,
      createdBy: admin._id,
      updatedBy: rahul._id
    });

    const pBeta = await Project.create({
      workspaceId: wId,
      name: 'Project Beta',
      description: 'Cross-platform interactive client application and responsive interface.',
      owner: admin._id,
      members: [admin._id, aman._id],
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      progress: 45,
      createdBy: admin._id,
      updatedBy: aman._id
    });

    const pGamma = await Project.create({
      workspaceId: wId,
      name: 'Project Gamma',
      description: 'Autonomous workflow integration, third-party hooks, and analytics reporting.',
      owner: admin._id,
      members: [admin._id, sneha._id],
      status: 'PLANNING',
      priority: 'MEDIUM',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      progress: 20,
      createdBy: admin._id,
      updatedBy: admin._id
    });

    console.log('✓ Projects created: Project Alpha, Project Beta, Project Gamma');

    // 4. Create Folders
    const fDocumentation = await Folder.create({
      workspaceId: wId,
      name: 'Documentation',
      createdBy: admin._id
    });

    const fTechnicalSpecs = await Folder.create({
      workspaceId: wId,
      name: 'Technical Specs',
      parentId: fDocumentation._id,
      createdBy: admin._id
    });

    const fSprintNotes = await Folder.create({
      workspaceId: wId,
      name: 'Sprint Notes',
      parentId: fDocumentation._id,
      createdBy: admin._id
    });

    const fResources = await Folder.create({
      workspaceId: wId,
      name: 'Resources',
      parentId: fDocumentation._id,
      createdBy: admin._id
    });

    const fInternal = await Folder.create({
      workspaceId: wId,
      name: 'Internal (Confidential)',
      createdBy: admin._id
    });

    const fStrategy = await Folder.create({
      workspaceId: wId,
      name: 'Strategy & Roadmap',
      parentId: fInternal._id,
      createdBy: admin._id
    });

    const fFinance = await Folder.create({
      workspaceId: wId,
      name: 'Finance & Budget',
      parentId: fInternal._id,
      createdBy: admin._id
    });

    const fProjectAlphaAssets = await Folder.create({
      workspaceId: wId,
      name: 'Project Alpha Assets',
      projectId: pAlpha._id,
      createdBy: admin._id
    });

    console.log('✓ Folders created');

    // 5. Create Permissions
    // Rahul: Project Alpha (EDIT) + Technical Specs (EDIT)
    await Permission.create({
      workspaceId: wId,
      userId: rahul._id,
      resourceType: 'PROJECT',
      resourceId: pAlpha._id,
      accessLevel: 'EDIT',
      grantedBy: admin._id
    });

    await Permission.create({
      workspaceId: wId,
      userId: rahul._id,
      resourceType: 'FOLDER',
      resourceId: fTechnicalSpecs._id,
      accessLevel: 'EDIT',
      grantedBy: admin._id
    });

    // Aman: Project Beta (EDIT) + Resources (VIEW)
    await Permission.create({
      workspaceId: wId,
      userId: aman._id,
      resourceType: 'PROJECT',
      resourceId: pBeta._id,
      accessLevel: 'EDIT',
      grantedBy: admin._id
    });

    await Permission.create({
      workspaceId: wId,
      userId: aman._id,
      resourceType: 'FOLDER',
      resourceId: fResources._id,
      accessLevel: 'VIEW',
      grantedBy: admin._id
    });

    console.log('✓ Permissions mapped with zero-trust isolation');

    // 6. Create Pages
    const pageDoc = await Page.create({
      workspaceId: wId,
      title: 'Project Requirements & API Specifications',
      content: `## System Architecture & Endpoint Specifications
This document outlines the core technical requirements for the upcoming sprint.

### Ingestion Pipeline
- Real-time event streams with sub-50ms message processing
- Idempotent payload handling and SHA-256 verification
- Automatic exponential backoff for external upstream services

\`\`\`typescript
interface EventPayload<T = Record<string, unknown>> {
  id: string;
  source: string;
  type: string;
  timestamp: string;
  data: T;
}
\`\`\`

### Sprint Checklist
- [x] Schema definition and validation
- [x] Role-based permission policies
- [ ] Automated regression testing
- [ ] Load testing with benchmark harness
`,
      folderId: fTechnicalSpecs._id,
      projectId: pAlpha._id,
      createdBy: admin._id,
      updatedBy: rahul._id,
      isPinned: true,
      version: 2
    });

    await PageRevision.create({
      workspaceId: wId,
      pageId: pageDoc._id,
      version: 1,
      title: 'Project Requirements & API Specifications',
      content: '# Initial Project Outline',
      editedBy: admin._id,
      changeSummary: 'Document created'
    });

    await PageRevision.create({
      workspaceId: wId,
      pageId: pageDoc._id,
      version: 2,
      title: pageDoc.title,
      content: pageDoc.content,
      editedBy: rahul._id,
      changeSummary: 'Added TypeScript event interface and sprint checklist'
    });

    const pageNotes = await Page.create({
      workspaceId: wId,
      title: 'Sprint Planning & Retrospective Notes',
      content: `## Sprint Kickoff & Goals

### Sprint Objectives
1. Complete core data models and database migrations
2. Finalize client interface components
3. Validate permission boundary enforcement

### Action Items
- Rahul: Verify database indexing and query latency
- Aman: Build reusable form and modal components
- Sneha: Draft stakeholder progress report
`,
      folderId: fSprintNotes._id,
      projectId: pBeta._id,
      createdBy: aman._id,
      updatedBy: aman._id,
      isPinned: true,
      version: 1
    });

    const pageFinance = await Page.create({
      workspaceId: wId,
      title: 'Quarterly Budget & Allocation',
      content: `## Internal Financial Overview (Restricted Access)
- Infrastructure & Cloud Hosting: $3,500 / month
- Third-Party Tool Subscriptions: $1,200 / month
- R&D Discretionary Budget: $5,000
`,
      folderId: fFinance._id,
      createdBy: admin._id,
      updatedBy: admin._id,
      isPinned: false,
      version: 1
    });

    console.log('✓ Pages & revisions seeded');

    // 7. Create Tasks
    await Task.create([
      {
        workspaceId: wId,
        title: 'Design database schema and indexes',
        description: 'Define relations, indexes, and soft-delete safeguards.',
        projectId: pAlpha._id,
        assignedTo: rahul._id,
        status: 'DONE',
        priority: 'HIGH',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        order: 0,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Implement authentication and session handling',
        description: 'Secure cookies, JWT validation, and password hashing.',
        projectId: pAlpha._id,
        assignedTo: rahul._id,
        status: 'DONE',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        order: 1,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Build core API endpoints and middleware',
        description: 'Restful controllers, rate limiting, and input validation.',
        projectId: pAlpha._id,
        assignedTo: rahul._id,
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        order: 0,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Setup CI/CD pipeline and automated tests',
        description: 'GitHub Actions workflow with lint, test, and build steps.',
        projectId: pAlpha._id,
        assignedTo: rahul._id,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        order: 0,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Frontend UI implementation with responsive layout',
        description: 'Component architecture, responsive sidebar, and modal dialogs.',
        projectId: pBeta._id,
        assignedTo: aman._id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(),
        order: 0,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Security review and penetration testing',
        description: 'Audit authentication boundaries and header policies.',
        projectId: pBeta._id,
        assignedTo: aman._id,
        status: 'TODO',
        priority: 'CRITICAL',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        order: 1,
        createdBy: admin._id
      },
      {
        workspaceId: wId,
        title: 'Prepare presentation and progress report',
        description: 'Compile sprint deliverables and demo metrics.',
        projectId: pGamma._id,
        assignedTo: sneha._id,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        order: 0,
        createdBy: admin._id
      }
    ]);

    console.log('✓ Generic tasks seeded across Kanban statuses');

    // 8. Create Data Table
    await DataTable.create({
      workspaceId: wId,
      name: 'Project Milestones & Deliverables Tracker',
      folderId: fProjectAlphaAssets._id,
      projectId: pAlpha._id,
      columns: [
        { key: 'milestone', name: 'Milestone / Deliverable', type: 'text' },
        { key: 'category', name: 'Category', type: 'text' },
        { key: 'owner', name: 'Owner', type: 'text' },
        { key: 'status', name: 'Status', type: 'status' },
        { key: 'targetDate', name: 'Target Date', type: 'date' }
      ],
      rows: [
        {
          _rowId: 'row-1',
          milestone: 'Core Architecture Sign-off',
          category: 'Engineering',
          owner: 'Rahul Sharma',
          status: 'COMPLETED',
          targetDate: '2026-09-02'
        },
        {
          _rowId: 'row-2',
          milestone: 'API Gateway & Middleware',
          category: 'Backend',
          owner: 'Rahul Sharma',
          status: 'IN PROGRESS',
          targetDate: '2026-09-08'
        },
        {
          _rowId: 'row-3',
          milestone: 'Design System & Accessibility',
          category: 'Frontend',
          owner: 'Aman Verma',
          status: 'PLANNED',
          targetDate: '2026-09-15'
        }
      ],
      createdBy: admin._id,
      updatedBy: rahul._id
    });

    console.log('✓ Generic deliverables table seeded');

    // 9. Create Activities
    await Activity.create([
      {
        workspaceId: wId,
        actor: rahul._id,
        action: 'PAGE_UPDATED',
        resourceType: 'PAGE',
        resourceId: pageDoc._id,
        resourceTitle: 'Project Requirements & API Specifications',
        createdAt: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        workspaceId: wId,
        actor: aman._id,
        action: 'PROJECT_CREATED',
        resourceType: 'PROJECT',
        resourceId: pBeta._id,
        resourceTitle: 'Project Beta',
        createdAt: new Date(Date.now() - 24 * 60 * 1000)
      },
      {
        workspaceId: wId,
        actor: admin._id,
        action: 'PERMISSION_CHANGED',
        resourceType: 'PERMISSION',
        resourceId: rahul._id,
        resourceTitle: rahul.name,
        metadata: { info: "Updated permissions for Project Alpha" },
        createdAt: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        workspaceId: wId,
        actor: rahul._id,
        action: 'TASK_UPDATED',
        resourceType: 'TASK',
        resourceTitle: 'Design database schema and indexes',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ]);

    // 10. Create Notifications
    await Notification.create([
      {
        recipient: rahul._id,
        sender: admin._id,
        type: 'PROJECT_ADDED',
        message: 'You were granted EDIT access to Project Alpha',
        resourceType: 'PROJECT',
        resourceId: pAlpha._id,
        read: false
      },
      {
        recipient: rahul._id,
        sender: admin._id,
        type: 'TASK_ASSIGNED',
        message: 'You were assigned task: Build core API endpoints and middleware',
        resourceType: 'TASK',
        read: false
      },
      {
        recipient: aman._id,
        sender: admin._id,
        type: 'PROJECT_ADDED',
        message: 'You were added to Project Beta',
        resourceType: 'PROJECT',
        resourceId: pBeta._id,
        read: false
      }
    ]);

    console.log('✓ Activities & Notifications seeded');
    console.log('🎉 Generic seed complete! Multi-workspace ready data initialized.');

    if (process.argv[1]?.includes('seed')) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

if (process.argv[1]?.includes('seed')) {
  seedDatabase();
}
