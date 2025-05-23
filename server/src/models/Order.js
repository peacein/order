module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    items: {
      type: DataTypes.JSON, // 주문한 상품 목록 (JSON 형태로 저장)
      allowNull: false
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING, // 주문 상태 (예: pending, completed, cancelled)
      allowNull: false,
      defaultValue: 'pending'
    }
  });
  return Order;
}; 