import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import OrderItemService from '../../services/OrderItemService.js';

/**
 * OrderItemService is a thin CRUD pass-through over OrderItemModel. The unit
 * tests pin that contract (arguments forwarded, return values relayed).
 */
describe('OrderItemService (unit)', () => {
    let orderItemService;
    let mockOrderItemModel;

    beforeEach(() => {
        mockOrderItemModel = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        orderItemService = new OrderItemService(mockOrderItemModel);
    });

    test('getAllOrderItems delegates to the model', async () => {
        mockOrderItemModel.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        expect(await orderItemService.getAllOrderItems()).toHaveLength(2);
        expect(mockOrderItemModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('getOrderItemById forwards the id', async () => {
        mockOrderItemModel.findById.mockResolvedValue({ id: 7 });
        expect(await orderItemService.getOrderItemById(7)).toEqual({ id: 7 });
        expect(mockOrderItemModel.findById).toHaveBeenCalledWith(7);
    });

    test('createOrderItem forwards the payload', async () => {
        const data = { order_id: 1, menu_item_id: 2, quantity: 3, price: 5.0 };
        mockOrderItemModel.create.mockResolvedValue({ id: 9, ...data });
        expect(await orderItemService.createOrderItem(data)).toMatchObject({ id: 9 });
        expect(mockOrderItemModel.create).toHaveBeenCalledWith(data);
    });

    test('updateOrderItem forwards id and payload', async () => {
        mockOrderItemModel.update.mockResolvedValue({ id: 9, quantity: 5 });
        expect(await orderItemService.updateOrderItem(9, { quantity: 5 })).toMatchObject({ quantity: 5 });
        expect(mockOrderItemModel.update).toHaveBeenCalledWith(9, { quantity: 5 });
    });

    test('deleteOrderItem forwards the id', async () => {
        mockOrderItemModel.delete.mockResolvedValue({ id: 9 });
        expect(await orderItemService.deleteOrderItem(9)).toEqual({ id: 9 });
        expect(mockOrderItemModel.delete).toHaveBeenCalledWith(9);
    });
});
