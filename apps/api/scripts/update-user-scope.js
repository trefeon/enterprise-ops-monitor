const db = require("../models");

async function updateUser() {
  try {
    const username = "viewer";
    const user = await db.User.findOne({ where: { username } });

    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log(`Updating scope for ${username} (ID: ${user.id})...`);

    // Remove existing scopes
    await db.UserBranchScope.destroy({ where: { user_id: user.id } });

    // Add North Hub (2)
    await db.UserBranchScope.create({
      user_id: user.id,
      branch_id: 2, // North Hub
    });

    console.log("Updated scope to Branch 2 (North Hub).");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

updateUser();
