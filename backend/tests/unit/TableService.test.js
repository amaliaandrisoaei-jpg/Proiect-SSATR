import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import TableService from '../../services/TableService.js';

describe('TableService (unit)', () => {
    let tableService;
    let mockTableModel;
    let mockIo;

    beforeEach(() => {
        mockTableModel = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            updateStatus: jest.fn(),
        };
        mockIo = { emit: jest.fn() };
        tableService = new TableService(mockTableModel, mockIo);
    });

    describe('plain CRUD pass-through', () => {
        test('getAllTables delegates to the model', async () => {
            mockTableModel.findAll.mockResolvedValue([{ id: 1, status: 'available' }]);
            expect(await tableService.getAllTables()).toEqual([{ id: 1, status: 'available' }]);
            expect(mockTableModel.findAll).toHaveBeenCalledTimes(1);
        });

        test('getTableById delegates to the model', async () => {
            mockTableModel.findById.mockResolvedValue({ id: 2 });
            expect(await tableService.getTableById(2)).toEqual({ id: 2 });
            expect(mockTableModel.findById).toHaveBeenCalledWith(2);
        });

        test('createTable delegates to the model', async () => {
            const data = { qr_code: 'qr-1', status: 'available' };
            mockTableModel.create.mockResolvedValue({ id: 3, ...data });
            expect(await tableService.createTable(data)).toMatchObject({ id: 3 });
            expect(mockTableModel.create).toHaveBeenCalledWith(data);
        });

        test('updateTable delegates to the model', async () => {
            mockTableModel.update.mockResolvedValue({ id: 4, status: 'occupied' });
            expect(await tableService.updateTable(4, { status: 'occupied' })).toMatchObject({ status: 'occupied' });
            expect(mockTableModel.update).toHaveBeenCalledWith(4, { status: 'occupied' });
        });

        test('deleteTable delegates to the model', async () => {
            mockTableModel.delete.mockResolvedValue({ id: 5 });
            expect(await tableService.deleteTable(5)).toEqual({ id: 5 });
            expect(mockTableModel.delete).toHaveBeenCalledWith(5);
        });
    });

    describe('updateTableStatus', () => {
        test('updates the model and emits tableStatusUpdate', async () => {
            const updatedTable = { id: 1, qr_code: 'table-1', status: 'occupied' };
            mockTableModel.updateStatus.mockResolvedValue(updatedTable);

            const result = await tableService.updateTableStatus(1, 'occupied');

            expect(result).toEqual(updatedTable);
            expect(mockTableModel.updateStatus).toHaveBeenCalledWith(1, 'occupied');
            expect(mockIo.emit).toHaveBeenCalledWith('tableStatusUpdate', updatedTable);
        });

        test('does NOT emit when the table does not exist', async () => {
            mockTableModel.updateStatus.mockResolvedValue(undefined);

            const result = await tableService.updateTableStatus(999, 'occupied');

            expect(result).toBeUndefined();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        test('does NOT emit when no io is configured', async () => {
            const noIoService = new TableService(mockTableModel, null);
            mockTableModel.updateStatus.mockResolvedValue({ id: 1, status: 'occupied' });

            const result = await noIoService.updateTableStatus(1, 'occupied');

            expect(result).toMatchObject({ status: 'occupied' });
            expect(mockIo.emit).not.toHaveBeenCalled();
        });
    });
});
