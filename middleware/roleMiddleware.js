// Only some roles can pass — use AFTER authMiddleware
// e.g. roleMiddleware("company")  or  roleMiddleware("company", "admin")
const roleMiddleware =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to do this.",
      });
    }
    next();
  };

module.exports = roleMiddleware;
