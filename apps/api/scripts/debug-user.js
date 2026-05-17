const db = require("../models");
const { loadUserAuthz } = require("../services/authzService");

async function debugUser() {
  try {
    const username = "admin";
    const user = await db.User.findOne({ where: { username } });

    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log("User ID:", user.id);
    console.log("User:", user.toJSON());

    const authz = await loadUserAuthz(user.id);
    console.log("Authz:", JSON.stringify(authz, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debugUser();
