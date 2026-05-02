const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  userAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('userAddress', value.toLowerCase());
    }
  },
  cid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cidHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assignedVerifier: {
    type: DataTypes.STRING,
    allowNull: true,
    set(value) {
      if (value) this.setDataValue('assignedVerifier', value.toLowerCase());
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  verifiedBy: {
    type: DataTypes.STRING,
    set(value) {
      if (value) this.setDataValue('verifiedBy', value.toLowerCase());
    }
  },
  verifiedAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: false,
  indexes: [
    { fields: ['status'] },
    { fields: ['assignedVerifier'] }
  ]
});

module.exports = Document;
