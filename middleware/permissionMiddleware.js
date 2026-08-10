export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Super Admin bypasses all individual permission checks
    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (
      !req.admin.permissions ||
      !req.admin.permissions.includes(requiredPermission)
    ) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You lack the '${requiredPermission}' permission.`,
      });
    }

    next();
  };
};
