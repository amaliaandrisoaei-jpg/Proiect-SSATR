export default class TableService {
    constructor(tableModel, io) {
        this.tableModel = tableModel;
        this.io = io;
    }

    async getAllTables() {
        return await this.tableModel.findAll();
    }

    async getTableById(id) {
        return await this.tableModel.findById(id);
    }

    async createTable(data) {
        return await this.tableModel.create(data);
    }

    async updateTable(id, data) {
        return await this.tableModel.update(id, data);
    }

    async deleteTable(id) {
        return await this.tableModel.delete(id);
    }

    async updateTableStatus(id, status) {
        const updatedTable = await this.tableModel.updateStatus(id, status);
        if (updatedTable && this.io) {
            this.io.emit('tableStatusUpdate', updatedTable);
        }
        return updatedTable;
    }
}
