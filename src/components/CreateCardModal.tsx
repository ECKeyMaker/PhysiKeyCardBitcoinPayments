/** Turns a blank NFC card into a Bitcoin wallet. See useCardSetup for the steps. */

import React, { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import AndroidScanModal from './AndroidScanModal';
import { saveAccount } from '../functions/asyncStorage';
import useCardSetup from '../hooks/useCardSetup';
import useVerifyPasswords from '../hooks/useVerifyPasswords';
import { openAccount, type AppNavigation } from '../navigation';
import { colors, sheet } from '../styles/common';

type CreateCardModalProps = {
  visible: boolean;
  closeCreateCardModal: () => void;
};

const CreateCardModal: React.FC<CreateCardModalProps> = ({ visible, closeCreateCardModal }) => {
  const navigation = useNavigation<AppNavigation>();
  const { step, address, busy, error, writeCard, lockCard, reset, skipLock, scanModal, closeScanModal } = useCardSetup();
  const { password, confirmPassword, isMatch, error: passwordError, handlePasswordChange, handleConfirmPasswordChange, resetPasswords } =
    useVerifyPasswords();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!visible) {
      setName('');
      reset();
      resetPasswords();
    }
  }, [visible, reset, resetPasswords]);

  const handleWrite = () => {
    const typedPassword = password;
    resetPasswords();
    writeCard(typedPassword);
  };

  const finish = async (save: boolean) => {
    if (save) {
      await saveAccount(name, address);
    }
    closeCreateCardModal();
    openAccount(navigation, { address, accountType: 'card' });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={sheet.title}>Choose a password</Text>
            <Text style={sheet.text}>
              (1/2) This turns your card into a Bitcoin wallet and locks it. The card and this password together are the wallet:
              there is no way to recover the password, so write it down somewhere safe.
            </Text>
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
            {(passwordError || error) && <Text style={sheet.errorText}>{passwordError ?? error}</Text>}
            <CustomButton text="Tap Card to Set Up" disabled={!isMatch} onPress={handleWrite} />
            <CustomButton text="Cancel" onPress={closeCreateCardModal} />
          </>
        );
      case 1:
        return (
          <>
            <Text style={sheet.title}>Scan the card again to lock it</Text>
            <Text style={sheet.text}>(2/2) Locking stops the card from being overwritten or erased by accident.</Text>
            {error && <Text style={sheet.errorText}>{error}</Text>}
            <CustomButton
              text="Tap Card to Lock"
              imageSource={require('../assets/images/icons/nfc_icon.png')}
              onPress={lockCard}
            />
            {error && <CustomButton text="Skip Locking" onPress={skipLock} />}
          </>
        );
      default:
        return (
          <>
            <Text style={sheet.title}>Save this account?</Text>
            <Text style={sheet.mutedText}>Saved accounts can be opened to check the balance without tapping the card.</Text>
            <TextInput
              style={[sheet.input, sheet.inputContainer]}
              value={name}
              onChangeText={setName}
              placeholder="Account name"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              selectionColor="black"
            />
            <CustomButton text="Save & Log In" disabled={name.trim().length < 1} onPress={() => finish(true)} />
            <CustomButton text="No Thanks, Log In" onPress={() => finish(false)} />
          </>
        );
    }
  };

  return (
    <>
      <BottomSheet visible={visible && !scanModal} onClose={closeCreateCardModal} loading={busy}>
        {renderStep()}
      </BottomSheet>
      <AndroidScanModal visible={scanModal} closeScanModal={closeScanModal} />
    </>
  );
};

export default CreateCardModal;
