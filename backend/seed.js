import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    try {
        console.log('Starting database seeding...');

        // Clear existing data (optional, for development purposes)
        await pool.query('DELETE FROM order_items');
        await pool.query('DELETE FROM orders');
        await pool.query('DELETE FROM menu_items');
        await pool.query('DELETE FROM tables');
        console.log('Cleared existing data.');

        // Seed tables
        await pool.query(`
            INSERT INTO tables (id, qr_code, status) VALUES
            (1, 'table-qr-001', 'occupied'),
            (2, 'table-qr-002', 'available'),
            (3, 'table-qr-003', 'available'),
            (4, 'table-qr-004', 'occupied')
            ON CONFLICT (id) DO UPDATE SET qr_code = EXCLUDED.qr_code, status = EXCLUDED.status;
        `);
        // Manually set sequence to continue from max ID
        await pool.query(`SELECT setval('tables_id_seq', (SELECT MAX(id) FROM tables));`);
        console.log('Seeded tables.');

        // Seed menu_items
        await pool.query(`
            INSERT INTO menu_items (id, name, description, price, category, is_available) VALUES
            (1, 'Margherita Pizza', 'Classic pizza with tomato and mozzarella', 12.50, 'Main Course', true),
            (2, 'Caesar Salad', 'Fresh salad with chicken and croutons', 9.00, 'Appetizer', true),
            (3, 'Spaghetti Carbonara', 'Pasta with eggs, hard cheese, cured pork, and black pepper', 14.75, 'Main Course', true),
            (4, 'Cheesecake', 'Creamy New York style cheesecake', 7.25, 'Dessert', true),
            (5, 'Orange Juice', 'Freshly squeezed orange juice', 4.00, 'Beverage', true),
            (6, 'Grilled Salmon', 'Salmon fillet with seasonal vegetables', 18.00, 'Main Course', true),
            (7, 'Tiramisu', 'Classic Italian coffee-flavoured dessert', 8.50, 'Dessert', false)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, category = EXCLUDED.category, is_available = EXCLUDED.is_available;
        `);
        // Manually set sequence to continue from max ID
        await pool.query(`SELECT setval('menu_items_id_seq', (SELECT MAX(id) FROM menu_items));`);
        console.log('Seeded menu items.');

        // Seed orders (example with table_id 1)
        await pool.query(`
            INSERT INTO orders (id, table_id, status, total_amount) VALUES
            (1, 1, 'pending', 26.50),
            (2, 4, 'preparing', 18.00)
            ON CONFLICT (id) DO UPDATE SET table_id = EXCLUDED.table_id, status = EXCLUDED.status, total_amount = EXCLUDED.total_amount;
        `);
        await pool.query(`SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));`);
        console.log('Seeded orders.');

        // Seed order_items
        await pool.query(`
            INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes) VALUES
            (1, 1, 1, 12.50, 'No olives'),
            (1, 5, 1, 4.00, NULL),
            (1, 2, 1, 9.00, 'Extra dressing'),
            (2, 6, 1, 18.00, 'Well done')
            ;
        `);
        // Note: order_items_id_seq is not explicitly set here as it's an auto-incrementing ID in the migration,
        // but if there were ON CONFLICT, we might need to handle sequence for order_items as well.
        console.log('Seeded order items.');

        console.log('Database seeding complete!');
    } catch (error) {
        console.error('Database seeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();