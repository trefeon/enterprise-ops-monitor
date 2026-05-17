const Sequelize = require("sequelize");

const DATABASE_URL = process.env.DATABASE_URL;

const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, {
      dialect: "postgres",
      logging: false,
    })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
      host: process.env.DB_HOST || "db",
      dialect: "postgres",
      logging: false,
    });

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require("./User")(sequelize, Sequelize);
db.Store = require("./Store")(sequelize, Sequelize);
db.EODLog = require("./EODLog")(sequelize, Sequelize);
db.BackupLog = require("./BackupLog")(sequelize, Sequelize);
db.SystemLog = require("./SystemLog")(sequelize, Sequelize);
db.Employee = require("./Employee")(sequelize, Sequelize);
db.SyncLog = require("./SyncLog")(sequelize, Sequelize);
db.SyncSummary = require("./SyncSummary")(sequelize, Sequelize);
db.SyncAlertState = require("./SyncAlertState")(sequelize, Sequelize);
db.AgentMonitoring = require("./AgentMonitoring")(sequelize, Sequelize);

// RBAC Models
db.Role = require("./Role")(sequelize, Sequelize);
db.RolePermission = require("./RolePermission")(sequelize, Sequelize);
db.UserRole = require("./UserRole")(sequelize, Sequelize);
db.UserPermissionOverride = require("./UserPermissionOverride")(sequelize, Sequelize);
db.UserBranchScope = require("./UserBranchScope")(sequelize, Sequelize);

// Associations
db.Store.hasMany(db.EODLog, { foreignKey: "store_code", sourceKey: "store_code", as: "eodLogs" });
db.EODLog.belongsTo(db.Store, { foreignKey: "store_code", targetKey: "store_code", as: "store" });

// RBAC Associations
db.Role.hasMany(db.RolePermission, { foreignKey: "role_id", as: "permissions" });
db.RolePermission.belongsTo(db.Role, { foreignKey: "role_id", as: "role" });

db.User.belongsToMany(db.Role, {
  through: db.UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles",
});
db.Role.belongsToMany(db.User, {
  through: db.UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users",
});

db.UserRole.belongsTo(db.User, { foreignKey: "user_id", as: "user" });
db.UserRole.belongsTo(db.Role, { foreignKey: "role_id", as: "role" });

db.User.hasMany(db.UserPermissionOverride, { foreignKey: "user_id", as: "permissionOverrides" });
db.UserPermissionOverride.belongsTo(db.User, { foreignKey: "user_id", as: "user" });

db.User.hasMany(db.UserBranchScope, { foreignKey: "user_id", as: "branchScopes" });
db.UserBranchScope.belongsTo(db.User, { foreignKey: "user_id", as: "user" });

module.exports = db;
