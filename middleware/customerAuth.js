const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const customerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const secret = process.env.JWT_CUSTOMER_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    if (decoded.role !== 'customer') {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const customer = await Customer.findById(decoded.id).select('-password');
    if (!customer) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.customer = customer;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = customerAuth;
