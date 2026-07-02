export function replaceAt(string, index, ch){
 if(index > string.length-1) return string;
 return string.substring(0, index) + ch + string.substring(index+1);
}
