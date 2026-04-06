const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('lot_items').del();
  await knex('orders').del();
  await knex('lots').del();
  await knex('users').del();

  const salt = await bcrypt.genSalt(10);
  const ownerPassword = await bcrypt.hash('admin123', salt);
  const staffPassword = await bcrypt.hash('staff123', salt);
  const shopPassword = await bcrypt.hash('shop123', salt);

  await knex('users').insert([
    {
      email: 'owner@renix.com',
      password_hash: ownerPassword,
      full_name: 'System Owner',
      role: 'owner',
      phone: '1234567890',
      address: 'Renix HQ'
    },
    {
      email: 'staff@renix.com',
      password_hash: staffPassword,
      full_name: 'Warehouse Staff 1',
      role: 'staff',
      phone: '0987654321',
      address: 'Warehouse A'
    },
    {
      email: 'shop@example.com',
      password_hash: shopPassword,
      full_name: 'Metro Shop',
      role: 'shop_owner',
      phone: '1122334455',
      address: 'Downtown Street 10'
    }
  ]);
};
