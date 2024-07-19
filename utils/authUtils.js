const mydb = require("../config/database.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const crypto = require("crypto");

const hashPassword = async (password) => {
  const saltRounds = 10; // Adjust the number of salt rounds as needed
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

function generateAccessToken(user, menues) {
  const payload = {
    user: {
      id: user.id,
      username: user.username,
      branchId: user.branch_id,
    },
    menues: menues,
  };

  const options = {
    expiresIn: "1m", // Set the expiration time for the access token
    algorithm: "HS256", // Use the appropriate algorithm for signing the token
  };

  const secretKey = process.env.ACCESS_TOKEN_SECRET; // Store the secret key securely

  return jwt.sign(payload, secretKey, options);
}
function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

const verifyToken = async (req, res, next) => {
  try {
    console.log("entered the verify");

    // Retrieve the access token from the request headers
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      // If no token is provided, return a 401 Unauthorized error
      return res.status(401).json({ error: "No token provided" });
    }

    console.log("Token :: ", token);

    // if token has "" it causes error
    // Verify the access token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user in the database based on the decoded user ID
    const user = await mydb.getrow(
      `select * from users where id=${decoded.user.id}`
    );

    console.log("User :: ", user);

    if (!user) {
      // If the user is not found, the token is invalid
      return res.status(401).json({ error: "Invalid token" });
    }

    // Store the decoded token data in the request object for later use
    req.user = decoded;

    // Call the next middleware function
    next();
  } catch (error) {
    console.log(error);
    console.log(error.name == "TokenExpiredError");
    // If the token is invalid or has expired, return a 401 Unauthorized error
    res.status(401).json({ error: "Invalid token" });
  }
};

async function updateRefreshToken(userId, newRefreshToken) {
  // Implement the logic to update the user's refresh token in the database or other storage
  await mydb.update(
    `update users set refresh_token='${newRefreshToken}' where id=${parseInt(
      userId
    )}`
  );
}

module.exports = {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  updateRefreshToken,
};
