import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, TextInput} from 'react-native';
import { colors, screenPadding, radius} from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const MathData = [
 {
  name:"Times 10 to the power of x",
  disp:"*10^x",
  input:[
   {name:"power", type:"number"}
  ],
 },
];


function InputField({ placeholder, type, value, onChange }) {
  const keyboardType = type === "number" ? "numeric" : "default";

  return (
    <View style={{ width: 160, marginRight: 12 }}>
      <Text style={{ marginBottom: 6 }}>{placeholder}</Text>

      <TextInput
        placeholder={placeholder}
        keyboardType={keyboardType}
        value={value}
        onChangeText={(text) => {
          if (type === "number") {
            // keep as string to avoid NaN issues while typing; convert later if needed
            const cleaned = text.replace(/[^0-9.]/g, "");
            onChange(cleaned);
          } else {
            onChange(text);
          }
        }}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 10,
        }}
      />
    </View>
  );
}

export default function MathButton({currText, setText}){
 const insets = useSafeAreaInsets();
 const [showMath, setShowMath] = useState(false);
 const [values, setValues] = useState(() => {
    return MathData; // ensure shape exists
  });

 return(
    <>
      <Pressable
        style={styles.button}
        onPress={() => setShowMath(true)}
      >
        <Text style={styles.buttonText}>MATH</Text>
      </Pressable>

      <Modal
        visible={showMath}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMath(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <StatusBar barStyle="dark-content" />

          {/* Top bar: X + gradient progress bar (placeholder) */}
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <Pressable
              onPress={() => setShowMath(false)}
              style={styles.exitBtn}
            >
              <Ionicons
                name="close"
                size={18}
                color={colors.neutral900}
              />
            </Pressable>
          </View>
   <FlatList
      data={MathData}
      keyExtractor={(row, rowIndex) => `${row.name}-${rowIndex}`}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: row, index: rowIndex }) => (
        <View style={{ paddingVertical: 12 }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <Text style={{ fontWeight: "700" }}>{row.name}</Text>
            <Text style={{ color: "#666", marginTop: 4 }}>{row.disp}</Text>
          </View>

          <FlatList
            data={row.input}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(fieldDef, fieldIndex) =>
              `${rowIndex}-${fieldDef.name}-${fieldIndex}`
            }
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item: fieldDef, index: fieldIndex }) => (
              <InputField
                label={fieldDef.name}
                type={fieldDef.type}
                value={values[rowIndex][fieldIndex]}
                onChange={(newVal) => {
                  setValues((prev) => {
                    const next = prev.map((r) => r.slice());
                    next[rowIndex][fieldIndex] = newVal;

                    onChange?.(next);
                    return next;
                  });
                }}
              />
            )}
          />
        </View>
      )}
    />

        </View>
      </Modal>
    </>
  );}


const styles = StyleSheet.create({
 buttonText:{
  fontFamily: 'Nunito_800ExtraBold',
  fontSize: 10,
  letterSpacing: 0.5,
  color: colors.purple600
 },
 button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 'auto',
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
   topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
});
