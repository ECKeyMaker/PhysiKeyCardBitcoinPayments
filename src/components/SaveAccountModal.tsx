import React, { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import BottomSheet from './BottomSheet';
import CustomButton from './CustomButton';
import { saveAccount } from '../functions/asyncStorage';
import { colors, sheet } from '../styles/common';

type SaveAccountProps = {
  visible: boolean;
  closeSaveAccountModal: () => void;
  address: string;
};

const SaveAccountModal: React.FC<SaveAccountProps> = ({ visible, closeSaveAccountModal, address }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    try {
      await saveAccount(name, address);
      closeSaveAccountModal();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={closeSaveAccountModal}>
      <Text style={sheet.title}>Save Account</Text>
      <Text style={sheet.mutedText}>Only the address is saved. You'll still need the card and password to send.</Text>
      <TextInput
        style={[sheet.input, sheet.inputContainer]}
        value={name}
        onChangeText={setName}
        placeholder="Account name"
        placeholderTextColor={colors.placeholder}
        selectionColor="#000"
      />
      {error && <Text style={sheet.errorText}>{error}</Text>}
      <CustomButton text="Save Account" disabled={name.trim().length < 1} onPress={handleSave} />
      <CustomButton text="Cancel" onPress={closeSaveAccountModal} />
    </BottomSheet>
  );
};

export default SaveAccountModal;
