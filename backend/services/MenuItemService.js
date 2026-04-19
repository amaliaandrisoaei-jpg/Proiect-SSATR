export default class MenuItemService {
    constructor(menuItemModel) {
        this.menuItemModel = menuItemModel;
    }

    async getAllMenuItems() {
        const items = await this.menuItemModel.findAll();
        return items.map(item => ({
            ...item,
            price: parseFloat(item.price)
        }));
    }

    async getMenuItemById(id) {
        const item = await this.menuItemModel.findById(id);
        if (item) {
            item.price = parseFloat(item.price);
        }
        return item;
    }

    async createMenuItem(data) {
        const item = await this.menuItemModel.create(data);
        if (item) {
            item.price = parseFloat(item.price);
        }
        return item;
    }

    async updateMenuItem(id, data) {
        const item = await this.menuItemModel.update(id, data);
        if (item) {
            item.price = parseFloat(item.price);
        }
        return item;
    }

    async deleteMenuItem(id) {
        return await this.menuItemModel.delete(id);
    }
}
