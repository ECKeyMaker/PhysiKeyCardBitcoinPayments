/** Card login: the card has been read; the user enters (and confirms) its password. */

import React, { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import { deriveAddress } from '../functions/deriveKey';
import errorMessage from '../functions/errorMessage';
import useVerifyPasswords from '../hooks/useVerifyPasswords';
import { openAccount, type AppNavigation } from '../navigation';
import { colors, sheet } from '../styles/common';

type PasswordModalProps = {
  visible: boolean;
  closePasswordModal: () => void;
  cardText: string;
  foreignCard: boolean;
};

const PasswordModal: React.FC<PasswordModalProps> = ({ visible, closePasswordModal, cardText, foreignCard }) => {
  const navigation = useNavigation<AppNavigation>();
  const { password, confirmPassword, isMatch, error, handlePasswordChange, handleConfirmPasswordChange, resetPasswords } =
    useVerifyPasswords();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      resetPasswords();
      setLoginError(null);
    }
  }, [visible, resetPasswords]);

  const handleLogin = async () => {
    const typedPassword = password;
    resetPasswords();
    setLoading(true);
    try {
      /** DO NOT CHANGE CARD + PASSWORD ORDER */
      const address = await deriveAddress(cardText, typedPassword);
      closePasswordModal();
      openAccount(navigation, { address, accountType: 'card', foreignCard });
    } catch (e) {
      setLoginError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={closePasswordModal} loading={loading}>
      <Text style={sheet.title}>Password</Text>
      {foreignCard && <Text style={sheet.errorText}>Warning: this card was not set up in Bit Wand.</Text>}
      <Text style={sheet.mutedText}>A different password opens a different wallet, so type it carefully.</Text>
      <TextInput
        style={[sheet.input, sheet.inputContainer]}
        value={password}
        onChangeText={handlePasswordChange}
        placeholder="Password"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        selectionColor="#000"
        autoCapitalize="none"
      />
      <TextInput
        style={[sheet.input, sheet.inputContainer]}
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        placeholder="Confirm password"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        selectionColor="#000"
        autoCapitalize="none"
      />
      {(error || loginError) && <Text style={sheet.errorText}>{error ?? loginError}</Text>}
      <CustomButton text="Log In" disabled={!isMatch} onPress={handleLogin} />
      <CustomButton text="Cancel" onPress={closePasswordModal} />
    </BottomSheet>
  );
};

export default PasswordModal;
