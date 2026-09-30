import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_MEMBER_PASSWORD, ROLES, USER_STATUS } from '../config/constants.js';

export const bootstrapAdminAndWorkspace = async (): Promise<void> => {
  try {
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
    let adminUser = existingAdmin;

    if (!existingAdmin) {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment. Skipping automatic admin user creation.');
      } else {
        console.log('🚀 No admin found. Bootstrapping initial Founder/Admin account from environment variables...');
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

        adminUser = await User.create({
          name: ADMIN_NAME || 'Workspace Admin',
          email: ADMIN_EMAIL,
          passwordHash,
          role: ROLES.ADMIN,
          status: USER_STATUS.ACTIVE,
          title: 'Team Lead'
        });

        console.log('✓ Initial Admin account initialized successfully');
      }
    }

    // Ensure demo member user (alex@gmail.com) exists for demo purposes
    let existingMember = await User.findOne({ email: 'alex@gmail.com' });
    const demoMemberPassword = DEFAULT_MEMBER_PASSWORD || 'Alex@1234';
    const memberPasswordHash = await bcrypt.hash(demoMemberPassword, 12);
    if (!existingMember) {
      existingMember = await User.create({
        name: 'Alex Johnson',
        email: 'alex@gmail.com',
        passwordHash: memberPasswordHash,
        role: ROLES.MEMBER,
        status: USER_STATUS.ACTIVE,
        title: 'Product Designer'
      });
      console.log('✓ Demo member account (alex@gmail.com) initialized');
    } else {
      existingMember.passwordHash = memberPasswordHash;
      existingMember.status = USER_STATUS.ACTIVE;
      existingMember.role = ROLES.MEMBER;
      await existingMember.save();
    }

    let workspace = await Workspace.findOne();
    if (!workspace && adminUser) {
      workspace = await Workspace.create({
        name: 'Demo Workspace',
        description: 'Collaborative team workspace',
        ownerId: adminUser._id,
        members: [adminUser._id]
      });
      console.log('✓ Default workspace initialized: Demo Workspace');
    }

    if (workspace) {
      // Ensure all existing users belong to this default workspace if they don't have one
      await User.updateMany(
        { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
        { $set: { workspaceId: workspace._id } }
      );

      // Ensure workspace members list contains all users in the workspace
      const workspaceUsers = await User.find({ workspaceId: workspace._id }).select('_id');
      const userIds = workspaceUsers.map((u) => u._id);
      workspace.members = userIds;
      await workspace.save();

      // If workspace has no projects yet, seed initial starter projects and tasks
      const { Project } = await import('../models/Project.js');
      const { Task } = await import('../models/Task.js');
      const projectCount = await Project.countDocuments({ workspaceId: workspace._id });

      if (projectCount === 0 && adminUser && existingMember) {
        console.log('🌱 Seeding initial starter projects and tasks...');
        const pAlpha = await Project.create({
          workspaceId: workspace._id,
          name: 'Project Alpha',
          description: 'Core infrastructure, modular data pipelines, and scalable microservices.',
          owner: adminUser._id,
          members: [adminUser._id, existingMember._id],
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          progress: 60,
          createdBy: adminUser._id,
          updatedBy: existingMember._id
        });

        const pBeta = await Project.create({
          workspaceId: workspace._id,
          name: 'Project Beta',
          description: 'Cross-platform interactive client application and responsive interface.',
          owner: adminUser._id,
          members: [adminUser._id, existingMember._id],
          status: 'IN_PROGRESS',
          priority: 'CRITICAL',
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          progress: 40,
          createdBy: adminUser._id,
          updatedBy: adminUser._id
        });

        await Task.create([
          {
            workspaceId: workspace._id,
            title: 'Design database schema and indexes',
            description: 'Define relations, indexes, and soft-delete safeguards.',
            projectId: pAlpha._id,
            assignedTo: existingMember._id,
            status: 'DONE',
            priority: 'HIGH',
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            order: 0,
            createdBy: adminUser._id
          },
          {
            workspaceId: workspace._id,
            title: 'Implement authentication and session handling',
            description: 'Secure cookies, JWT validation, and password hashing.',
            projectId: pAlpha._id,
            assignedTo: adminUser._id,
            status: 'IN_PROGRESS',
            priority: 'CRITICAL',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            order: 1,
            createdBy: adminUser._id
          },
          {
            workspaceId: workspace._id,
            title: 'Frontend UI component design system',
            description: 'Refactor UI components into consistent design tokens and responsive layout.',
            projectId: pBeta._id,
            assignedTo: existingMember._id,
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            order: 0,
            createdBy: adminUser._id
          },
          {
            workspaceId: workspace._id,
            title: 'Setup end-to-end integration tests',
            description: 'Automated test suite verifying critical path APIs and socket events.',
            projectId: pBeta._id,
            assignedTo: adminUser._id,
            status: 'TODO',
            priority: 'MEDIUM',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            order: 1,
            createdBy: adminUser._id
          }
        ]);

        console.log('✓ Initial starter projects and tasks created');
      }
    }
  } catch (err: any) {
    console.error('❌ Bootstrap error:', err.message);
  }
};
