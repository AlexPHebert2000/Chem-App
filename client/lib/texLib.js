import { replaceAt } from './string';

const SUPER_MAP = {
 "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
 "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};

const REV_SUPER_MAP = {
 "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
 "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9"};


const SUB_MAP = {
 "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
 "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉"};

const REV_SUB_MAP = {
 "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
 "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9"};

export function textParseServ(text){
 let i = 0;
 let newText = "";
 if(text == undefined)return "";
 if(text?.length == undefined)return "";
 while(i < text.length){
  if(text[i] == "^"){
   i++;
   while(text[i] != ")" && i < text.length){
    newText = newText + SUPER_MAP[text[i]];
    i++;
   }
   if(i == text.length)return newText;
   i++;
   newText = newText + " ";
  }
  if(text[i] == "_"){
   i++;
   while(text[i] != ")" && i < text.length){
    newText = newText + SUB_MAP[text[i]];
    i++;
   }
   if(text.length == i)return newText;
   i++;
   newText = newText + " ";
  }
  if(i < text.length){
   newText = newText + text[i];
  }
  i++;
 }
 return newText;
}

export function textParseRev(text){
 let i = 0;
 let newText = "";
 while(i < text.length){
  if(REV_SUPER_MAP[text[i]]){
   newText = newText + "^(";
   while((i < text.length) && (REV_SUPER_MAP[text[i]])){
    newText = newText + REV_SUPER_MAP[text[i]];
    i++;
   }
   newText = newText + ")";
  }
  if(REV_SUB_MAP[text[i]]){
   newText = newText + "_(";
   while((i < text.length) && (REV_SUB_MAP[text[i]])){
    newText = newText + REV_SUB_MAP[text[i]];
    i++;
   }
   newText = newText + ")";
  }
  if(i < text.length){
   newText = newText + text[i];
  }
  i++;
 }
 return newText;
}

export function textParseAndSet(oldText, newText, setText, textState, setTextState){
 let character = newText.charAt(newText.length-1);
 switch(textState){
 case 0:{ //normalState
  if(oldText.length > newText){
   setText(newText);
   return;
  }
  switch(character){
  case '^':
   setTextState(1);
   break;
  case '_':
   setTextState(2);
   break;
  default:
   setText(newText);
  }
  return;
  break;
 }
 case 1:{ //exponent
  switch(character){
  case '^':
   setText(newText);
   break;
  case ' ':
   setTextState(0);
   setText(newText);
   break;
  default:
   let lower = character.toLowerCase();
   newText = replaceAt(newText, (newText.length-1), (SUPER_MAP[character] ?? SUPER_MAP[lower] ?? character));
   setText(newText);
   break;
  }
  break;
 }
 case 2:{ //subscript
  switch(character){
  case '_':
   setText(newText);
   break;
  case ' ':
   setTextState(0);
   setText(newText);
   break;
  default:
   let lower = character.toLowerCase();
   newText = replaceAt(newText, (newText.length-1), (SUB_MAP[character] ?? SUB_MAP[lower] ?? character));
   setText(newText);
   break;
  }
  break;
 }
 }
 return;
}
