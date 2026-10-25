import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../lib/theme';

const PALETTE = ['#DC4E26', '#5F7A4F', '#C88A2E', '#7A5C99', '#2F6F8F', '#B5476B', '#8A6A4F'];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.44 }]}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontFamily: fonts.display },
});
