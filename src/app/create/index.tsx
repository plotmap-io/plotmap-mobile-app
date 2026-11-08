import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { CreateGate } from '@/components/create/gate';
import { Group, StepScreen } from '@/components/create/step-screen';
import { Button, Tap } from '@/components/tap';
import { useCreateFlow, type FlowPhoto } from '@/lib/create-flow';
import type { PickedPhoto } from '@/lib/drafts';
import { color, radius, space, type, weight } from '@/theme/tokens';

/**
 * Step 1 — the photographs.
 *
 * This is the step the app did not have, and the reason nothing could be
 * published from a phone: `validateForPublish` requires at least one
 * **uploaded** photo (the satellite views the server draws do not count).
 *
 * Uploads start the moment a photo is picked, as on the web, so the walk back
 * to the car is the upload. Each tile carries its own state and its own
 * failure — one dead photo must not make the broker start again.
 */

/** What the picker gives us, in the fields the upload needs. */
function toPicked(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  return {
    uri: asset.uri,
    // An iOS camera-roll asset often carries NO mime type and no name.
    // Never reject on that: `accept` already limited the picker to images,
    // and both this client and the server assume JPEG.
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    file: asset.file,
  };
}

function Tile({
  photo,
  onRemove,
  onRetry,
}: {
  photo: FlowPhoto;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const failed = photo.state === 'failed';
  return (
    <View style={styles.tile}>
      <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" transition={120} />

      {photo.state === 'uploading' ? (
        <View style={styles.veil}>
          <ActivityIndicator color={color.surface} />
        </View>
      ) : null}

      {failed ? (
        <Tap
          haptic="light"
          scale={0.97}
          style={[styles.veil, styles.veilFailed]}
          accessibilityRole="button"
          accessibilityLabel="Upload failed. Tap to try again."
          onPress={onRetry}>
          <Feather name="rotate-ccw" size={18} color={color.surface} />
          <Text style={styles.retry}>Retry</Text>
        </Tap>
      ) : null}

      <Tap
        haptic="light"
        scale={0.9}
        hitSlop={8}
        style={styles.remove}
        accessibilityRole="button"
        accessibilityLabel="Remove this photo"
        onPress={onRemove}>
        <Feather name="x" size={13} color={color.surface} />
      </Tap>
    </View>
  );
}

export default function PhotosStep() {
  const { photos, addPhotos, removePhoto, retryPhoto } = useCreateFlow();
  const [busy, setBusy] = useState<'library' | 'camera' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const library = useCallback(() => {
    setBusy('library');
    setNote(null);
    // Picking from the library needs no permission of its own (SDK 58:
    // "No permissions request is necessary for launching the image library").
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 12,
      // A field phone takes 4000px photos; 0.8 keeps them well under the
      // 25 MB the production nginx accepts without visibly softening them.
      quality: 0.8,
      exif: true,
    })
      .then((result) => {
        if (!result.canceled) addPhotos(result.assets.map(toPicked));
      })
      .catch((e: unknown) =>
        setNote(e instanceof Error ? e.message : 'The photo library could not be opened'),
      )
      .finally(() => setBusy(null));
  }, [addPhotos]);

  const camera = useCallback(() => {
    setBusy('camera');
    setNote(null);
    ImagePicker.requestCameraPermissionsAsync()
      .then((permission) => {
        if (!permission.granted) {
          setNote(
            permission.canAskAgain
              ? 'The camera needs your permission. Tap Take a photo again to allow it.'
              : 'Camera access is off for Plotmap. Turn it on in Settings, or choose a photo from the library.',
          );
          return undefined;
        }
        return ImagePicker.launchCameraAsync({ quality: 0.8, exif: true }).then((result) => {
          if (!result.canceled) addPhotos(result.assets.map(toPicked));
        });
      })
      .catch((e: unknown) =>
        setNote(e instanceof Error ? e.message : 'The camera could not be opened'),
      )
      .finally(() => setBusy(null));
  }, [addPhotos]);

  const failures = [...new Set(photos.filter((p) => p.error).map((p) => p.error as string))];
  const landed = photos.filter((p) => p.state === 'done').length;

  return (
    <CreateGate>
      <StepScreen
        step={1}
        title="Photos"
        lead="Photograph the plot — the road frontage, the corners, the view from the gate. A listing needs at least one photo to go live."
        footer={
          <Button
            label="Continue"
            size="lg"
            accessibilityLabel="Continue to where it is"
            onPress={() => router.push('/create/where')}
          />
        }>
        <Group
          label={photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'Photos'}
          note={
            photos.length
              ? `${landed} of ${photos.length} uploaded. The first one is the cover.`
              : undefined
          }>
          <View style={styles.grid}>
            {photos.map((photo) => (
              <Tile
                key={photo.key}
                photo={photo}
                onRemove={() => removePhoto(photo.key)}
                onRetry={() => retryPhoto(photo.key)}
              />
            ))}
            {photos.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="image" size={20} color={color.faint} />
                <Text style={styles.emptyText}>No photos yet</Text>
              </View>
            ) : null}
          </View>
        </Group>

        <View style={styles.actions}>
          {Platform.OS === 'web' ? null : (
            <Button
              label="Take a photo"
              variant="secondary"
              size="md"
              busy={busy === 'camera'}
              icon={<Feather name="camera" size={16} color={color.accent} />}
              onPress={camera}
              style={styles.action}
            />
          )}
          <Button
            label="Choose from library"
            variant="secondary"
            size="md"
            busy={busy === 'library'}
            icon={<Feather name="image" size={16} color={color.accent} />}
            onPress={library}
            style={styles.action}
          />
        </View>

        {note ? <Text style={styles.warn}>{note}</Text> : null}
        {failures.map((message) => (
          <Text key={message} style={styles.warn}>
            {message}
          </Text>
        ))}
      </StepScreen>
    </CreateGate>
  );
}

const TILE = '31.8%';

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  tile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: color.field,
    // A pale photo on a pale ground is no tile at all until it has an edge.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  photo: { width: '100%', height: '100%' },
  veil: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(16,28,36,0.45)',
  },
  veilFailed: { backgroundColor: 'rgba(139,44,62,0.62)' },
  retry: { fontSize: type.caption, fontWeight: weight.semibold, color: color.surface },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(16,28,36,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    width: '100%',
    height: 104,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: { fontSize: type.sub, color: color.faint },
  actions: { flexDirection: 'row', gap: space[2] },
  action: { flex: 1 },
  warn: { fontSize: type.footnote, lineHeight: 17, color: color.redInk, paddingHorizontal: 2 },
});
