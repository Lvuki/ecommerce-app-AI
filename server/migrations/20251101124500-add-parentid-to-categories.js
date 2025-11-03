'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Categories').catch(() => null);
    if (table && !table.parentId) {
      await queryInterface.addColumn('Categories', 'parentId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      // add FK constraint if desired (optional)
      try {
        await queryInterface.addConstraint('Categories', {
          fields: ['parentId'],
          type: 'foreign key',
          name: 'fk_categories_parent',
          references: { table: 'Categories', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        });
      } catch (err) {
        // ignore if constraint already exists or DB doesn't support
        console.warn('Could not add FK constraint for parentId:', err.message || err);
      }
    }
  },

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Categories').catch(() => null);
    if (table && table.parentId) {
      // remove constraint if exists
      try {
        await queryInterface.removeConstraint('Categories', 'fk_categories_parent');
      } catch (err) {
        // ignore
      }
      await queryInterface.removeColumn('Categories', 'parentId');
    }
  }
};
