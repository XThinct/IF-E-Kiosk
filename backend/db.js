const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host:     process.env.DB_HOST     || "localhost",
        port:     Number(process.env.DB_PORT || 5432),
        user:     process.env.DB_USER     || "postgres",
        password: process.env.DB_PASSWORD || process.env.DB_PASS || "postgres",
        database: process.env.DB_NAME     || "ekiosk",
      }
);

const init = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database ready.");
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

init();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};