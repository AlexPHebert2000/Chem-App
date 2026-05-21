import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Modal, Pressable, ScrollView, Animated, PanResponder, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// ─── Element data ─────────────────────────────────────────────────────────────
// [symbol, atomicNum, name, mass, group(col 1-18), period(row 1-7,9=lant,10=act), category]
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

const SERIES_MARKERS = [
  { col: 3, row: 6, label: '57–71' },
  { col: 3, row: 7, label: '89–103' },
];

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  'alkali':          { bg: '#FF8B6E', fg: '#5A1A0C' },
  'alkaline':        { bg: '#FFD580', fg: '#5A3C00' },
  'transition':      { bg: '#8FCFEF', fg: '#0D3856' },
  'post-transition': { bg: '#C4B6FF', fg: '#2C1A60' },
  'metalloid':       { bg: '#A8E59A', fg: '#1E4A0E' },
  'nonmetal':        { bg: '#C9F0EA', fg: '#0A4940' },
  'halogen':         { bg: '#FFE066', fg: '#5A4200' },
  'noble':           { bg: '#B58CFF', fg: '#1F0858' },
  'lanthanide':      { bg: '#FFB8E2', fg: '#5A0D38' },
  'actinide':        { bg: '#FFB098', fg: '#5A1A0A' },
};

const LEGEND_CATS = [
  ['alkali', 'Alkali metal'],
  ['alkaline', 'Alkaline earth'],
  ['transition', 'Transition'],
  ['post-transition', 'Post-transition'],
  ['metalloid', 'Metalloid'],
  ['nonmetal', 'Nonmetal'],
  ['halogen', 'Halogen'],
  ['noble', 'Noble gas'],
  ['lanthanide', 'Lanthanide'],
  ['actinide', 'Actinide'],
];

const CELL = 56;
const GAP = 2;
const TABLE_W = 18 * (CELL + GAP);  // 1044
const TABLE_H = 10 * (CELL + GAP);  // 580
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;

// ─── Element cell ─────────────────────────────────────────────────────────────

function ElementCell({ el, onPress }) {
  const [sym, num, name, , col, row, cat] = el;
  const c = CAT_COLORS[cat] ?? CAT_COLORS['nonmetal'];
  const yIndex = row - 1;
  return (
    <Pressable
      onPress={() => onPress(el)}
      style={[styles.cell, { backgroundColor: c.bg, left: (col - 1) * (CELL + GAP), top: yIndex * (CELL + GAP) }]}
    >
      <Text style={[styles.cellNum, { color: c.fg }]}>{num}</Text>
      <Text style={[styles.cellSym, { color: c.fg }]}>{sym}</Text>
      <Text style={[styles.cellName, { color: c.fg }]} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

function SeriesMarkerCell({ col, row, label }) {
  return (
    <View style={[styles.cell, styles.markerCell, { left: (col - 1) * (CELL + GAP), top: (row - 1) * (CELL + GAP) }]}>
      <Text style={styles.markerText}>{label}</Text>
    </View>
  );
}

// ─── Selected element detail card ─────────────────────────────────────────────

function DetailCard({ el, onDismiss }) {
  const [sym, num, name, mass, col, row, cat] = el;
  const c = CAT_COLORS[cat] ?? CAT_COLORS['nonmetal'];
  const period = row <= 7 ? row : '—';
  const slideY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.timing(slideY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.detailCard, { borderColor: c.bg, transform: [{ translateY: slideY }] }]}>
      <View style={[styles.detailBadge, { backgroundColor: c.bg }]}>
        <Text style={[styles.detailBadgeNum, { color: c.fg }]}>{num}</Text>
        <Text style={[styles.detailBadgeSym, { color: c.fg }]}>{sym}</Text>
      </View>
      <View style={styles.detailInfo}>
        <Text style={styles.detailName}>{name}</Text>
        <Text style={styles.detailMeta}>Atomic mass {mass} · Group {col} · Period {period}</Text>
        <View style={[styles.catPill, { backgroundColor: c.bg }]}>
          <Text style={[styles.catPillText, { color: c.fg }]}>{cat.replace('-', ' ').toUpperCase()}</Text>
        </View>
      </View>
      <Pressable onPress={onDismiss} style={styles.detailClose}>
        <Ionicons name="close" size={12} color={colors.neutral800} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function PeriodicTableOverlay({ open, onClose }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);
  const [scaleLabel, setScaleLabel] = useState(`${Math.round(MIN_SCALE * 100)}%`);

  // Stable animated values
  const animTx    = useRef(new Animated.Value(0)).current;
  const animTy    = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(MIN_SCALE)).current;

  // Mutable transform state (not React state — updated synchronously during gestures)
  const vs = useRef({ desiredTx: 0, desiredTy: 0, scale: MIN_SCALE });
  const stageDims = useRef({ w: 0, h: 0 });
  const lastTouch = useRef({ x: 0, y: 0, dist: 0 });

  // Apply desiredTx/Ty/scale → compensate for RN's center-based scale origin
  const applyTransform = useCallback((desiredTx, desiredTy, scale) => {
    animTx.setValue(desiredTx + (scale - 1) * TABLE_W / 2);
    animTy.setValue(desiredTy + (scale - 1) * TABLE_H / 2);
    animScale.setValue(scale);
    setScaleLabel(`${Math.round(scale * 100)}%`);
  }, []);

  const fitToStage = useCallback((w, h) => {
    if (!w || !h) return;
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(w / TABLE_W, h / TABLE_H) * 0.95));
    vs.current = { desiredTx: (w - TABLE_W * s) / 2, desiredTy: (h - TABLE_H * s) / 2, scale: s };
    applyTransform(vs.current.desiredTx, vs.current.desiredTy, s);
  }, [applyTransform]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      fitToStage(stageDims.current.w, stageDims.current.h);
    }
  }, [open, fitToStage]);

  const onStageLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    stageDims.current = { w: width, h: height };
    if (open) fitToStage(width, height);
  }, [open, fitToStage]);

  // ── Zoom controls ──────────────────────────────────────────────────────────

  const zoomBy = (factor) => {
    const { w, h } = stageDims.current;
    const cx = w / 2, cy = h / 2;
    const s = vs.current;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s.scale * factor));
    const ratio = newScale / s.scale;
    s.desiredTx = cx - (cx - s.desiredTx) * ratio;
    s.desiredTy = cy - (cy - s.desiredTy) * ratio;
    s.scale = newScale;
    applyTransform(s.desiredTx, s.desiredTy, s.scale);
  };

  // ── Pan + pinch via PanResponder ───────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const t1 = touches[0], t2 = touches[1];
          const dx = t2.pageX - t1.pageX, dy = t2.pageY - t1.pageY;
          lastTouch.current = {
            x: (t1.pageX + t2.pageX) / 2,
            y: (t1.pageY + t2.pageY) / 2,
            dist: Math.sqrt(dx * dx + dy * dy),
          };
        } else {
          lastTouch.current = { x: touches[0].pageX, y: touches[0].pageY, dist: 0 };
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        const s = vs.current;
        const last = lastTouch.current;

        if (touches.length >= 2) {
          const t1 = touches[0], t2 = touches[1];
          const dx = t2.pageX - t1.pageX, dy = t2.pageY - t1.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const midX = (t1.pageX + t2.pageX) / 2;
          const midY = (t1.pageY + t2.pageY) / 2;

          if (last.dist > 0) {
            const scaleDelta = dist / last.dist;
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s.scale * scaleDelta));
            const ratio = newScale / s.scale;
            // Scale around focal point + pan from centroid movement
            s.desiredTx = midX - (midX - s.desiredTx) * ratio + (midX - last.x);
            s.desiredTy = midY - (midY - s.desiredTy) * ratio + (midY - last.y);
            s.scale = newScale;
            animTx.setValue(s.desiredTx + (s.scale - 1) * TABLE_W / 2);
            animTy.setValue(s.desiredTy + (s.scale - 1) * TABLE_H / 2);
            animScale.setValue(s.scale);
            setScaleLabel(`${Math.round(s.scale * 100)}%`);
          }
          lastTouch.current = { x: midX, y: midY, dist };
        } else if (touches.length === 1) {
          const t = touches[0];
          s.desiredTx += t.pageX - last.x;
          s.desiredTy += t.pageY - last.y;
          animTx.setValue(s.desiredTx + (s.scale - 1) * TABLE_W / 2);
          animTy.setValue(s.desiredTy + (s.scale - 1) * TABLE_H / 2);
          lastTouch.current = { x: t.pageX, y: t.pageY, dist: 0 };
        }
      },
      onPanResponderRelease: () => {
        lastTouch.current = { x: 0, y: 0, dist: 0 };
      },
    })
  ).current;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { setSelected(null); onClose(); }} style={styles.squareBtn}>
            <Ionicons name="close" size={16} color={colors.neutral900} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Periodic table</Text>
            <Text style={styles.headerSub}>Pinch to zoom · drag to pan</Text>
          </View>
          <Pressable onPress={() => zoomBy(0.85)} style={styles.squareBtn}>
            <Ionicons name="remove" size={14} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => fitToStage(stageDims.current.w, stageDims.current.h)} style={styles.fitBtn}>
            <Text style={styles.fitBtnText}>{scaleLabel}</Text>
          </Pressable>
          <Pressable onPress={() => zoomBy(1.18)} style={styles.squareBtn}>
            <Ionicons name="add" size={14} color={colors.neutral900} />
          </Pressable>
        </View>

        {/* Legend */}
        <View style={styles.legendWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legendContent}
          >
            {LEGEND_CATS.map(([cat, label]) => (
              <View key={cat} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CAT_COLORS[cat].bg }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Stage */}
        <View
          style={styles.stage}
          onLayout={onStageLayout}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[
            styles.tableContainer,
            { transform: [{ translateX: animTx }, { translateY: animTy }, { scale: animScale }] },
          ]}>
            {SERIES_MARKERS.map(m => <SeriesMarkerCell key={m.label} {...m} />)}
            {ELEMENTS.map(el => <ElementCell key={el[1]} el={el} onPress={setSelected} />)}
          </Animated.View>

          {selected && (
            <DetailCard key={selected[1]} el={selected} onDismiss={() => setSelected(null)} />
          )}
        </View>

      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  squareBtn: {
    width: 36, height: 36,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.neutral900,
    lineHeight: 22,
  },
  headerSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.neutral600,
  },
  fitBtn: {
    width: 52, height: 36,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fitBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: colors.neutral900,
    textAlign: 'center',
    width: 48,
    padding: 0,
    margin: 0,
  },
  legendWrapper: {
    height: 28,
    flexShrink: 0,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  legendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 27,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    color: colors.neutral600,
  },
  stage: {
    flex: 1,
    backgroundColor: colors.neutral50,
    overflow: 'hidden',
  },
  tableContainer: {
    position: 'absolute',
    width: TABLE_W,
    height: TABLE_H,
  },
  cell: {
    position: 'absolute',
    width: CELL,
    height: CELL,
    borderRadius: 6,
    padding: 3,
    justifyContent: 'space-between',
  },
  cellNum: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  cellSym: {
    fontFamily: 'Nunito_900Black',
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  cellName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 7,
    lineHeight: 9,
    textAlign: 'center',
  },
  markerCell: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    color: 'rgba(0,0,0,0.55)',
  },
  detailCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  detailBadge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailBadgeNum: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },
  detailBadgeSym: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    lineHeight: 26,
  },
  detailInfo: { flex: 1, minWidth: 0 },
  detailName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.neutral900,
  },
  detailMeta: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 2,
  },
  catPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  catPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  detailClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
