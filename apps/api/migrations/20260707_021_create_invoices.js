"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS billing_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id),
        amount INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50),
        paid_at TIMESTAMPTZ,
        due_at TIMESTAMPTZ,
        invoice_number VARCHAR(50) UNIQUE,
        provider_invoice_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id
        ON billing_invoices (subscription_id);

      CREATE INDEX IF NOT EXISTS idx_billing_invoices_status
        ON billing_invoices (status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_billing_invoices_status;
      DROP INDEX IF EXISTS idx_billing_invoices_subscription_id;
      DROP TABLE IF EXISTS billing_invoices CASCADE;
    `);
  },
};
