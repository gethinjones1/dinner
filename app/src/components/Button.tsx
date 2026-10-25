import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  busy = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'large' | 'small';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const fg = primary ? '#FFFFFF' : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.large,
        { backgroundColor: primary ? colors.text : colors.fill },
        (disabled || busy) && { opacity: 0.35 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, size === 'small' && { fontSize: 14 }, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  large: { height: 48, borderRadius: 12, paddingHorizontal: 20 },
  small: { height: 34, borderRadius: 9, paddingHorizontal: 14 },
  text: { fontSize: 15, fontWeight: '600' },
});
