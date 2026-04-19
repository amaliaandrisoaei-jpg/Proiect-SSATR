export default class StatisticsService {
    constructor(statisticsModel, io) {
        this.statisticsModel = statisticsModel;
        this.io = io;
    }

    async getStatistics() {
        return await this.statisticsModel.getFullStatistics();
    }

    async emitStatistics(client = null) {
        const stats = await this.statisticsModel.getFullStatistics(client);
        if (this.io) {
            this.io.emit('statisticsUpdate', stats);
        }
        return stats;
    }
}
