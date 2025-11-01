'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Categories', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('Categories', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Categories', 'image');
    await queryInterface.changeColumn('Categories', 'description', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
