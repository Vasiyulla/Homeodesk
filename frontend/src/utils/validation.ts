export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateLicenseNumber = (license: string): boolean => {
  return !!license && license.trim().length > 0;
};

export const validateAge = (age: string | number): boolean => {
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
  return !Number.isNaN(ageNum) && ageNum > 0 && ageNum < 150;
};

export const validateRequiredField = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value != null && value !== '';
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};
