import { textParseAndSet } from '../lib/texLib';
import { TextInput } from 'react-native';
import { useState } from 'react';

export function MathTextInput(props){ 
 const [textState, setTextState] = useState(0);
 return (
  <TextInput
   {...props}
   onChangeText={(newText)=>{
    textParseAndSet(props.value, newText, props.onChangeText, textState, setTextState);
   }}
  />
 );
}
