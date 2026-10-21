import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import CardManagementScreen from './src/screens/CardManagementScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import config from './src/functions/config';
import type { RootStackParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => (
  <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LandingScreen">
        <Stack.Screen name="LandingScreen" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{ title: config.isMainnet ? 'Bit Wand' : 'Bit Wand (Testnet)', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen name="CardManagementScreen" component={CardManagementScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WebView" component={WebViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </SafeAreaProvider>
);

export default App;
