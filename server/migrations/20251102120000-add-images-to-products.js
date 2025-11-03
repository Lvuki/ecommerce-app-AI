'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'images', { type: Sequelize.JSON });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Products', 'images');
  }
};
