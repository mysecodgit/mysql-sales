const mysql = require("mysql2/promise");

// let conInfo = {
//   database: "",
//   host: "",
//   user: "",
//   password: "",
//   port: ,
// };

// const db = mysql.createConnection(conInfo);

// db.then((res) => {
//   console.log(`mysql db : ${res.config.database} has connected.`);
// }).catch((err) => {
//   if (err) throw err;
// });

// module.exports = db;

module.exports = async () => {
  try {
    // create the connection to database
    const connection = await mysql.createConnection({
      database: "",
      host: "",
      user: "",
      password: "",
      port: 0,
    });

    console.log("connected to db");

    return connection;
  } catch (err) {
    console.log(err);
  }
};
