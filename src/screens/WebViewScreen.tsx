import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ScreenProps } from '../navigation';

const WebViewScreen = ({ route, navigation }: ScreenProps<'WebView'>) => {
  const { url, title } = route.params;
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <WebView
        source={{ uri: url }}
        style={styles.container}
        // Explorer and store pages only: no file access, and only https links load in-app.
        originWhitelist={['https://*']}
        allowFileAccess={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default WebViewScreen;
