const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const LastProcessedBlock = sequelize.define('LastProcessedBlock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = LastProcessedBlock;