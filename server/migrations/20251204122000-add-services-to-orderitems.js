"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrderItems', 'services', { type: Sequelize.JSON, allowNull: true });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.removeColumn('OrderItems', 'services');
  }
};
