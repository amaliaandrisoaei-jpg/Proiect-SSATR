import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import StatisticsService from '../../services/StatisticsService.js';

describe('StatisticsService (unit)', () => {
    let statisticsService;
    let mockStatisticsModel;
    let mockIo;

    beforeEach(() => {
        mockStatisticsModel = {
            getFullStatistics: jest.fn(),
        };
        mockIo = { emit: jest.fn() };
        statisticsService = new StatisticsService(mockStatisticsModel, mockIo);
    });

    describe('getStatistics', () => {
        test('delegates to the model', async () => {
            const mockStats = { totalRevenue: 100, totalTables: 4 };
            mockStatisticsModel.getFullStatistics.mockResolvedValue(mockStats);

            const result = await statisticsService.getStatistics();

            expect(result).toEqual(mockStats);
            expect(mockStatisticsModel.getFullStatistics).toHaveBeenCalledTimes(1);
        });
    });

    describe('emitStatistics', () => {
        test('fetches the stats and broadcasts statisticsUpdate', async () => {
            const mockStats = { totalRevenue: 150 };
            mockStatisticsModel.getFullStatistics.mockResolvedValue(mockStats);

            const result = await statisticsService.emitStatistics();

            expect(result).toEqual(mockStats);
            expect(mockIo.emit).toHaveBeenCalledWith('statisticsUpdate', mockStats);
        });

        test('passes a transaction client through to the model', async () => {
            const client = { query: jest.fn() };
            mockStatisticsModel.getFullStatistics.mockResolvedValue({});

            await statisticsService.emitStatistics(client);

            expect(mockStatisticsModel.getFullStatistics).toHaveBeenCalledWith(client);
        });

        test('still returns the stats but does not emit when no io is configured', async () => {
            const noIoService = new StatisticsService(mockStatisticsModel, null);
            const mockStats = { totalRevenue: 0 };
            mockStatisticsModel.getFullStatistics.mockResolvedValue(mockStats);

            const result = await noIoService.emitStatistics();

            expect(result).toEqual(mockStats);
            expect(mockIo.emit).not.toHaveBeenCalled();
        });
    });
});
