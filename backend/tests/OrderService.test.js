import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import OrderService from '../services/OrderService.js';

describe('OrderService', () => {
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
            findByOrderId: jest.fn(),
            create: jest.fn(),
        };
        mockTableModel = {
            updateStatus: jest.fn(),
        };
        mockMenuItemModel = {
            findById: jest.fn(),
        };
        mockStatisticsService = {
            emitStatistics: jest.fn(),
        };
        mockIo = {
            emit: jest.fn(),
        };
        mockClient = {
            query: jest.fn(),
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

    test('createOrder should correctly calculate total amount for multiple items', async () => {
        const tableId = 1;
        const items = [
            { menu_item_id: 1, quantity: 2 }, // 2 * 10.50 = 21.00
            { menu_item_id: 2, quantity: 3 }  // 3 * 5.00 = 15.00
        ];                                    // Total: 36.00
        
        mockMenuItemModel.findById
            .mockResolvedValueOnce({ id: 1, price: '10.50' })
            .mockResolvedValueOnce({ id: 2, price: '5.00' });

        // The mock return value for 'create' doesn't matter for the calculation check, 
        // as long as it returns a valid object structure.
        mockOrderModel.create.mockImplementation((data) => Promise.resolve({ id: 100, ...data }));
        mockTableModel.updateStatus.mockResolvedValue({ id: tableId, status: 'occupied' });

        const result = await orderService.createOrder(tableId, items);

        // This verifies the logic inside the service correctly summed the items
        expect(mockOrderModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ total_amount: 36.00 }),
            mockClient
        );
        
        // This ensures the service return value reflects the calculated total
        expect(result.total_amount).toBe(36.00);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('createOrder should rollback on error', async () => {
        const tableId = 1;
        const items = [{ menu_item_id: 1, quantity: 2 }];
        
        mockMenuItemModel.findById.mockRejectedValue(new Error('DB Error'));

        await expect(orderService.createOrder(tableId, items)).rejects.toThrow('DB Error');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('updateOrderStatus should update table to available when served', async () => {
        const orderId = 100;
        const mockOrder = { id: orderId, table_id: 1, status: 'served', total_amount: '21.00' };
        mockOrderModel.updateStatus.mockResolvedValue(mockOrder);
        mockOrderItemModel.findByOrderId.mockResolvedValue([]);
        mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'available' });

        const result = await orderService.updateOrderStatus(orderId, 'served');

        expect(result.status).toBe('served');
        expect(mockTableModel.updateStatus).toHaveBeenCalledWith(1, 'available', mockClient);
        expect(mockIo.emit).toHaveBeenCalledWith('tableStatusUpdate', expect.any(Object));
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('getAllOrders should return parsed orders with items', async () => {
        const mockOrders = [{ id: 1, total_amount: '30.00' }];
        const mockItems = [{ order_id: 1, menu_item_id: 2, price: '15.00', quantity: 2 }];
        
        mockOrderModel.findAll.mockResolvedValue(mockOrders);
        mockOrderItemModel.findByOrderIds.mockResolvedValue(mockItems);

        const result = await orderService.getAllOrders();

        expect(result[0].total_amount).toBe(30.00);
        expect(result[0].items[0].price).toBe(15.00);
    });
});
