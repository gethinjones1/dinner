import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { StreakChip } from '../components/StreakChip';
import { ApiError, imageUri, request, type Post } from '../lib/api';
import { useSession } from '../lib/session';
import { colors, fonts, shadow, type } from '../lib/theme';

type Me = { today: string; todaysPost: Post | null; streak: number; sharedToday: number };
type Feed = { posts: Post[]; nextCursor: number | null };

// Parse YYYY-MM-DD as a local calendar date (not UTC midnight).
const parseDay = (day: string) => new Date(`${day}T12:00:00`);

function dayLabel(day: string, today: string) {
  const diff = Math.round((parseDay(today).getTime() - parseDay(day).getTime()) / 86_400_000);
  if (diff === 0) return 'Tonight';
  if (diff === 1) return 'Last night';
  return parseDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useSession();
  const token = session!.token;
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) signOut();
      else setError(e instanceof Error ? e.message : String(e));
    },
    [signOut],
  );

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [meRes, feed] = await Promise.all([request<Me>('/me', { token }), request<Feed>('/posts', { token })]);
      setMe(meRes);
      setPosts(feed.posts);
      setCursor(feed.nextCursor);
      setError(null);
    } catch (e) {
      handleError(e);
    } finally {
      setRefreshing(false);
    }
  }, [token, handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function loadMore() {
    if (cursor === null || refreshing) return;
    try {
      const feed = await request<Feed>(`/posts?before=${cursor}`, { token });
      setPosts((prev) => [...prev, ...feed.posts]);
      setCursor(feed.nextCursor);
    } catch (e) {
      handleError(e);
    }
  }

  function deletePost(post: Post) {
    confirm('Delete this photo?', 'If it was tonight’s dinner you can share another one.', 'Delete', async () => {
      try {
        await request(`/posts/${post.id}`, { method: 'DELETE', token });
        load();
      } catch (e) {
        handleError(e);
      }
    });
  }

  // Your own plate tonight is shown in the hero card, so leave it out of the list.
  const sections = useMemo(() => {
    if (!me) return [];
    const groups = new Map<string, Post[]>();
    for (const p of posts) {
      if (p.id === me.todaysPost?.id) continue;
      groups.set(p.day, [...(groups.get(p.day) ?? []), p]);
    }
    return [...groups].map(([day, data]) => ({ day, title: dayLabel(day, me.today), data }));
  }, [posts, me]);

  const header = (
    <View style={{ paddingTop: insets.top + 12 }}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={type.eyebrow}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={[type.hero, { marginTop: 4 }]}>
            Tonight’s <Text style={{ fontFamily: fonts.displayItalic, color: colors.accent }}>table</Text>
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Account"
          hitSlop={8}
          onPress={() => confirm(`Signed in as ${session!.user.username}`, 'Do you want to sign out?', 'Sign out', signOut)}
        >
          <Avatar name={session!.user.username} size={42} />
        </Pressable>
      </View>

      {me === null ? (
        <View style={[styles.hero, styles.heroEmpty, { alignItems: 'center', justifyContent: 'center', minHeight: 220 }]}>
          <ActivityIndicator color={colors.cream} />
        </View>
      ) : me.todaysPost ? (
        <View style={[styles.hero, shadow]}>
          <Image source={{ uri: imageUri(me.todaysPost) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          <LinearGradient colors={['rgba(20,12,8,0)', 'rgba(20,12,8,0.88)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <Text style={[type.eyebrow, { color: 'rgba(251,244,234,0.8)' }]}>
              Your plate · {timeOf(me.todaysPost.createdAt)}
            </Text>
            {!!me.todaysPost.caption && (
              <Text style={[type.caption, { color: colors.cream, fontSize: 20, lineHeight: 26 }]} numberOfLines={3}>
                “{me.todaysPost.caption}”
              </Text>
            )}
            <View style={styles.heroFooter}>
              <StreakChip streak={me.streak} postedToday dark />
              <Pressable onPress={() => deletePost(me.todaysPost!)} hitSlop={10} accessibilityLabel="Delete tonight’s photo">
                <Ionicons name="trash-outline" size={20} color="rgba(251,244,234,0.8)" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.hero, styles.heroEmpty, shadow]}>
          <LinearGradient
            colors={['#6B2A12', '#2B1A12']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroEmoji}>🍽️</Text>
          <View style={styles.heroBody}>
            <StreakChip streak={me.streak} postedToday={false} dark />
            <Text style={[type.title, { color: colors.cream, fontSize: 30, lineHeight: 34 }]}>
              What’s on your{'\n'}
              <Text style={{ fontFamily: fonts.displayItalic }}>plate</Text> tonight?
            </Text>
            <Text style={[type.muted, { color: 'rgba(251,244,234,0.7)' }]}>
              {me.sharedToday > 0
                ? `${me.sharedToday} ${me.sharedToday === 1 ? 'person has' : 'people have'} shared tonight. One photo — make it count.`
                : 'One photo a night — make it count.'}
            </Text>
            <Button
              title="Share tonight’s dinner"
              icon="camera"
              variant="cream"
              onPress={() => router.push('/post')}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        me ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🕯️</Text>
            <Text style={[type.title, { fontSize: 22, textAlign: 'center' }]}>The table’s still being set</Text>
            <Text style={[type.muted, { textAlign: 'center' }]}>Dinners from everyone will show up here.</Text>
          </View>
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={type.title}>{section.title}</Text>
          <Text style={type.muted}>
            {section.data.length} {section.data.length === 1 ? 'plate' : 'plates'}
          </Text>
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.accent} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
      style={{ backgroundColor: colors.background }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Avatar name={item.username} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={type.label}>{item.username}</Text>
              <Text style={[type.muted, { fontSize: 13, lineHeight: 17 }]}>{timeOf(item.createdAt)}</Text>
            </View>
            {item.userId === session!.user.id && (
              <Pressable onPress={() => deletePost(item)} hitSlop={10} accessibilityLabel="Delete photo">
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.inkSoft} />
              </Pressable>
            )}
          </View>
          <View style={[styles.photoWrap, shadow]}>
            <Image source={{ uri: imageUri(item) }} style={styles.photo} contentFit="cover" transition={250} />
          </View>
          {!!item.caption && <Text style={[type.caption, styles.caption]}>{item.caption}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  hero: { borderRadius: 28, overflow: 'hidden', minHeight: 340, justifyContent: 'flex-end', backgroundColor: colors.ink },
  heroEmpty: { minHeight: 0 },
  heroEmoji: { position: 'absolute', right: -18, top: -14, fontSize: 120, opacity: 0.22, transform: [{ rotate: '-14deg' }] },
  heroBody: { padding: 22, gap: 10 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  error: { fontFamily: fonts.medium, color: colors.danger, marginTop: 12, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 36,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.faint,
  },
  card: { marginBottom: 28 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  photoWrap: { borderRadius: 22, backgroundColor: colors.line },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 22 },
  caption: { marginTop: 12, paddingHorizontal: 4 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
});
