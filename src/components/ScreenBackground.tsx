// Full-screen background image (React Native deprecated ImageBackground in 0.87).

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ScreenBackground = ({ children }: { children?: React.ReactNode }) => (
  <View style={styles.container}>
    <Image source={require('../assets/images/backgrounds/bitwand_background.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
    {children}
  </View>
);

export default ScreenBackground;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
