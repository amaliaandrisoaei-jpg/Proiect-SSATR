/**
 * Small fixture helpers for integration / websocket tests.
 *
 * Each test starts from a TRUNCATE'd schema and inserts exactly the rows it
 * needs, so fixtures are explicit, isolated and self-documenting.
 */

/** Insert a table and return its row. */
export async function insertTable(executor, { qr_code = 'table-qr', status = 'available' } = {}) {
    const result = await executor.query(
        'INSERT INTO tables (qr_code, status) VALUES ($1, $2) RETURNING *',
        [qr_code, status]
    );
    return result.rows[0];
}

/** Insert a menu item and return its row. */
export async function insertMenuItem(
    executor,
    {
        name = 'Test Dish',
        description = 'A test dish',
        price = 10.0,
        category = 'Main Course',
        image_url = null,
        is_available = true,
    } = {}
) {
    const result = await executor.query(
        `INSERT INTO menu_items (name, description, price, category, image_url, is_available)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, description, price, category, image_url, is_available]
    );
    return result.rows[0];
}

/** Insert an order and return its row. */
export async function insertOrder(
    executor,
    { table_id, status = 'pending', total_amount = 0 }
) {
    const result = await executor.query(
        'INSERT INTO orders (table_id, status, total_amount) VALUES ($1, $2, $3) RETURNING *',
        [table_id, status, total_amount]
    );
    return result.rows[0];
}

/** Insert an order item and return its row. */
export async function insertOrderItem(
    executor,
    { order_id, menu_item_id, quantity = 1, price = 10.0, notes = null }
) {
    const result = await executor.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order_id, menu_item_id, quantity, price, notes]
    );
    return result.rows[0];
}

/**
 * Convenience: seed a single available table + a single available menu item,
 * the minimum needed to place an order.
 */
export async function seedTableAndMenuItem(executor, { tablePrefix = 'table' } = {}) {
    const table = await insertTable(executor, { qr_code: `${tablePrefix}-${Date.now()}-${Math.random()}` });
    const menuItem = await insertMenuItem(executor, { name: 'Pizza', price: 12.5 });
    return { table, menuItem };
}
