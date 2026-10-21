import React from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import config from '../functions/config';
import { fonts } from '../styles/common';

const HomeHeader = () => {
  const { height } = useWindowDimensions();

  return (
    <View style={[styles.container, { height: height / 1.25 }]}>
      <Text style={styles.titleText}>Bit Wand</Text>
      <Text style={styles.text}>The Bitcoin payment card.</Text>
      {!config.isMainnet && <Text style={styles.testnet}>TESTNET: coins have no value</Text>}
      <Image source={require('../assets/images/animations/card_bitcoin.gif')} style={styles.image} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 50,
  },
  titleText: {
    fontFamily: fonts.title,
    color: '#fff',
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 32,
    marginHorizontal: 8,
  },
  text: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  testnet: {
    fontFamily: fonts.body,
    color: '#ffd400',
    fontSize: 16,
    marginTop: 8,
  },
  image: {
    width: '100%',
    flex: 0.7,
  },
});

export default HomeHeader;
