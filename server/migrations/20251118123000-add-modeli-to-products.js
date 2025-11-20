module.exports = {
  up: async (queryInterface, Sequelize) => {
    // add 'modeli' (model) column to Products table
    // Make adding the column idempotent: only add if it doesn't already exist.
    const tableDesc = await queryInterface.describeTable('Products');
    if (!tableDesc.modeli) {
      await queryInterface.addColumn('Products', 'modeli', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  down: async (queryInterface) => {
    // Only remove if the column exists.
    const tableDesc = await queryInterface.describeTable('Products');
    if (tableDesc.modeli) {
      await queryInterface.removeColumn('Products', 'modeli');
    }
  }
};
