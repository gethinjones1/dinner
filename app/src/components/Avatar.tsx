import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  letter: { color: colors.text, fontWeight: '600' },
});
