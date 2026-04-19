export default class OrderItemService {
    constructor(orderItemModel) {
        this.orderItemModel = orderItemModel;
    }

    async getAllOrderItems() {
        return await this.orderItemModel.findAll();
    }

    async getOrderItemById(id) {
        return await this.orderItemModel.findById(id);
    }

    async createOrderItem(data) {
        return await this.orderItemModel.create(data);
    }

    async updateOrderItem(id, data) {
        return await this.orderItemModel.update(id, data);
    }

    async deleteOrderItem(id) {
        return await this.orderItemModel.delete(id);
    }
}
