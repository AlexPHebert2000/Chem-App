import {Alert, Platform} from 'react-native';

export function alertLib(title, message){
 if(Platform.OS == 'ios' || Platform.OS == 'android'){
  Alert.alert(title, message);
 }else {
  window.alert(`${title}\n\n${message ?? ""}`.trim());
 }
 return;
}
