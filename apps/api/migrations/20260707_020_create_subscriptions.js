"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES tenants(id),
        status VARCHAR(20) NOT NULL DEFAULT 'trial',
        plan VARCHAR(20),
        branch_count INT NOT NULL DEFAULT 0,
        screen_count INT NOT NULL DEFAULT 0,
        billing_period_start DATE,
        billing_period_end DATE,
        provider VARCHAR(20) NOT NULL DEFAULT 'manual',
        provider_subscription_id VARCHAR(255),
        last_invoice_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id
        ON subscriptions (org_id);

      CREATE INDEX IF NOT EXISTS idx_subscriptions_status
        ON subscriptions (status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_subscriptions_status;
      DROP INDEX IF EXISTS idx_subscriptions_org_id;
      DROP TABLE IF EXISTS subscriptions CASCADE;
    `);
  },
};
