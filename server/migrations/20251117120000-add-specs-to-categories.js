"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make adding the column idempotent: only add if it doesn't already exist.
    const tableDesc = await queryInterface.describeTable('Categories');
    if (!tableDesc.specs) {
      await queryInterface.addColumn('Categories', 'specs', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Only remove if the column exists.
    const tableDesc = await queryInterface.describeTable('Categories');
    if (tableDesc.specs) {
      await queryInterface.removeColumn('Categories', 'specs');
    }
  }
};
