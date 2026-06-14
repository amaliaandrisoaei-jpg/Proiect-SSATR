import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import OrderService from '../../services/OrderService.js';

/**
 * UNIT tests for OrderService — every model is mocked, so these are fast and
 * deterministic with no database. They exercise the transactional logic, the
 * order status machine, rollback paths, decimal parsing and socket emissions.
 */
describe('OrderService (unit)', () => {
    let orderService;
    let mockOrderModel;
    let mockOrderItemModel;
    let mockTableModel;
    let mockMenuItemModel;
    let mockStatisticsService;
    let mockIo;
    let mockPool;
    let mockClient;

    beforeEach(() => {
        mockOrderModel = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        mockOrderItemModel = {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByOrderIds: jest.fn(),
            findByOrderId: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
        };
        mockTableModel = {
            updateStatus: jest.fn(),
        };
        mockMenuItemModel = {
            findById: jest.fn(),
        };
        mockStatisticsService = {
            emitStatistics: jest.fn().mockResolvedValue(undefined),
        };
        mockIo = {
            emit: jest.fn(),
        };
        mockClient = {
            query: jest.fn().mockResolvedValue(undefined),
            release: jest.fn(),
        };
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
        };

        orderService = new OrderService(
            mockOrderModel,
            mockOrderItemModel,
            mockTableModel,
            mockMenuItemModel,
            mockStatisticsService,
            mockIo,
            mockPool
        );
    });

    // -------------------------------------------------------------------------
    // getAllOrders
    // -------------------------------------------------------------------------
    describe('getAllOrders', () => {
        test('returns [] when there are no orders (no item query made)', async () => {
            mockOrderModel.findAll.mockResolvedValue([]);

            const result = await orderService.getAllOrders();

            expect(result).toEqual([]);
            expect(mockOrderItemModel.findByOrderIds).not.toHaveBeenCalled();
        });

        test('parses decimal amounts and attaches each order its own items', async () => {
            mockOrderModel.findAll.mockResolvedValue([
                { id: 1, total_amount: '30.00' },
                { id: 2, total_amount: '5.50' },
            ]);
            mockOrderItemModel.findByOrderIds.mockResolvedValue([
                { order_id: 1, menu_item_id: 2, price: '15.00', quantity: 2 },
                { order_id: 2, menu_item_id: 9, price: '5.50', quantity: 1 },
            ]);

            const result = await orderService.getAllOrders();

            expect(mockOrderItemModel.findByOrderIds).toHaveBeenCalledWith([1, 2]);
            expect(result[0].total_amount).toBe(30.0);
            expect(typeof result[0].total_amount).toBe('number');
            expect(result[0].items).toHaveLength(1);
            expect(result[0].items[0].price).toBe(15.0);
            expect(result[1].items[0].order_id).toBe(2);
        });
    });

    // -------------------------------------------------------------------------
    // getOrderById
    // -------------------------------------------------------------------------
    describe('getOrderById', () => {
        test('returns parsed order with items when found', async () => {
            mockOrderModel.findById.mockResolvedValue({ id: 7, total_amount: '42.75' });
            mockOrderItemModel.findByOrderId.mockResolvedValue([{ id: 1, price: '42.75' }]);

            const result = await orderService.getOrderById(7);

            expect(result.total_amount).toBe(42.75);
            expect(result.items[0].price).toBe(42.75);
            expect(mockOrderItemModel.findByOrderId).toHaveBeenCalledWith(7);
        });

        test('returns null when the order does not exist', async () => {
            mockOrderModel.findById.mockResolvedValue(undefined);

            const result = await orderService.getOrderById(999);

            expect(result).toBeNull();
            expect(mockOrderItemModel.findByOrderId).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // createOrder
    // -------------------------------------------------------------------------
    describe('createOrder', () => {
        test('sums multiple items, persists inside a transaction and occupies the table', async () => {
            const items = [
                { menu_item_id: 1, quantity: 2 }, // 2 * 10.50 = 21.00
                { menu_item_id: 2, quantity: 3 }, // 3 * 5.00  = 15.00
            ]; // total = 36.00
            mockMenuItemModel.findById
                .mockResolvedValueOnce({ id: 1, price: '10.50' })
                .mockResolvedValueOnce({ id: 2, price: '5.00' });
            mockOrderModel.create.mockImplementation((data) => Promise.resolve({ id: 100, ...data }));
            mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'occupied' });

            const result = await orderService.createOrder(1, items);

            expect(mockOrderModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ table_id: 1, status: 'pending', total_amount: 36.0 }),
                mockClient
            );
            expect(mockOrderItemModel.create).toHaveBeenCalledTimes(2);
            expect(mockOrderItemModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ order_id: 100, menu_item_id: 1, quantity: 2, price: 10.5 }),
                mockClient
            );
            expect(mockTableModel.updateStatus).toHaveBeenCalledWith(1, 'occupied', mockClient);
            expect(result.total_amount).toBeCloseTo(36.0, 5);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        test('handles decimal prices from the DB (strings) precisely', async () => {
            mockMenuItemModel.findById.mockResolvedValueOnce({ id: 1, price: '12.99' });
            mockOrderModel.create.mockImplementation((data) => Promise.resolve({ id: 101, ...data }));
            mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'occupied' });

            const result = await orderService.createOrder(1, [{ menu_item_id: 1, quantity: 4 }]);

            expect(result.total_amount).toBeCloseTo(51.96, 5);
        });

        test('emits newOrder, tableStatusUpdate and statistics on success', async () => {
            mockMenuItemModel.findById.mockResolvedValueOnce({ id: 1, price: '8.00' });
            mockOrderModel.create.mockResolvedValue({ id: 200, table_id: 3, status: 'pending', total_amount: '8.00' });
            mockTableModel.updateStatus.mockResolvedValue({ id: 3, status: 'occupied' });

            await orderService.createOrder(3, [{ menu_item_id: 1, quantity: 1 }]);

            expect(mockIo.emit).toHaveBeenCalledWith('newOrder', expect.objectContaining({ id: 200 }));
            expect(mockIo.emit).toHaveBeenCalledWith('tableStatusUpdate', { id: 3, status: 'occupied' });
            expect(mockStatisticsService.emitStatistics).toHaveBeenCalledTimes(1);
        });

        test('does not emit when no io is configured', async () => {
            const noIoService = new OrderService(
                mockOrderModel, mockOrderItemModel, mockTableModel,
                mockMenuItemModel, mockStatisticsService, null, mockPool
            );
            mockMenuItemModel.findById.mockResolvedValueOnce({ id: 1, price: '8.00' });
            mockOrderModel.create.mockResolvedValue({ id: 201, total_amount: '8.00' });
            mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'occupied' });

            await noIoService.createOrder(1, [{ menu_item_id: 1, quantity: 1 }]);

            expect(mockStatisticsService.emitStatistics).not.toHaveBeenCalled();
        });

        // DEF-002
        test('rejects an empty cart without touching the DB', async () => {
            await expect(orderService.createOrder(1, [])).rejects.toThrow('Cannot create an order with no items.');
            await expect(orderService.createOrder(1, undefined)).rejects.toThrow('Cannot create an order with no items.');

            expect(mockPool.connect).not.toHaveBeenCalled();
            expect(mockOrderModel.create).not.toHaveBeenCalled();
            expect(mockTableModel.updateStatus).not.toHaveBeenCalled();
        });

        test('throws and rolls back when a menu item is missing', async () => {
            mockMenuItemModel.findById.mockResolvedValueOnce(undefined);

            await expect(
                orderService.createOrder(1, [{ menu_item_id: 999, quantity: 1 }])
            ).rejects.toThrow('Menu item with ID 999 not found.');

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
            expect(mockOrderModel.create).not.toHaveBeenCalled();
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        test('rolls back and re-throws when the order insert fails', async () => {
            mockMenuItemModel.findById.mockResolvedValueOnce({ id: 1, price: '10.00' });
            mockOrderModel.create.mockRejectedValue(new Error('DB Error'));

            await expect(
                orderService.createOrder(1, [{ menu_item_id: 1, quantity: 1 }])
            ).rejects.toThrow('DB Error');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        // DEF-001
        test('a statistics broadcast failure does not reject createOrder', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockMenuItemModel.findById.mockResolvedValueOnce({ id: 1, price: '8.00' });
            mockOrderModel.create.mockResolvedValue({ id: 202, total_amount: '8.00' });
            mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'occupied' });
            mockStatisticsService.emitStatistics.mockRejectedValue(new Error('stats boom'));

            await expect(
                orderService.createOrder(1, [{ menu_item_id: 1, quantity: 1 }])
            ).resolves.toMatchObject({ id: 202 });

            // Flush the detached .catch microtask.
            await new Promise((resolve) => setImmediate(resolve));
            expect(consoleSpy).toHaveBeenCalledWith('Failed to emit statistics update:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    // -------------------------------------------------------------------------
    // updateOrderStatus — the order status machine
    // -------------------------------------------------------------------------
    describe('updateOrderStatus', () => {
        const nonTerminal = ['pending', 'preparing', 'ready'];
        const terminal = ['served', 'completed', 'cancelled'];

        test.each(nonTerminal)('status "%s" updates the order but NOT the table', async (status) => {
            mockOrderModel.updateStatus.mockResolvedValue({ id: 5, table_id: 2, status, total_amount: '20.00' });

            const result = await orderService.updateOrderStatus(5, status);

            expect(result.status).toBe(status);
            expect(result.total_amount).toBe(20.0);
            expect(mockTableModel.updateStatus).not.toHaveBeenCalled();
            expect(mockIo.emit).toHaveBeenCalledWith('orderStatusUpdate', expect.objectContaining({ status }));
            expect(mockIo.emit).not.toHaveBeenCalledWith('tableStatusUpdate', expect.anything());
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        test.each(terminal)('status "%s" frees the table (-> available)', async (status) => {
            mockOrderModel.updateStatus.mockResolvedValue({ id: 6, table_id: 4, status, total_amount: '20.00' });
            mockTableModel.updateStatus.mockResolvedValue({ id: 4, status: 'available' });

            const result = await orderService.updateOrderStatus(6, status);

            expect(result.status).toBe(status);
            expect(mockTableModel.updateStatus).toHaveBeenCalledWith(4, 'available', mockClient);
            expect(mockIo.emit).toHaveBeenCalledWith('tableStatusUpdate', { id: 4, status: 'available' });
            expect(mockIo.emit).toHaveBeenCalledWith('orderStatusUpdate', expect.objectContaining({ status }));
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        test('returns null and rolls back when the order does not exist', async () => {
            mockOrderModel.updateStatus.mockResolvedValue(undefined);

            const result = await orderService.updateOrderStatus(123, 'preparing');

            expect(result).toBeNull();
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        test('rolls back and re-throws on a DB failure', async () => {
            mockOrderModel.updateStatus.mockRejectedValue(new Error('update failed'));

            await expect(orderService.updateOrderStatus(5, 'ready')).rejects.toThrow('update failed');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalledTimes(1);
        });

        // DEF-004: events must not be emitted for state a failed COMMIT rolls back.
        test('does NOT emit tableStatusUpdate when COMMIT fails on a terminal status', async () => {
            mockClient.query.mockImplementation((sql) =>
                sql === 'COMMIT' ? Promise.reject(new Error('commit failed')) : Promise.resolve(undefined)
            );
            mockOrderModel.updateStatus.mockResolvedValue({ id: 9, table_id: 4, status: 'served', total_amount: '20.00' });
            mockTableModel.updateStatus.mockResolvedValue({ id: 4, status: 'available' });

            await expect(orderService.updateOrderStatus(9, 'served')).rejects.toThrow('commit failed');

            expect(mockIo.emit).not.toHaveBeenCalledWith('tableStatusUpdate', expect.anything());
            expect(mockIo.emit).not.toHaveBeenCalledWith('orderStatusUpdate', expect.anything());
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        test('attaches parsed items to the updated order', async () => {
            mockOrderModel.updateStatus.mockResolvedValue({ id: 8, table_id: 1, status: 'preparing', total_amount: '30.00' });
            mockOrderItemModel.findByOrderId.mockResolvedValue([{ id: 1, price: '15.00', quantity: 2 }]);

            const result = await orderService.updateOrderStatus(8, 'preparing');

            expect(result.items[0].price).toBe(15.0);
        });
    });

    // -------------------------------------------------------------------------
    // updateOrder / deleteOrder
    // -------------------------------------------------------------------------
    describe('updateOrder', () => {
        test('returns the parsed order when it exists', async () => {
            mockOrderModel.update.mockResolvedValue({ id: 3, total_amount: '12.00' });

            const result = await orderService.updateOrder(3, { status: 'ready' });

            expect(result.total_amount).toBe(12.0);
        });

        test('returns null when the order does not exist', async () => {
            mockOrderModel.update.mockResolvedValue(undefined);
            const result = await orderService.updateOrder(3, {});
            expect(result).toBeNull();
        });
    });

    describe('deleteOrder', () => {
        test('delegates to the model', async () => {
            mockOrderModel.delete.mockResolvedValue({ id: 3 });
            const result = await orderService.deleteOrder(3);
            expect(result).toEqual({ id: 3 });
            expect(mockOrderModel.delete).toHaveBeenCalledWith(3);
        });
    });
});
