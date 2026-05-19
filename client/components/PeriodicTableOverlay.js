import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// [symbol, atomicNum, name, mass, group(col 1-18), period(row 1-7, 9=lanthanides, 10=actinides), category]
const ELEMENTS = [
  ['H',1,'Hydrogen',1.008,1,1,'nonmetal'],['He',2,'Helium',4.003,18,1,'noble'],
  ['Li',3,'Lithium',6.94,1,2,'alkali'],['Be',4,'Beryllium',9.012,2,2,'alkaline'],
  ['B',5,'Boron',10.81,13,2,'metalloid'],['C',6,'Carbon',12.01,14,2,'nonmetal'],
  ['N',7,'Nitrogen',14.01,15,2,'nonmetal'],['O',8,'Oxygen',16.00,16,2,'nonmetal'],
  ['F',9,'Fluorine',19.00,17,2,'halogen'],['Ne',10,'Neon',20.18,18,2,'noble'],
  ['Na',11,'Sodium',22.99,1,3,'alkali'],['Mg',12,'Magnesium',24.31,2,3,'alkaline'],
  ['Al',13,'Aluminum',26.98,13,3,'post-transition'],['Si',14,'Silicon',28.09,14,3,'metalloid'],
  ['P',15,'Phosphorus',30.97,15,3,'nonmetal'],['S',16,'Sulfur',32.06,16,3,'nonmetal'],
  ['Cl',17,'Chlorine',35.45,17,3,'halogen'],['Ar',18,'Argon',39.95,18,3,'noble'],
  ['K',19,'Potassium',39.10,1,4,'alkali'],['Ca',20,'Calcium',40.08,2,4,'alkaline'],
  ['Sc',21,'Scandium',44.96,3,4,'transition'],['Ti',22,'Titanium',47.87,4,4,'transition'],
  ['V',23,'Vanadium',50.94,5,4,'transition'],['Cr',24,'Chromium',52.00,6,4,'transition'],
  ['Mn',25,'Manganese',54.94,7,4,'transition'],['Fe',26,'Iron',55.85,8,4,'transition'],
  ['Co',27,'Cobalt',58.93,9,4,'transition'],['Ni',28,'Nickel',58.69,10,4,'transition'],
  ['Cu',29,'Copper',63.55,11,4,'transition'],['Zn',30,'Zinc',65.38,12,4,'transition'],
  ['Ga',31,'Gallium',69.72,13,4,'post-transition'],['Ge',32,'Germanium',72.63,14,4,'metalloid'],
  ['As',33,'Arsenic',74.92,15,4,'metalloid'],['Se',34,'Selenium',78.97,16,4,'nonmetal'],
  ['Br',35,'Bromine',79.90,17,4,'halogen'],['Kr',36,'Krypton',83.80,18,4,'noble'],
  ['Rb',37,'Rubidium',85.47,1,5,'alkali'],['Sr',38,'Strontium',87.62,2,5,'alkaline'],
  ['Y',39,'Yttrium',88.91,3,5,'transition'],['Zr',40,'Zirconium',91.22,4,5,'transition'],
  ['Nb',41,'Niobium',92.91,5,5,'transition'],['Mo',42,'Molybdenum',95.95,6,5,'transition'],
  ['Tc',43,'Technetium',98,7,5,'transition'],['Ru',44,'Ruthenium',101.1,8,5,'transition'],
  ['Rh',45,'Rhodium',102.9,9,5,'transition'],['Pd',46,'Palladium',106.4,10,5,'transition'],
  ['Ag',47,'Silver',107.9,11,5,'transition'],['Cd',48,'Cadmium',112.4,12,5,'transition'],
  ['In',49,'Indium',114.8,13,5,'post-transition'],['Sn',50,'Tin',118.7,14,5,'post-transition'],
  ['Sb',51,'Antimony',121.8,15,5,'metalloid'],['Te',52,'Tellurium',127.6,16,5,'metalloid'],
  ['I',53,'Iodine',126.9,17,5,'halogen'],['Xe',54,'Xenon',131.3,18,5,'noble'],
  ['Cs',55,'Cesium',132.9,1,6,'alkali'],['Ba',56,'Barium',137.3,2,6,'alkaline'],
  ['Hf',72,'Hafnium',178.5,4,6,'transition'],['Ta',73,'Tantalum',180.9,5,6,'transition'],
  ['W',74,'Tungsten',183.8,6,6,'transition'],['Re',75,'Rhenium',186.2,7,6,'transition'],
  ['Os',76,'Osmium',190.2,8,6,'transition'],['Ir',77,'Iridium',192.2,9,6,'transition'],
  ['Pt',78,'Platinum',195.1,10,6,'transition'],['Au',79,'Gold',197.0,11,6,'transition'],
  ['Hg',80,'Mercury',200.6,12,6,'transition'],['Tl',81,'Thallium',204.4,13,6,'post-transition'],
  ['Pb',82,'Lead',207.2,14,6,'post-transition'],['Bi',83,'Bismuth',209.0,15,6,'post-transition'],
  ['Po',84,'Polonium',209,16,6,'metalloid'],['At',85,'Astatine',210,17,6,'halogen'],
  ['Rn',86,'Radon',222,18,6,'noble'],
  ['Fr',87,'Francium',223,1,7,'alkali'],['Ra',88,'Radium',226,2,7,'alkaline'],
  ['Rf',104,'Rutherfordium',267,4,7,'transition'],['Db',105,'Dubnium',270,5,7,'transition'],
  ['Sg',106,'Seaborgium',271,6,7,'transition'],['Bh',107,'Bohrium',270,7,7,'transition'],
  ['Hs',108,'Hassium',277,8,7,'transition'],['Mt',109,'Meitnerium',278,9,7,'transition'],
  ['Ds',110,'Darmstadtium',281,10,7,'transition'],['Rg',111,'Roentgenium',282,11,7,'transition'],
  ['Cn',112,'Copernicium',285,12,7,'transition'],['Nh',113,'Nihonium',286,13,7,'post-transition'],
  ['Fl',114,'Flerovium',289,14,7,'post-transition'],['Mc',115,'Moscovium',290,15,7,'post-transition'],
  ['Lv',116,'Livermorium',293,16,7,'post-transition'],['Ts',117,'Tennessine',294,17,7,'halogen'],
  ['Og',118,'Oganesson',294,18,7,'noble'],
  ['La',57,'Lanthanum',138.9,3,9,'lanthanide'],['Ce',58,'Cerium',140.1,4,9,'lanthanide'],
  ['Pr',59,'Praseodymium',140.9,5,9,'lanthanide'],['Nd',60,'Neodymium',144.2,6,9,'lanthanide'],
  ['Pm',61,'Promethium',145,7,9,'lanthanide'],['Sm',62,'Samarium',150.4,8,9,'lanthanide'],
  ['Eu',63,'Europium',152.0,9,9,'lanthanide'],['Gd',64,'Gadolinium',157.3,10,9,'lanthanide'],
  ['Tb',65,'Terbium',158.9,11,9,'lanthanide'],['Dy',66,'Dysprosium',162.5,12,9,'lanthanide'],
  ['Ho',67,'Holmium',164.9,13,9,'lanthanide'],['Er',68,'Erbium',167.3,14,9,'lanthanide'],
  ['Tm',69,'Thulium',168.9,15,9,'lanthanide'],['Yb',70,'Ytterbium',173.0,16,9,'lanthanide'],
  ['Lu',71,'Lutetium',175.0,17,9,'lanthanide'],
  ['Ac',89,'Actinium',227,3,10,'actinide'],['Th',90,'Thorium',232.0,4,10,'actinide'],
  ['Pa',91,'Protactinium',231.0,5,10,'actinide'],['U',92,'Uranium',238.0,6,10,'actinide'],
  ['Np',93,'Neptunium',237,7,10,'actinide'],['Pu',94,'Plutonium',244,8,10,'actinide'],
  ['Am',95,'Americium',243,9,10,'actinide'],['Cm',96,'Curium',247,10,10,'actinide'],
  ['Bk',97,'Berkelium',247,11,10,'actinide'],['Cf',98,'Californium',251,12,10,'actinide'],
  ['Es',99,'Einsteinium',252,13,10,'actinide'],['Fm',100,'Fermium',257,14,10,'actinide'],
  ['Md',101,'Mendelevium',258,15,10,'actinide'],['No',102,'Nobelium',259,16,10,'actinide'],
  ['Lr',103,'Lawrencium',262,17,10,'actinide'],
];

const CATEGORY_COLORS = {
  'nonmetal':        { bg: colors.green50,   border: colors.green400,  text: colors.green600 },
  'noble':           { bg: colors.blue50,    border: colors.blue400,   text: colors.blue600 },
  'alkali':          { bg: colors.coral50,   border: colors.coral400,  text: colors.coral600 },
  'alkaline':        { bg: colors.gold50,    border: colors.gold400,   text: colors.gold800 },
  'transition':      { bg: colors.purple50,  border: colors.purple200, text: colors.purple600 },
  'post-transition': { bg: colors.neutral100,border: colors.neutral200,text: colors.neutral600 },
  'metalloid':       { bg: colors.teal50,    border: colors.teal400,   text: colors.teal600 },
  'halogen':         { bg: colors.coral50,   border: colors.coral400,  text: colors.coral600 },
  'lanthanide':      { bg: colors.purple50,  border: colors.purple100, text: colors.purple800 },
  'actinide':        { bg: colors.gold50,    border: colors.gold100,   text: colors.gold800 },
};

const CELL_SIZE = 52;
const GAP = 2;

function ElementCell({ el, onPress }) {
  const [sym, num, name, mass, col, row, cat] = el;
  const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['nonmetal'];
  return (
    <Pressable
      onPress={() => onPress?.(el)}
      style={[styles.cell, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={[styles.cellNum, { color: c.text }]}>{num}</Text>
      <Text style={[styles.cellSym, { color: c.text }]}>{sym}</Text>
      <Text style={[styles.cellMass, { color: c.text }]}>{mass}</Text>
    </Pressable>
  );
}

export default function PeriodicTableOverlay({ open, onClose }) {
  const [selected, setSelected] = useState(null);

  // Build grid: 18 columns × 10 rows
  const grid = {};
  for (const el of ELEMENTS) {
    const [, , , , col, row] = el;
    const r = row === 9 ? 9 : row === 10 ? 10 : row;
    grid[`${col},${r}`] = el;
  }

  const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10];
  const COLS = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Periodic Table</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.neutral900} />
          </Pressable>
        </View>

        {/* Selected element info */}
        {selected && (
          <View style={styles.infoBar}>
            <Text style={styles.infoSym}>{selected[0]}</Text>
            <View>
              <Text style={styles.infoName}>{selected[2]}</Text>
              <Text style={styles.infoDetail}>#{selected[1]} · {selected[3]} u · {selected[6]}</Text>
            </View>
          </View>
        )}

        {/* Scrollable grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
            {ROWS.map(row => (
              <View key={row} style={styles.tableRow}>
                {row === 9 && <View style={styles.rowSpacer} />}
                {COLS.map(col => {
                  const el = grid[`${col},${row}`];
                  if (!el) {
                    // Skip column 3 in rows 6-7 (lanthanide/actinide placeholder)
                    if (col >= 3 && col <= 3 && (row === 6 || row === 7)) {
                      return <View key={col} style={[styles.cell, styles.cellPlaceholder]} />;
                    }
                    return <View key={col} style={styles.cellEmpty} />;
                  }
                  return <ElementCell key={col} el={el} onPress={setSelected} />;
                })}
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  headerTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: 20,
    color: colors.neutral900,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.purple50,
    borderBottomWidth: 1,
    borderBottomColor: colors.purple100,
  },
  infoSym: {
    fontFamily: 'Nunito_900Black',
    fontSize: 32,
    color: colors.purple600,
    width: 48,
    textAlign: 'center',
  },
  infoName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.neutral900,
  },
  infoDetail: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  rowSpacer: {
    height: 8,
    position: 'absolute',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellPlaceholder: {
    backgroundColor: colors.neutral100,
    borderColor: colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  cellNum: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 8,
    lineHeight: 10,
  },
  cellSym: {
    fontFamily: 'Nunito_900Black',
    fontSize: 16,
    lineHeight: 18,
  },
  cellMass: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 7,
    lineHeight: 9,
  },
});
