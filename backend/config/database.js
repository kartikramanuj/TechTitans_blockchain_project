const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
};

async function ensureDatabaseExists() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await connection.end();
  } catch (error) {
    console.warn('Note: Database creation check skipped or failed. This is normal if using a managed database service.');
  }
}

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  dialect: 'mysql',
  port: dbConfig.port,
  logging: false,
  dialectOptions: {
    connectTimeout: 60000
  }
});

module.exports = { sequelize, ensureDatabaseExists };
