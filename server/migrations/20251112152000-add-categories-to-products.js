"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make migration idempotent: only add column if it doesn't already exist
    const tableDesc = await queryInterface.describeTable('Products');
    if (!tableDesc.categories) {
      await queryInterface.addColumn('Products', 'categories', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    } else {
      // column already exists; nothing to do
      console.log('Migration notice: column "categories" already exists on Products, skipping addColumn.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove column only if it exists
    const tableDesc = await queryInterface.describeTable('Products');
    if (tableDesc.categories) {
      await queryInterface.removeColumn('Products', 'categories');
    } else {
      console.log('Migration notice: column "categories" does not exist on Products, skipping removeColumn.');
    }
  }
};
