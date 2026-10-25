import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { request } from '../lib/api';
import { useSession } from '../lib/session';
import { colors, noFocusRing, type } from '../lib/theme';

const MAX_CAPTION = 280;
const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};
const canUseCamera = Platform.OS !== 'web';

export default function PostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(source: 'camera' | 'library') {
    setError(null);
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return setError('Camera access is needed to take a photo.');
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled) setAsset(result.assets[0]);
  }

  async function share() {
    if (!asset) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    if (Platform.OS === 'web' && asset.file) {
      form.append('photo', asset.file);
    } else {
      // React Native's FormData accepts a { uri, name, type } descriptor for files.
      form.append('photo', {
        uri: asset.uri,
        name: asset.fileName ?? 'dinner.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    form.append('caption', caption.trim());
    try {
      await request('/posts', { method: 'POST', token: session!.token, body: form });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSide}>
          <Text style={type.body}>Cancel</Text>
        </Pressable>
        <Text style={type.title}>New post</Text>
        <Pressable onPress={share} disabled={!asset || busy} hitSlop={10} style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[type.bold, { color: asset ? colors.text : colors.placeholder }]}>Share</Text>
          )}
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {asset ? (
          <Pressable onPress={() => choose('library')} disabled={busy}>
            <Image source={{ uri: asset.uri }} style={styles.photo} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={[styles.photo, styles.empty]}>
            <Ionicons name="camera-outline" size={40} color={colors.placeholder} />
            <Text style={type.small}>Add a photo of today’s dinner</Text>
          </View>
        )}

        <View style={styles.rows}>
          {canUseCamera && (
            <Pressable style={styles.row} onPress={() => choose('camera')} disabled={busy}>
              <Ionicons name="camera-outline" size={22} color={colors.text} />
              <Text style={[type.body, { flex: 1 }]}>Take photo</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
            </Pressable>
          )}
          <Pressable style={styles.row} onPress={() => choose('library')} disabled={busy}>
            <Ionicons name="images-outline" size={22} color={colors.text} />
            <Text style={[type.body, { flex: 1 }]}>{asset ? 'Choose a different photo' : 'Choose from library'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </Pressable>
        </View>

        <TextInput
          style={styles.caption}
          placeholder="Write a caption…"
          placeholderTextColor={colors.placeholder}
          value={caption}
          onChangeText={setCaption}
          maxLength={MAX_CAPTION}
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={[type.small, styles.note]}>You can post one photo a day.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerSide: { width: 70 },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.fill },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  rows: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  caption: {
    ...noFocusRing,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    minHeight: 96,
    padding: 16,
    textAlignVertical: 'top',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', padding: 16 },
  note: { textAlign: 'center', padding: 16 },
});
