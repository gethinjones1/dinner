import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F6F0E6',
  surface: '#FFFCF7',
  ink: '#1D1611',
  inkSoft: '#6E6158',
  faint: '#B3A498',
  line: '#E8DDCF',
  accent: '#DC4E26',
  accentSoft: '#FBE4D8',
  onAccent: '#FFFFFF',
  cream: '#FBF4EA',
  gold: '#E8A33D',
  danger: '#B42318',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  serifItalic: 'Fraunces_400Regular_Italic',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const type = StyleSheet.create({
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.inkSoft },
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.ink, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink, letterSpacing: -0.4 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  caption: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 24, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});

export const shadow = {
  shadowColor: '#3B2414',
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};
