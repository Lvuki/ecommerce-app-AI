module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename 'sku' -> 'kodi_i_produktit' and 'brand' -> 'marka' on Products table
    const table = 'Products';
    // Protect against missing columns by checking dialect-specific queries is harder; we'll attempt rename and ignore errors
    await queryInterface.renameColumn(table, 'sku', 'kodi_i_produktit');
    await queryInterface.renameColumn(table, 'brand', 'marka');
  },

  down: async (queryInterface, Sequelize) => {
    const table = 'Products';
    await queryInterface.renameColumn(table, 'kodi_i_produktit', 'sku');
    await queryInterface.renameColumn(table, 'marka', 'brand');
  }
};
