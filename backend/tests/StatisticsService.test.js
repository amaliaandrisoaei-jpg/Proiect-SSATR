import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import StatisticsService from '../services/StatisticsService.js';

describe('StatisticsService', () => {
    let statisticsService;
    let mockStatisticsModel;
    let mockIo;

    beforeEach(() => {
        mockStatisticsModel = {
            getFullStatistics: jest.fn(),
        };
        mockIo = {
            emit: jest.fn(),
        };
        statisticsService = new StatisticsService(mockStatisticsModel, mockIo);
    });

    test('getStatistics should call model.getFullStatistics', async () => {
        const mockStats = { totalRevenue: 100 };
        mockStatisticsModel.getFullStatistics.mockResolvedValue(mockStats);

        const result = await statisticsService.getStatistics();

        expect(result).toEqual(mockStats);
        expect(mockStatisticsModel.getFullStatistics).toHaveBeenCalled();
    });

    test('emitStatistics should fetch stats and emit via socket', async () => {
        const mockStats = { totalRevenue: 150 };
        mockStatisticsModel.getFullStatistics.mockResolvedValue(mockStats);

        const result = await statisticsService.emitStatistics();

        expect(result).toEqual(mockStats);
        expect(mockIo.emit).toHaveBeenCalledWith('statisticsUpdate', mockStats);
    });
});
