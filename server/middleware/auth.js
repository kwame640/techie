export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token.' 
    });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const email = decoded.split(':')[0];
    
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
    
    req.adminEmail = email;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token.' 
    });
  }
};
