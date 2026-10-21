import React from 'react';
import { StyleSheet, View, Text, Image, ImageSourcePropType, Pressable, useWindowDimensions } from 'react-native';
import { fonts } from '../styles/common';

type CustomButtonProps = {
  text: string;
  onPress?: () => void;
  imageSource?: ImageSourcePropType;
  buttonShape?: 'square';
  disabled?: boolean;
};

const CustomButton: React.FC<CustomButtonProps> = ({ text, onPress, imageSource, buttonShape, disabled }) => {
  const { width: screenWidth } = useWindowDimensions();
  const containerHeight = imageSource ? 120 : 60;
  const buttonWidth = buttonShape === 'square' ? screenWidth * 0.375 : screenWidth * 0.8;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.shadowContainer, { width: buttonWidth, height: containerHeight }, disabled && styles.disabledContainer]}
    >
      <View style={styles.buttonContainer}>
        <View style={[styles.buttonView, disabled && styles.disabledButtonView]}>
          {imageSource && <Image source={imageSource} style={styles.buttonImage} />}
          <Text style={[styles.buttonText, disabled && styles.disabledButtonText]}>{text}</Text>
        </View>
      </View>
    </Pressable>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginVertical: 8,
  },
  buttonContainer: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 15,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  buttonView: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    flex: 1,
  },
  buttonImage: {
    width: 40,
    height: 40,
    marginBottom: 5,
    resizeMode: 'contain',
  },
  buttonText: {
    fontFamily: fonts.body,
    fontSize: 20,
    color: '#000000',
  },
  disabledButtonView: {
    backgroundColor: '#ebebeb',
  },
  disabledContainer: {
    opacity: 0.75,
  },
  disabledButtonText: {
    color: '#A9A9A9',
  },
});
