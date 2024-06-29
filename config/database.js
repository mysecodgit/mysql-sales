const Db = require("mysql2-async").default;
require("dotenv").config();

const mydb = new Db({
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  skiptzfix: true,
});

module.exports = mydb;
