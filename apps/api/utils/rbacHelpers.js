const { normalizeRole } = require("./roleMap");

function assertCanManageTarget({ actorRole, targetRole, nextRole }) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  const desired = nextRole == null ? null : normalizeRole(nextRole);

  if (actor === "super_admin") return { ok: true };

  const protectedRoles = new Set(["admin", "super_admin"]);
  if (protectedRoles.has(target)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Cannot manage admin or super_admin accounts",
    };
  }

  if (desired && protectedRoles.has(desired)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Cannot assign admin or super_admin role",
    };
  }

  return { ok: true };
}

module.exports = {
  assertCanManageTarget,
};
