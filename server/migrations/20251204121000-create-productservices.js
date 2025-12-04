"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProductServices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      productId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Products', key: 'id' }, onDelete: 'CASCADE' },
      serviceId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Services', key: 'id' }, onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('ProductServices', ['productId']);
    await queryInterface.addIndex('ProductServices', ['serviceId']);
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.dropTable('ProductServices');
  }
};
