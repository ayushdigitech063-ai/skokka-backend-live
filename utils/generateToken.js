import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'skokka_super_secret_jwt_key_2026_production', {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'skokka_refresh_secret_key_2026', {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};
