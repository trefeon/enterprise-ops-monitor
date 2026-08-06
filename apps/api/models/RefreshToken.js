/**
 * RefreshToken model (issue #12) — DB-backed refresh tokens with rotation.
 *
 * Only the SHA-256 hash of the raw token is stored (token_hash UNIQUE); the
 * raw 256-bit token itself is handed to the client once (body + httpOnly
 * cookie) and never persisted. Rows are revoked by setting revoked_at during
 * rotation/logout.
 *
 * NOTE: user_id is INTEGER because the Users primary key is INTEGER.
 */
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      org_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      token_hash: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "refresh_tokens",
      underscored: true,
      // created_at is managed explicitly (DB default NOW()); Sequelize
      // timestamp bookkeeping is disabled to keep the column set exact.
      timestamps: false,
    }
  );

  return RefreshToken;
};
/* model: RefreshToken */
