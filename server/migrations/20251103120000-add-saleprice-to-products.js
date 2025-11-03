"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Products', 'salePrice', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Products', 'salePrice');
  }
};
