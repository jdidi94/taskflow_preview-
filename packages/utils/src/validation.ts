/**
 * Email validation utility
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  score: number; // 0-4 (very weak to very strong)
  feedback: string[];
  isValid: boolean;
}

export function validatePassword(password: string, minLength = 8): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long`);
  } else {
    score += 1;
  }

  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Contains numbers
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Contains special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  return {
    score: Math.min(score, 4),
    feedback,
    isValid: score >= 4 && password.length >= minLength,
  };
}

/**
 * URL validation
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Phone number validation (basic)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  const digits = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digits.length >= 7 && digits.length <= 15;
}

/**
 * Credit card validation (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Required field validation
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Number range validation
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Generic form validation helper
 */
export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateField<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: isRequired,
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: isValidEmail,
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => value.length >= length,
    message: message || `Must be at least ${length} characters long`,
  }),

  maxLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => value.length <= length,
    message: message || `Must be no more than ${length} characters long`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value: string) => regex.test(value),
    message,
  }),

  min: (minimum: number, message?: string): ValidationRule<number> => ({
    validate: (value: number) => value >= minimum,
    message: message || `Must be at least ${minimum}`,
  }),

  max: (maximum: number, message?: string): ValidationRule<number> => ({
    validate: (value: number) => value <= maximum,
    message: message || `Must be no more than ${maximum}`,
  }),
};
