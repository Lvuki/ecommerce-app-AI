module.exports = {
  up: async (queryInterface, Sequelize) => {
    // add 'garancia' (= warranty) column to Products table
    // Make the migration idempotent: only add if the column does not exist.
    const tableDesc = await queryInterface.describeTable('Products');
    if (!tableDesc.garancia) {
      await queryInterface.addColumn('Products', 'garancia', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  down: async (queryInterface) => {
    // Only remove if the column exists.
    const tableDesc = await queryInterface.describeTable('Products');
    if (tableDesc.garancia) {
      await queryInterface.removeColumn('Products', 'garancia');
    }
  }
};
