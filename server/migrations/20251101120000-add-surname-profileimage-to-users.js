'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn('Users', 'surname', { type: Sequelize.STRING }),
      queryInterface.addColumn('Users', 'profileImage', { type: Sequelize.STRING })
    ]);
  },

  async down (queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn('Users', 'surname'),
      queryInterface.removeColumn('Users', 'profileImage')
    ]);
  }
};
