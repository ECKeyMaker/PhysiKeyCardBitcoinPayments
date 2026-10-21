/**
 * Password + confirmation fields. Both are required because a mistyped password doesn't fail:
 * it silently opens a different (empty) wallet.
 */

import { useCallback, useState } from 'react';
import emojiRegex from 'emoji-regex';

// Changing this doesn't move existing wallets, but raising it locks out users whose existing
// password is shorter, because the same check guards card login.
export const MIN_PASSWORD_LENGTH = 4;

const validatePassword = (text: string): string | null => {
  if (text.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (emojiRegex().test(text)) {
    return 'Password cannot contain emojis.';
  }
  return null;
};

const useVerifyPasswords = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetPasswords = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
  }, []);

  const passwordError = password ? validatePassword(password) : null;
  const matchError = confirmPassword && confirmPassword !== password ? 'Passwords are not the same.' : null;

  return {
    password,
    confirmPassword,
    isMatch: password !== '' && !passwordError && confirmPassword === password,
    error: passwordError ?? matchError,
    handlePasswordChange: setPassword,
    handleConfirmPasswordChange: setConfirmPassword,
    resetPasswords,
  };
};

export default useVerifyPasswords;
