module.exports = {
  isLoggedIn: (req, res, next) => {
    if (req.session.user) return next();
    // Redirect with message for better user experience
    res.redirect('/auth/login?error=Session%20Expired');
  },
  
  hasRole: (roles) => {
    return (req, res, next) => {
      if (req.session.user && roles.includes(req.session.user.role)) {
        return next();
      }
      res.status(403).render('404', { 
        user: req.session.user || null,
        pageTitle: 'Forbidden' 
      });
    };
  }
};
