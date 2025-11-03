const jwt = require("jsonwebtoken");
const { User } = require("../models");
require("dotenv").config();

exports.authenticate = async (req, res, next) => {
  // Try Authorization header first, then fall back to cookie token (HttpOnly)
  let token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  if (!token && req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: "Unauthorized: User not found" });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden: Admins only" });
  next();
};
