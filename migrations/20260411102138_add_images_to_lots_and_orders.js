/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .table('lots', table => {
      table.jsonb('images'); // SQLite might need table.text('images') but assuming PG based on pg package
    })
    .table('orders', table => {
      table.jsonb('images');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .table('lots', table => {
      table.dropColumn('images');
    })
    .table('orders', table => {
      table.dropColumn('images');
    });
};
