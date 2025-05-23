const { Sequelize } = require('sequelize');
const path = require('path');

// NODE_ENV에 따라 다른 .env 파일 로드 또는 기본값 설정 (선택적)
// require('dotenv').config({ path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV || 'development'}`) });
// 간단하게 프로젝트 루트의 .env를 사용하려면 아래처럼 설정
// require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// 서버를 프로젝트 루트에서 실행하고, server/src/index.js에서 이미 dotenv를 설정한다면 여기선 필요 없을 수 있음

const storagePath = process.env.SQLITE_STORAGE_PATH || path.join(__dirname, '../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath, // 환경 변수 또는 기본값 사용
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // 개발 모드에서만 로깅
});

const Menu = require('./Menu')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Menu = Menu;
db.Order = Order;

module.exports = db; 