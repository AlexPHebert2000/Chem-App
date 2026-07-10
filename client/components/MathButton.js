import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function MathButton({}){
 return <Pressable>
  <Text style={styles.buttonText}>10^x</Text>
 </Pressable>
}
const styles = StyleSheet.create({
 buttonText:{
  fontFamily: 'Nunito_800ExtraBold',
  fontSize: 10,
  letterSpacing: 0.5,
  color: colors.purple600
 },
});
