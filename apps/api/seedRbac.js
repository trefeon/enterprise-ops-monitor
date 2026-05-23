/**
 * RBAC Seed Script
 * Seeds system roles and their default permissions.
 * Also migrates existing User.role to user_roles table.
 *
 * Run with: node seedRbac.js
 */
require("dotenv").config();
const db = require("./models");

// All available permissions
const ALL_PERMISSIONS = [
  // Section permissions
  "DASHBOARD_VIEW",
  "SYNC_VIEW",
  "EOD_VIEW",
  "STORES_VIEW",
  "EMPLOYEES_VIEW",
  "BACKUPS_VIEW",
  "SYSTEM_VIEW",
  "ACCOUNTS_VIEW",
  // EOD granular
  "EOD_SYNC",
  "EOD_RETRY",
  // Stores granular
  "STORES_EDIT",
  // Identity/NIK
  "NIK_LOOKUP",
  "EMPLOYEES_EDIT",
  // Backups granular
  "BACKUPS_RUN",
  "BACKUPS_DELETE",
  "BACKUPS_RESTORE",
  // System granular
  "SYSTEM_HEALTHCHECK",
  "SYSTEM_RESTART",
  // Accounts granular
  "USERS_VIEW",
  "USERS_CREATE",
  "USERS_EDIT",
  "USERS_RESET_PASSWORD",
  "USERS_CHANGE_PASSWORD",
  "USERS_ROLE_EDIT",
  "USERS_PERMISSION_EDIT",
  "USERS_SCOPE_EDIT",
  "USERS_DELETE",
  "ROLES_VIEW",
  "ROLES_EDIT",
  // After Hours
  "AFTERHOURS_VIEW",
  // Agent Update
  "AGENT_UPDATE",
];

// System roles with their permissions
const SYSTEM_ROLES = [
  {
    name: "viewer",
    label: "Viewer",
    description: "Read-only access to dashboard and monitoring",
    permissions: [
      "DASHBOARD_VIEW",
      "SYNC_VIEW",
      "EOD_VIEW",
      "STORES_VIEW",
      "EMPLOYEES_VIEW",
      "NIK_LOOKUP",
      "BACKUPS_VIEW",
      "SYSTEM_VIEW",
    ],
  },
  {
    name: "ops",
    label: "Operations",
    description: "Operations staff with sync and backup capabilities",
    permissions: [
      "DASHBOARD_VIEW",
      "SYNC_VIEW",
      "EOD_VIEW",
      "EOD_SYNC",
      "EOD_RETRY",
      "STORES_VIEW",
      "EMPLOYEES_VIEW",
      "NIK_LOOKUP",
      "BACKUPS_VIEW",
      "BACKUPS_RUN",
      "SYSTEM_VIEW",
      "AGENT_UPDATE",
    ],
  },
  {
    name: "admin",
    label: "Administrator",
    description: "Full access except system-critical operations",
    permissions: [
      "DASHBOARD_VIEW",
      "SYNC_VIEW",
      "EOD_VIEW",
      "EOD_SYNC",
      "EOD_RETRY",
      "STORES_VIEW",
      "STORES_EDIT",
      "EMPLOYEES_VIEW",
      "NIK_LOOKUP",
      "EMPLOYEES_EDIT",
      "BACKUPS_VIEW",
      "BACKUPS_RUN",
      "BACKUPS_DELETE",
      "SYSTEM_VIEW",
      "SYSTEM_HEALTHCHECK",
      "ACCOUNTS_VIEW",
      "USERS_VIEW",
      "USERS_CREATE",
      "USERS_EDIT",
      "USERS_RESET_PASSWORD",
      "USERS_ROLE_EDIT",
      "USERS_PERMISSION_EDIT",
      "USERS_SCOPE_EDIT",
      "USERS_DELETE",
      "ROLES_VIEW",
      "AFTERHOURS_VIEW",
      "AGENT_UPDATE",
    ],
  },
  {
    name: "super_admin",
    label: "Super Administrator",
    description: "Full system access including critical operations",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "demo",
    label: "Demo",
    description: "Read-only access to all features for portfolio demonstration",
    permissions: [
      "DASHBOARD_VIEW",
      "SYNC_VIEW",
      "EOD_VIEW",
      "STORES_VIEW",
      "EMPLOYEES_VIEW",
      "NIK_LOOKUP",
      "BACKUPS_VIEW",
      "SYSTEM_VIEW",
      "ACCOUNTS_VIEW",
      "USERS_VIEW",
      "ROLES_VIEW",
      "AFTERHOURS_VIEW",
      "AGENT_UPDATE",
      "SYSTEM_HEALTHCHECK",
    ],
  },
  {
    name: "it",
    label: "IT Support",
    description: "IT support staff with system and sync access",
    permissions: [
      "DASHBOARD_VIEW",
      "SYNC_VIEW",
      "EOD_VIEW",
      "EOD_SYNC",
      "EOD_RETRY",
      "STORES_VIEW",
      "EMPLOYEES_VIEW",
      "NIK_LOOKUP",
      "BACKUPS_VIEW",
      "BACKUPS_RUN",
      "SYSTEM_VIEW",
      "SYSTEM_HEALTHCHECK",
      "AGENT_UPDATE",
    ],
  },
  {
    name: "hc",
    label: "Human Capital",
    description: "HR staff with employee directory access",
    permissions: ["EMPLOYEES_VIEW", "NIK_LOOKUP"],
  },
];

async function seed() {
  try {
    console.log("Starting RBAC seeding...");

    // 1. Create/update system roles
    for (const roleData of SYSTEM_ROLES) {
      const [role, created] = await db.Role.findOrCreate({
        where: { name: roleData.name },
        defaults: {
          label: roleData.label,
          description: roleData.description,
          is_system: true,
        },
      });

      if (!created) {
        // Update existing role
        await role.update({
          label: roleData.label,
          description: roleData.description,
          is_system: true,
        });
      }

      console.log(`  ${created ? "✓ Created" : "○ Updated"} role: ${roleData.name}`);

      // Clear existing permissions for this role
      await db.RolePermission.destroy({ where: { role_id: role.id } });

      // Add permissions
      const permRecords = roleData.permissions.map((permission) => ({
        role_id: role.id,
        permission,
      }));
      await db.RolePermission.bulkCreate(permRecords);
      console.log(`    → ${roleData.permissions.length} permissions assigned`);
    }

    // 2. Migrate existing users from legacy role column to user_roles
    const users = await db.User.findAll({
      attributes: ["id", "username", "role"],
    });

    console.log(`\nMigrating ${users.length} user(s) to user_roles...`);

    for (const user of users) {
      const legacyRole = user.role || "viewer";

      // Find corresponding role
      const role = await db.Role.findOne({ where: { name: legacyRole } });
      if (!role) {
        console.log(
          `  ⚠ No role found for user ${user.username} (legacy: ${legacyRole}), defaulting to viewer`
        );
        const viewerRole = await db.Role.findOne({ where: { name: "viewer" } });
        if (viewerRole) {
          await db.UserRole.findOrCreate({
            where: { user_id: user.id, role_id: viewerRole.id },
          });
        }
        continue;
      }

      // Create user_role entry if not exists
      const [, created] = await db.UserRole.findOrCreate({
        where: { user_id: user.id, role_id: role.id },
      });

      console.log(
        `  ${created ? "✓ Migrated" : "○ Already exists"}: ${user.username} → ${legacyRole}`
      );
    }

    console.log("\n✓ RBAC seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("RBAC seeding failed:", error);
    process.exit(1);
  }
}

seed();
