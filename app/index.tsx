// Required crypto polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// React Native imports
// Register the main app
import { registerRootComponent } from 'expo';
import App from '../App';

registerRootComponent(App);

