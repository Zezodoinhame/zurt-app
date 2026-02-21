import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'zurt_user_pin';
const SESSION_KEY = 'zurt_session';

export async function checkBiometricAvailability(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Autentique-se para acessar o ZURT',
    cancelLabel: 'Usar senha',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_KEY);
  return storedPin === pin;
}

export async function hasPin(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return pin !== null;
}

export async function saveSession(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function getSession(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(PIN_KEY);
}
