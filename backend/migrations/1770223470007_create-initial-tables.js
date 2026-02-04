/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable('tables', {
        id: 'id',
        qr_code: { type: 'text', notNull: true, unique: true },
        status: { type: 'text', notNull: true, default: 'available' }, // e.g., 'available', 'occupied'
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('menu_items', {
        id: 'id',
        name: { type: 'text', notNull: true },
        description: { type: 'text' },
        price: { type: 'decimal', notNull: true },
        category: { type: 'text', notNull: true },
        image_url: { type: 'text' },
        is_available: { type: 'boolean', notNull: true, default: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('orders', {
        id: 'id',
        table_id: {
            type: 'integer',
            notNull: true,
            references: 'tables',
            onDelete: 'CASCADE',
        },
        status: { type: 'text', notNull: true, default: 'pending' }, // e.g., 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'
        total_amount: { type: 'decimal', notNull: true, default: 0 },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('order_items', {
        id: 'id',
        order_id: {
            type: 'integer',
            notNull: true,
            references: 'orders',
            onDelete: 'CASCADE',
        },
        menu_item_id: {
            type: 'integer',
            notNull: true,
            references: 'menu_items',
            onDelete: 'CASCADE',
        },
        quantity: { type: 'integer', notNull: true, default: 1 },
        price: { type: 'decimal', notNull: true }, // price at the time of order
        notes: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('order_items');
    pgm.dropTable('orders');
    pgm.dropTable('menu_items');
    pgm.dropTable('tables');
};