'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Be idempotent: only add the column if it doesn't already exist
    const table = await queryInterface.describeTable('Categories').catch(() => null);
    if (table) {
      if (!table.image) {
        await queryInterface.addColumn('Categories', 'image', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      // Ensure description is TEXT (attempt change, but ignore errors)
      try {
        await queryInterface.changeColumn('Categories', 'description', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      } catch (err) {
        // If changeColumn fails (e.g., already TEXT), continue
        console.warn('Could not change description column type:', err.message || err);
      }
    } else {
      // If table doesn't exist (shouldn't happen normally), create with expected columns
      await queryInterface.createTable('Categories', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: { type: Sequelize.STRING },
        description: { type: Sequelize.TEXT },
        image: { type: Sequelize.STRING },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove image only if it exists
    const table = await queryInterface.describeTable('Categories').catch(() => null);
    if (table && table.image) {
      await queryInterface.removeColumn('Categories', 'image');
    }
    // Attempt to revert description to STRING if possible
    try {
      await queryInterface.changeColumn('Categories', 'description', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (err) {
      // ignore
    }
  }
};
