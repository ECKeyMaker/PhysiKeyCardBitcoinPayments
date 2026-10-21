import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeHeader from '../components/HomeHeader';
import CustomButton from '../components/CustomButton';
import ScreenBackground from '../components/ScreenBackground';
import config from '../functions/config';
import useDefaultLogin from '../hooks/useDefaultLogin';
import { openWebView, type ScreenProps } from '../navigation';

const LandingScreen = ({ navigation }: ScreenProps<'LandingScreen'>) => {
  const { defaultLogin, loading } = useDefaultLogin();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <LinearGradient colors={['rgba(217, 217, 217, 0.5)', 'rgba(255, 255, 255, 0.2)']} style={StyleSheet.absoluteFill} />
        <HomeHeader />
      </View>
      <View style={[styles.buttonContainer, { bottom: insets.bottom + 24 }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <CustomButton text="Accept Card Payment" imageSource={require('../assets/images/icons/send.png')} onPress={defaultLogin} />
        )}
        <CustomButton text="Card Management" onPress={() => navigation.navigate('CardManagementScreen')} />
        {config.storeUrl !== '' && (
          <Pressable onPress={() => openWebView(navigation, config.storeUrl, 'Store')}>
            <Text style={styles.linkText}>Don't have a card? Buy one here.</Text>
          </Pressable>
        )}
      </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  buttonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  linkText: {
    color: '#fff',
    margin: 8,
    textDecorationLine: 'underline',
  },
});

export default LandingScreen;
