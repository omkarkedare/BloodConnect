export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!re.test(email)) return 'Invalid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validatePhone(phone) {
  if (!phone) return null; // optional
  const re = /^[+]?[\d\s-]{7,20}$/;
  if (!re.test(phone)) return 'Invalid phone number';
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateName(name, fieldName = 'Name', minLength = 2, maxLength = 150) {
  if (!name || (typeof name === 'string' && !name.trim())) {
    return `${fieldName} is required`;
  }
  if (/[\n\r\t]/.test(name)) {
    return `${fieldName} cannot contain newlines or tabs`;
  }
  const cleanName = name.trim();
  if (cleanName.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  if (cleanName.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters`;
  }
  if (/[\d\p{N}]/u.test(cleanName)) {
    return `${fieldName} cannot contain numeric digits`;
  }
  if (!/^[\p{L}\p{M} .'-]+$/u.test(cleanName)) {
    return `${fieldName} can only contain letters, spaces, hyphens, periods, and apostrophes`;
  }
  if (!/\p{L}/u.test(cleanName)) {
    return `${fieldName} must contain at least one letter`;
  }
  return null;
}
