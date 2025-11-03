"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Products', 'offerPrice', { type: Sequelize.FLOAT, allowNull: true, defaultValue: null });
    await queryInterface.addColumn('Products', 'offerFrom', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('Products', 'offerTo', { type: Sequelize.DATE, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Products', 'offerPrice');
    await queryInterface.removeColumn('Products', 'offerFrom');
    await queryInterface.removeColumn('Products', 'offerTo');
  }
};
