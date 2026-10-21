/**
 * Bottom-sheet modal used by every flow (send, accept, card setup, login). Handles the
 * keyboard, the dimmed backdrop and the bottom safe-area inset (Android draws edge-to-edge).
 */

import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/common';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  children?: React.ReactNode;
};

const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, loading, children }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={loading ? () => {} : onClose} navigationBarTranslucent statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" style={styles.loading} />
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.backdrop,
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loading: {
    marginVertical: 64,
  },
});
