const { BRANCHES } = require("../dataClient");

const BRANCH_BY_ID = new Map(BRANCHES.map((b) => [String(b.id), b]));

function getBranchNameById(id) {
  return BRANCH_BY_ID.get(String(id))?.name || null;
}

function listBranchIds() {
  return BRANCHES.map((b) => String(b.id));
}

module.exports = {
  BRANCHES,
  getBranchNameById,
  listBranchIds,
};
