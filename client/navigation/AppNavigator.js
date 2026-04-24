import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import { View } from 'react-native';
import { colors } from '../theme';

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  // Blank screen while restoring session
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.neutral50 }} />;
  }

  return (
    <NavigationContainer>
      {user ? null /* TODO: main app navigator */ : <AuthNavigator />}
    </NavigationContainer>
  );
}
