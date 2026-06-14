import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import MenuItemService from '../../services/MenuItemService.js';

describe('MenuItemService (unit)', () => {
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

    describe('getAllMenuItems', () => {
        test('parses every item price to a number', async () => {
            mockMenuItemModel.findAll.mockResolvedValue([
                { id: 1, name: 'Pizza', price: '10.50' },
                { id: 2, name: 'Burger', price: '8.00' },
            ]);

            const result = await menuItemService.getAllMenuItems();

            expect(result[0].price).toBe(10.5);
            expect(result[1].price).toBe(8.0);
            expect(typeof result[0].price).toBe('number');
        });

        test('returns [] for an empty menu', async () => {
            mockMenuItemModel.findAll.mockResolvedValue([]);
            expect(await menuItemService.getAllMenuItems()).toEqual([]);
        });
    });

    describe('getMenuItemById', () => {
        test('returns the item with a numeric price when found', async () => {
            mockMenuItemModel.findById.mockResolvedValue({ id: 1, name: 'Pizza', price: '10.50' });

            const result = await menuItemService.getMenuItemById(1);

            expect(result.price).toBe(10.5);
            expect(mockMenuItemModel.findById).toHaveBeenCalledWith(1);
        });

        test('returns undefined when not found (no price parsing)', async () => {
            mockMenuItemModel.findById.mockResolvedValue(undefined);

            const result = await menuItemService.getMenuItemById(999);

            expect(result).toBeUndefined();
        });
    });

    describe('createMenuItem', () => {
        test('persists then parses the price of the returned row', async () => {
            const newItem = { name: 'Pasta', price: 12.0, category: 'Main Course' };
            mockMenuItemModel.create.mockResolvedValue({ id: 3, ...newItem, price: '12.00' });

            const result = await menuItemService.createMenuItem(newItem);

            expect(result.price).toBe(12.0);
            expect(mockMenuItemModel.create).toHaveBeenCalledWith(newItem);
        });
    });

    describe('updateMenuItem', () => {
        test('parses the price of the updated row', async () => {
            mockMenuItemModel.update.mockResolvedValue({ id: 1, name: 'Pizza', price: '13.25' });

            const result = await menuItemService.updateMenuItem(1, { price: 13.25 });

            expect(result.price).toBe(13.25);
            expect(mockMenuItemModel.update).toHaveBeenCalledWith(1, { price: 13.25 });
        });

        test('returns undefined when the item does not exist', async () => {
            mockMenuItemModel.update.mockResolvedValue(undefined);
            expect(await menuItemService.updateMenuItem(999, {})).toBeUndefined();
        });
    });

    describe('deleteMenuItem', () => {
        test('delegates to the model and returns the deleted row', async () => {
            mockMenuItemModel.delete.mockResolvedValue({ id: 1 });
            const result = await menuItemService.deleteMenuItem(1);
            expect(result).toEqual({ id: 1 });
            expect(mockMenuItemModel.delete).toHaveBeenCalledWith(1);
        });
    });
});
