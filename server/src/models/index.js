const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

const Menu = require('./Menu')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Menu = Menu;
db.Order = Order;

module.exports = db; 