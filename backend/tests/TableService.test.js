import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import TableService from '../services/TableService.js';

describe('TableService', () => {
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
        mockIo = {
            emit: jest.fn(),
        };
        tableService = new TableService(mockTableModel, mockIo);
    });

    test('updateTableStatus should update model and emit socket event', async () => {
        const updatedTable = { id: 1, qr_code: 'table-1', status: 'occupied' };
        mockTableModel.updateStatus.mockResolvedValue(updatedTable);

        const result = await tableService.updateTableStatus(1, 'occupied');

        expect(result).toEqual(updatedTable);
        expect(mockTableModel.updateStatus).toHaveBeenCalledWith(1, 'occupied');
        expect(mockIo.emit).toHaveBeenCalledWith('tableStatusUpdate', updatedTable);
    });

    test('getAllTables should call model.findAll', async () => {
        const mockTables = [{ id: 1, status: 'available' }];
        mockTableModel.findAll.mockResolvedValue(mockTables);

        const result = await tableService.getAllTables();

        expect(result).toEqual(mockTables);
        expect(mockTableModel.findAll).toHaveBeenCalled();
    });
});
