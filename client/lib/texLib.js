import { replaceAt } from './string';

const SUPER_MAP = {
 "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
 "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
 "a": "ᵃ", "b": "ᵇ", "c": "ᶜ", "d": "ᵈ", "e": "ᵉ", "f": "ᶠ",
 "g": "ᵍ", "h": "ʰ", "i": "ⁱ", "j": "ʲ", "k": "ᵏ", "l": "ˡ",
 "m": "ᵐ", "n": "ⁿ", "o": "ᵒ", "p": "ᵖ", "r": "ʳ", "t": "ᵗ",
 "u": "ᵘ", "v": "ᵛ", "w": "ʷ", "x": "ˣ", "y": "ʸ", "z": "ᶻ",
 "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾"
};

const SUB_MAP = {
 "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
 "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
 "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ",
 "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ", "p": "ₚ", "r": "ᵣ",
 "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "x": "ₓ"
};

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
