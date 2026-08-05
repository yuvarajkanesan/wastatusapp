import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ToastAndroid,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { elevation } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { getGridColumns } from '../utils/layout';
import {
  fetchSavedStatuses,
  deleteSavedFile,
  bulkDeleteSavedFiles,
  shareFile,
  bulkShareFiles,
} from '../native/statusFolder';

// Rebuilt to match the real installed app (verified against screenshots of the
// production build). Function names (SavedScreen, onRefresh, exitSelection,
// handleDelete, bulkDelete, bulkShare, keyExtractor, renderItem) came from the
// decompiled bytecode; header/tab-count layout corrected against the real app's UI.

export default function SavedScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = getGridColumns(width);
  const styles = makeStyles(colors, numColumns);
  const insets = useSafeAreaInsets();
  const [mediaFilter, setMediaFilter] = useState('image');
  const [imageItems, setImageItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: 'single' | 'bulk', items: [...] }
  const listRef = useRef(null);

  const items = mediaFilter === 'video' ? videoItems : imageItems;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [imgs, vids] = await Promise.all([fetchSavedStatuses('image'), fetchSavedStatuses('video')]);
      setImageItems(imgs);
      setVideoItems(vids);
    } catch (e) {
      setImageItems([]);
      setVideoItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // `selected` holds item names from whichever tab was active when they were picked —
  // switching IMAGES/VIDEOS while a selection is active left stale names that don't match
  // any item in the newly-active list, so bulk share/delete would silently filter down to
  // nothing and look broken.
  useEffect(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, [mediaFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const enterSelection = useCallback((item) => {
    setSelectionMode(true);
    setSelected(new Set([item.name]));
  }, []);

  const toggleSelect = useCallback((item) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.name)) next.delete(item.name);
      else next.add(item.name);
      return next;
    });
  }, []);

  const handleDelete = useCallback((item) => {
    setDeleteTarget({ kind: 'single', items: [item] });
  }, []);

  const bulkDelete = useCallback(() => {
    const items_ = items.filter((i) => selected.has(i.name));
    if (!items_.length) return;
    setDeleteTarget({ kind: 'bulk', items: items_ });
  }, [items, selected]);

  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { kind, items: items_ } = deleteTarget;
    setDeleteTarget(null);
    if (kind === 'single') {
      const result = await deleteSavedFile(items_[0].path);
      ToastAndroid.show(result.success ? 'Deleted' : 'Delete failed', ToastAndroid.SHORT);
      if (result.success) load();
    } else {
      // One batched call — the system's own delete-confirmation dialog (Android 11+)
      // covers the whole selection at once instead of prompting per file.
      const result = await bulkDeleteSavedFiles(items_.map((i) => i.path));
      ToastAndroid.show(result.success ? 'Deleted' : 'Delete failed', ToastAndroid.SHORT);
      exitSelection();
      load();
    }
  }, [deleteTarget, exitSelection, load]);

  const bulkShare = useCallback(async () => {
    const items_ = items.filter((i) => selected.has(i.name));
    if (!items_.length) return;
    try {
      await bulkShareFiles(items_, mediaFilter === 'video' ? 'video/*' : 'image/*');
    } catch (e) {
      if (!e.message?.includes('cancel')) {
        ToastAndroid.show('Share failed', ToastAndroid.SHORT);
      }
    }
    exitSelection();
  }, [items, selected, mediaFilter, exitSelection]);

  const openPreview = useCallback((index) => setPreviewIndex(index), []);
  const closePreview = useCallback(() => setPreviewIndex(-1), []);

  // scrollToIndex on a numColumns grid without getItemLayout can throw/fail once the
  // target row hasn't been measured yet. Keeping the grid in sync with the preview is a
  // nice-to-have, not required for the preview itself, so failures here are safe to
  // swallow — onScrollToIndexFailed below covers the async case scrollToIndex can't throw for.
  const goPrevPreview = useCallback(() => {
    if (previewIndex <= 0) return;
    const next = previewIndex - 1;
    try {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } catch {}
    setPreviewIndex(next);
  }, [previewIndex]);

  const goNextPreview = useCallback(() => {
    if (previewIndex >= items.length - 1) return;
    const next = previewIndex + 1;
    try {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } catch {}
    setPreviewIndex(next);
  }, [previewIndex, items.length]);

  const handleScrollToIndexFailed = useCallback((info) => {
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
  }, []);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const onPreviewTouchStart = useCallback((e) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  }, []);
  const onPreviewTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current == null) return;
      const dx = e.nativeEvent.pageX - touchStartX.current;
      const dy = e.nativeEvent.pageY - touchStartY.current;
      touchStartX.current = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) goPrevPreview();
        else goNextPreview();
      }
    },
    [goPrevPreview, goNextPreview]
  );

  const keyExtractor = (item) => item.name;

  const renderItem = ({ item, index }) => {
    const isSelected = selected.has(item.name);
    return (
      <TouchableOpacity
        style={[styles.cell, isSelected && styles.cellSelected]}
        activeOpacity={0.8}
        delayLongPress={250}
        onPress={() => (selectionMode ? toggleSelect(item) : openPreview(index))}
        onLongPress={() => (selectionMode ? toggleSelect(item) : enterSelection(item))}
      >
      <View style={styles.cellClip}>
        {mediaFilter === 'video' ? (
          <View style={styles.videoThumbPlaceholder}>
            {item.thumbnailPath ? (
              <Image source={{ uri: item.thumbnailPath }} style={styles.thumb} />
            ) : (
              <Video
                source={{ uri: item.displayPath || item.path }}
                style={styles.thumb}
                resizeMode="cover"
                muted
                repeat
                controls={false}
              />
            )}
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.85)" style={styles.playOverlay} />
          </View>
        ) : (
          <Image source={{ uri: item.displayPath || item.path }} style={styles.thumb} />
        )}
        {selectionMode ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => shareFile(item.path, mediaFilter === 'video' ? 'video/*' : 'image/*', item.name)}
          >
            <Ionicons name="share-social-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { paddingTop: 20 + insets.top }]}>
          <Text style={styles.headerTitle}>Saved Status</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterTab} onPress={() => setMediaFilter('image')}>
            <Text style={[styles.filterTabText, mediaFilter === 'image' && styles.filterTabTextActive]}>
              IMAGES ({imageItems.length})
            </Text>
            {mediaFilter === 'image' ? <View style={styles.filterUnderline} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterTab} onPress={() => setMediaFilter('video')}>
            <Text style={[styles.filterTabText, mediaFilter === 'video' && styles.filterTabTextActive]}>
              VIDEOS ({videoItems.length})
            </Text>
            {mediaFilter === 'video' ? <View style={styles.filterUnderline} /> : null}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.contentArea}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : items.length === 0 ? (
          <EmptyState
            icon={mediaFilter === 'video' ? 'videocam-outline' : 'image-outline'}
            title={mediaFilter === 'video' ? 'No Saved Videos' : 'No Saved Photos'}
            message="Statuses you save will appear here."
            onRetry={load}
            actionLabel="Refresh"
            actionIcon="refresh-outline"
          />
        ) : (
          <FlatList
            key={numColumns}
            ref={listRef}
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          />
        )}
      </View>

      {selectionMode ? (
        <LinearGradient
          colors={colors.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bulkBar}
        >
          <TouchableOpacity style={styles.bulkCancel} onPress={exitSelection}>
            <Ionicons name="close" size={16} color={colors.white} />
            <Text style={styles.bulkCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.bulkCount}>{selected.size} selected</Text>
          <TouchableOpacity style={styles.bulkBtn} onPress={bulkShare} disabled={selected.size === 0}>
            <Ionicons name="share-social-outline" size={14} color={colors.primary} />
            <Text style={styles.bulkBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnDelete]} onPress={bulkDelete} disabled={selected.size === 0}>
            <Ionicons name="trash-outline" size={14} color={colors.white} />
            <Text style={[styles.bulkBtnText, styles.bulkBtnTextDelete]}>Delete</Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : null}

      <Modal visible={previewIndex >= 0} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalBg}>
          {/* Swipe tracking lives on this inner wrapper only — not the buttons/actions
              below, which sit as siblings so their own touch handling is never raced
              against the parent's raw onTouchStart/onTouchEnd. */}
          <View style={styles.modalMedia} onTouchStart={onPreviewTouchStart} onTouchEnd={onPreviewTouchEnd}>
            {previewIndex >= 0 && items[previewIndex] && mediaFilter === 'video' ? (
              <Video
                source={{ uri: items[previewIndex].displayPath || items[previewIndex].path }}
                style={styles.modalImage}
                resizeMode="contain"
                controls
                controlsStyles={{ hideNext: true, hidePrevious: true, hideSettingButton: true }}
                paused={false}
                onError={(e) => console.log('Video playback error:', JSON.stringify(e))}
              />
            ) : previewIndex >= 0 && items[previewIndex] ? (
              <Image
                source={{ uri: items[previewIndex].displayPath || items[previewIndex].path }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <TouchableOpacity style={styles.modalClose} onPress={closePreview} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalPrev, previewIndex <= 0 && styles.modalNavDisabled]}
            onPress={goPrevPreview}
            disabled={previewIndex <= 0}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalNext, previewIndex >= items.length - 1 && styles.modalNavDisabled]}
            onPress={goNextPreview}
            disabled={previewIndex >= items.length - 1}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={28} color={colors.white} />
          </TouchableOpacity>
          <LinearGradient
            colors={colors.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalActions}
          >
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() =>
                previewIndex >= 0 &&
                shareFile(
                  items[previewIndex].displayPath || items[previewIndex].path,
                  mediaFilter === 'video' ? 'video/*' : 'image/*',
                  items[previewIndex].name
                )
              }
            >
              <Ionicons name="share-social-outline" size={15} color={colors.primary} />
              <Text style={[styles.actBtnText, styles.actBtnTextDark]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actBtn, styles.actBtnDelete]}
              onPress={() => previewIndex >= 0 && handleDelete(items[previewIndex])}
            >
              <Ionicons name="trash-outline" size={15} color={colors.white} />
              <Text style={styles.actBtnText}>Delete</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title={deleteTarget?.kind === 'bulk' ? `Delete ${deleteTarget.items.length} files?` : 'Delete this file?'}
        message="This can't be undone once removed."
        confirmLabel="Delete"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const makeStyles = (colors, numColumns) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerGradient: {
    ...elevation(colors.shadow, 'md'),
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: 0.2, color: colors.white },
  filterRow: { flexDirection: 'row', paddingTop: 6 },
  filterTab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  filterTabText: { color: 'rgba(255,255,255,0.62)', fontWeight: '700', fontSize: 13, letterSpacing: 0.8 },
  filterTabTextActive: { color: colors.white },
  filterUnderline: { marginTop: 8, height: 3, width: '60%', backgroundColor: colors.gold, borderRadius: 2 },
  contentArea: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 32, color: colors.textSecondary },
  row: { justifyContent: 'flex-start', gap: 8 },
  grid: { padding: 8 },
  cell: {
    flex: 1 / numColumns,
    aspectRatio: 0.72,
    borderRadius: 14,
    backgroundColor: colors.card,
    ...elevation(colors.shadow, 'sm'),
  },
  cellClip: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  cellSelected: { borderWidth: 3, borderColor: colors.primary },
  thumb: { width: '100%', height: '100%' },
  videoThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  shareBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    ...elevation(colors.shadow, 'md'),
  },
  bulkCancel: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  bulkCancelText: { color: colors.white, fontWeight: '600' },
  bulkCount: { color: colors.white, fontWeight: '600' },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    ...elevation('#000', 'sm'),
  },
  bulkBtnDelete: { backgroundColor: '#EF5350' },
  bulkBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  bulkBtnTextDelete: { color: colors.white },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  modalMedia: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '75%' },
  modalClose: { position: 'absolute', top: 40, right: 20, padding: 6 },
  modalPrev: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -22,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalNext: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -22,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalNavDisabled: { opacity: 0.25 },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRadius: 24,
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    ...elevation('#000', 'sm'),
  },
  actBtnDelete: { backgroundColor: '#EF5350' },
  actBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  actBtnTextDark: { color: colors.primary },
});
