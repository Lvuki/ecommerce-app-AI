'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('BlogCategories').catch(() => null);
    if (!table) {
      await queryInterface.createTable('BlogCategories', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT },
        image: { type: Sequelize.STRING },
        parentId: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
      // optional FK constraint
      try {
        await queryInterface.addConstraint('BlogCategories', {
          fields: ['parentId'],
          type: 'foreign key',
          name: 'fk_blogcategories_parent',
          references: { table: 'BlogCategories', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        });
      } catch (err) {
        // ignore
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('BlogCategories').catch(() => null);
    if (table) {
      try { await queryInterface.removeConstraint('BlogCategories', 'fk_blogcategories_parent'); } catch (_) {}
      await queryInterface.dropTable('BlogCategories');
    }
  }
};
