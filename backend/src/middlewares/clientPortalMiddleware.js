const jwt = require('jsonwebtoken');

exports.protectClientPortal = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, error: 'Not authorized - no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'client_portal') {
      return res.status(403).json({ success: false, error: 'Invalid token type for client portal' });
    }
    req.clientPortal = decoded; // { id, type, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalid or expired' });
  }
};
