/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.enum('role', ['owner', 'staff', 'shop_owner']).notNullable();
      table.string('phone');
      table.text('address');
      table.timestamps(true, true);
    })
    .createTable('lots', table => {
      table.uuid('id').primary();
      table.enum('status', ['PACKED', 'DISPATCHED', 'RECEIVED']).defaultTo('PACKED');
      table.integer('shop_id').unsigned().references('id').inTable('users');
      table.integer('creator_id').unsigned().references('id').inTable('users');
      table.timestamp('dispatched_at');
      table.timestamp('received_at');
      table.timestamps(true, true);
    })
    .createTable('lot_items', table => {
      table.increments('id').primary();
      table.uuid('lot_id').references('id').inTable('lots').onDelete('CASCADE');
      table.string('item_name').notNullable();
      table.integer('quantity').notNullable();
    })
    .createTable('orders', table => {
      table.increments('id').primary();
      table.integer('shop_id').unsigned().references('id').inTable('users');
      table.enum('status', ['PENDING', 'ACKNOWLEDGED', 'FULFILLED']).defaultTo('PENDING');
      table.string('mobile');
      table.text('address');
      table.text('description');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('lot_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('lots')
    .dropTableIfExists('users');
};
