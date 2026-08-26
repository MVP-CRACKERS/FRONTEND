const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { AppError, asyncHandler } = require('../utils/AppError');
const Admin = require('../models/Admin');

function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin._id), role: admin.role, email: admin.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.headers['x-admin-token']) return String(req.headers['x-admin-token']).trim();
  return null;
}

/** Requires a valid, non-expired token belonging to an active admin. */
const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw AppError.unauthorized('Please sign in to continue.');

  const payload = jwt.verify(token, config.jwtSecret);

  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw AppError.unauthorized('This account is no longer active.');
  }

  req.admin = admin;
  next();
});

/** Restricts a route to specific admin roles. */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.admin) return next(AppError.unauthorized());
    if (!roles.includes(req.admin.role)) return next(AppError.forbidden());
    return next();
  };

module.exports = { signAdminToken, requireAdmin, requireRole };
