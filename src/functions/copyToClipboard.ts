import { Alert, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

const copyToClipboard = (text: string) => {
  Clipboard.setString(text);
  // Android 13+ shows its own clipboard confirmation.
  if (Platform.OS === 'ios') {
    Alert.alert('Copied', 'The address has been copied to the clipboard.');
  }
};

export default copyToClipboard;
