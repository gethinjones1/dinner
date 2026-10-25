import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#FFFFFF',
  text: '#0A0A0A',
  secondary: '#737373',
  placeholder: '#A3A3A3',
  fill: '#F4F4F5',
  line: '#EBEBEB',
  danger: '#ED4956',
};

export const type = StyleSheet.create({
  wordmark: { fontSize: 24, fontWeight: '700', letterSpacing: -0.8, color: colors.text },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, lineHeight: 20, color: colors.text },
  bold: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, lineHeight: 18, color: colors.secondary },
});

// Browsers draw a focus ring around text inputs; native platforms don't.
export const noFocusRing = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;
