module.exports = {
  isLoggedIn: (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
  },
  
  hasRole: (roles) => {
    return (req, res, next) => {
      if (req.session.user && roles.includes(req.session.user.role)) {
        return next();
      }
      res.status(403).send('Unauthorized');
    };
  }
};
