function normalizeBranchName(value) {
  if (value == null) return value;
  const raw = String(value).trim();
  if (!raw) return raw;

  const key = raw.toLowerCase();
  const aliases = {
    "north": "NORTH HUB",
    "north hub": "NORTH HUB",
    "east": "EAST HUB",
    "east hub": "EAST HUB",
    "central": "CENTRAL HUB",
    "central hub": "CENTRAL HUB",
    "coastal": "COASTAL HUB",
    "coastal hub": "COASTAL HUB",
    "highland": "HIGHLAND HUB",
    "highland hub": "HIGHLAND HUB",
    "west": "WEST HUB",
    "west hub": "WEST HUB",
    "river": "RIVER HUB",
    "river hub": "RIVER HUB",
    "south": "SOUTH HUB",
    "south hub": "SOUTH HUB",
  };

  if (aliases[key]) return aliases[key];

  // Default: uppercase the value
  return raw.toUpperCase();
}

module.exports = {
  normalizeBranchName,
};
