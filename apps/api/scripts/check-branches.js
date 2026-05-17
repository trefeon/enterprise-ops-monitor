const db = require("../models");

async function checkData() {
  try {
    // 1. Get Branch Names
    const branches = await db.sequelize.query(
      "SELECT branch_id, branch_name FROM data_branches ORDER BY branch_id",
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    console.log("Branches:", JSON.stringify(branches, null, 2));

    // 2. Check EOD Data for Branch 3
    const eodCount = await db.sequelize.query(
      "SELECT COUNT(*) as count FROM data_stores WHERE branch_id = 3",
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    console.log("Stores for Branch 3:", JSON.stringify(eodCount, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkData();
