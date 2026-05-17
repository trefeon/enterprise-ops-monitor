// Normalizes legacy role strings to the dashboard role model.

function normalizeRole(role) {
  if (!role) return "viewer";
  const r = String(role).toLowerCase();
  if (r === "superadmin" || r === "super_admin" || r === "super-admin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "ops" || r === "operator") return "ops";
  if (r === "hc" || r === "human capital") return "hc";
  if (r === "it" || r === "support") return "it";
  if (r === "user" || r === "viewer") return "viewer";

  // If no specific legacy mapping found, return the role name itself if it's a valid string
  // This allows new roles to pass through if they don't need normalization
  return r;
}

module.exports = {
  normalizeRole,
};
