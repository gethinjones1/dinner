import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export function StreakChip({ streak, postedToday, dark }: { streak: number; postedToday: boolean; dark?: boolean }) {
  if (streak === 0) return null;
  const nights = streak === 1 ? '1 night' : `${streak} nights`;
  return (
    <View style={[styles.chip, dark && styles.chipDark]}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={[styles.text, dark && { color: colors.cream }]}>
        {nights} in a row{postedToday ? '' : ' · keep it going'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  flame: { fontSize: 13 },
  text: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
});
