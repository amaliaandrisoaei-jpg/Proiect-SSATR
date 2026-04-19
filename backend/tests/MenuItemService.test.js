import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import MenuItemService from '../services/MenuItemService.js';

describe('MenuItemService', () => {
    let menuItemService;
    let mockMenuItemModel;

    beforeEach(() => {
        mockMenuItemModel = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        menuItemService = new MenuItemService(mockMenuItemModel);
    });

    test('getAllMenuItems should parse price as float', async () => {
        const mockItems = [
            { id: 1, name: 'Pizza', price: '10.50' },
            { id: 2, name: 'Burger', price: '8.00' }
        ];
        mockMenuItemModel.findAll.mockResolvedValue(mockItems);

        const result = await menuItemService.getAllMenuItems();

        expect(result[0].price).toBe(10.50);
        expect(result[1].price).toBe(8.00);
        expect(mockMenuItemModel.findAll).toHaveBeenCalled();
    });

    test('getMenuItemById should return item with float price', async () => {
        const mockItem = { id: 1, name: 'Pizza', price: '10.50' };
        mockMenuItemModel.findById.mockResolvedValue(mockItem);

        const result = await menuItemService.getMenuItemById(1);

        expect(result.price).toBe(10.50);
        expect(mockMenuItemModel.findById).toHaveBeenCalledWith(1);
    });

    test('getMenuItemById should return null if item not found', async () => {
        mockMenuItemModel.findById.mockResolvedValue(null);

        const result = await menuItemService.getMenuItemById(999);

        expect(result).toBeNull();
    });

    test('createMenuItem should parse price of new item', async () => {
        const newItem = { name: 'Pasta', price: 12.00 };
        const savedItem = { id: 3, ...newItem, price: '12.00' };
        mockMenuItemModel.create.mockResolvedValue(savedItem);

        const result = await menuItemService.createMenuItem(newItem);

        expect(result.price).toBe(12.00);
        expect(mockMenuItemModel.create).toHaveBeenCalledWith(newItem);
    });
});
