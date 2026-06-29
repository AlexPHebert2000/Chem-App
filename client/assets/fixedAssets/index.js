export const FIXED_IMAGES = [
 { name: "Sulfur Model", id: 0, source:require('../../assets/fixedAssets/SulfurModel.png'), desc:"A atom model with 16 electrons and 16 protons."},
 { name: "Water Molecule", id:1, source:require('../../assets/fixedAssets/WaterMol.png'), desc:"A Molecule with 1 oxygen and 2 hydrogen."},
];
export function getSourceByName(name){
 return FIXED_IMAGES.find(x => x.name === name)?.source;
};
export function getDescByName(name){
 return FIXED_IMAGES.find(x => x.name === name)?.desc;
};
