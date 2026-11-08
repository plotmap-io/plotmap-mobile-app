import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, mediaUrl } from '@/lib/api';
import {
  deleteListingPhoto,
  emptyDraft,
  generateMapViews,
  myDrafts,
  publishDraft,
  saveDraft,
  uploadListingPhoto,
  type PickedPhoto,
} from '@/lib/drafts';
import { metadata as fetchMetadata } from '@/lib/metadata';
import { fromSqm, isAreaUnit, type AreaUnit } from '@/services/area';
import {
  draftPayload,
  isPriceBasis,
  missingForPublish,
  type DraftState,
  type MissingItem,
} from '@/services/listing-draft';
import type { DraftListing, Metadata } from '@/types/api';
import { isUploadedPhoto } from '@/types/api';

/**
 * The state of one listing being created, held for the whole flow.
 *
 * The server owns the listing: a draft row exists before the first photo is
 * taken, every step saves onto it, and nothing here is a local copy waiting
 * to be reconciled. What this provider adds is the one thing the server
 * cannot hold — which photos are still in flight, and what went wrong with
 * the ones that failed.
 *
 * Coming back to Create listing CONTINUES the newest unpublished draft
 * rather than starting another one, because `GET /drafts` is already
 * `is_published = false` ordered newest first.
 */

/** A photo on its way to the server, or already there. */
export interface FlowPhoto {
  key: string;
  /** The local file while it uploads; the served URL once it has landed. */
  uri: string;
  state: 'uploading' | 'done' | 'failed';
  /** The server's own words, when it refused. */
  error?: string;
  mediaId?: string;
}

/** Everything the broker decides, minus what the photos already say. */
export type DraftValues = Omit<DraftState, 'uploadedPhotos'>;

const BLANK: DraftValues = {
  status: 'ForSale',
  propertyType: '',
  propertySubType: '',
  pin: null,
  address: {},
  priceAmount: 0,
  priceBasis: 'total',
  areaValue: 0,
  // The pilot is Kerala: land is quoted in cents, and `metadata.countries`
  // agrees (IN → cent). The unit tabs can change it.
  areaUnit: 'cent',
  currency: 'INR',
  description: '',
};

interface CreateFlowState {
  ready: boolean;
  error: string | null;
  retry: () => void;
  /**
   * The server's last word on the draft — its id, and its `imagesAdded`,
   * which is the truth about whether a photo landed.
   */
  serverDraft: DraftListing | null;
  metadata: Metadata | null;

  photos: FlowPhoto[];
  addPhotos: (picked: PickedPhoto[]) => void;
  retryPhoto: (key: string) => void;
  removePhoto: (key: string) => void;

  values: DraftValues;
  patch: (part: Partial<DraftValues>) => void;
  draft: DraftState;
  missing: MissingItem[];

  saving: boolean;
  save: () => Promise<void>;
  publishing: boolean;
  publish: () => Promise<string>;
}

const FlowContext = createContext<CreateFlowState | null>(null);

function say(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : fallback;
}

/** What a stored draft means in the flow's own words. */
function adoptValues(d: DraftListing): DraftValues {
  const unit: AreaUnit = isAreaUnit(d.lotSizeDisplayUnit) ? d.lotSizeDisplayUnit : 'cent';
  const lat = d.location?.latitude ?? 0;
  const lng = d.location?.longitude ?? 0;
  // An empty draft is born "Residential / house" — the server's default, not
  // a choice anyone made. `propertyTypeAdded` is how it says so.
  const typed = d.propertyTypeAdded ?? !(d.propertyType === 'Residential' && d.propertySubType === 'house');

  return {
    status: d.status === 'ForRent' ? 'ForRent' : 'ForSale',
    propertyType: typed ? (d.propertyType ?? '') : '',
    propertySubType: typed ? (d.propertySubType ?? '') : '',
    pin: lat !== 0 || lng !== 0 ? { latitude: lat, longitude: lng } : null,
    address: {
      addressDisplay: d.location?.addressDisplay || undefined,
      city: d.location?.city,
      stateProvince: d.location?.stateProvince,
      country: d.location?.country,
      countryCode: d.location?.countryCode,
      postalCode: d.location?.postalCode,
      neighborhood: d.location?.neighborhood,
    },
    priceAmount: d.askAmount > 0 ? d.askAmount : 0,
    priceBasis: isPriceBasis(d.askAreaUnit) ? d.askAreaUnit : 'total',
    areaValue: (d.lotSizeSqm ?? 0) > 0 ? Math.round(fromSqm(d.lotSizeSqm ?? 0, unit) * 100) / 100 : 0,
    areaUnit: unit,
    // USD is the empty draft's default, never a Kerala broker's answer.
    currency: d.askCurrency && d.askCurrency !== 'USD' ? d.askCurrency : 'INR',
    description: d.description ?? '',
    listedByOwner: d.listedByOwner,
  };
}

/** The photos a stored draft already has — uploads only, in gallery order. */
function adoptPhotos(d: DraftListing): FlowPhoto[] {
  return (d.listingMedia ?? [])
    .filter(isUploadedPhoto)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((m) => ({
      key: m.id,
      uri: mediaUrl(m.thumbnailUrl ?? m.url) ?? '',
      state: 'done' as const,
      mediaId: m.id,
    }));
}

export function CreateFlowProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [serverDraft, setServerDraft] = useState<DraftListing | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [photos, setPhotos] = useState<FlowPhoto[]>([]);
  const [values, setValues] = useState<DraftValues>(BLANK);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const draftId = useRef<string | null>(null);
  /** The next `displayOrder`, so a second batch does not reuse the first's. */
  const nextOrder = useRef(0);
  /**
   * What each photo is, outside React state: a retry needs the picked file
   * and a removal needs the server's media id. Reading them from a state
   * updater would put a network call inside a reducer, which React is free
   * to run twice — and that would upload the same photo twice.
   */
  const picked = useRef(new Map<string, PickedPhoto>());
  const mediaIds = useRef(new Map<string, string>());

  // A promise chain, not an `async` effect body: every state write happens in
  // a callback, which is what `react-hooks/set-state-in-effect` is about.
  useEffect(() => {
    let alive = true;
    Promise.all([
      myDrafts().catch(() => [] as DraftListing[]),
      fetchMetadata().catch(() => null),
    ])
      .then(([drafts, meta]) => {
        const resumed = (Array.isArray(drafts) ? drafts : []).find((d) => !d.isPublished);
        return Promise.resolve(resumed ?? emptyDraft()).then((draft) => ({ draft, meta }));
      })
      .then(({ draft, meta }) => {
        if (!alive) return;
        draftId.current = draft.id;
        const existing = adoptPhotos(draft);
        nextOrder.current = existing.length;
        for (const p of existing) if (p.mediaId) mediaIds.current.set(p.key, p.mediaId);
        setPhotos(existing);
        setValues(adoptValues(draft));
        setServerDraft(draft);
        setMetadata(meta);
        setError(null);
        setReady(true);
      })
      .catch((e: unknown) => {
        if (alive) setError(say(e, 'Could not start a draft'));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const mark = useCallback((key: string, part: Partial<FlowPhoto>) => {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...part } : p)));
  }, []);

  const send = useCallback(
    (key: string, file: PickedPhoto, order: number) => {
      const id = draftId.current;
      if (!id) return;
      mark(key, { state: 'uploading', error: undefined });
      uploadListingPhoto(id, file, { displayOrder: order, isPrimary: order === 0 })
        .then((media) => {
          mediaIds.current.set(key, media.id);
          mark(key, { state: 'done', mediaId: media.id, error: undefined });
          // A photo taken on the plot knows where the plot is. The server
          // reads the GPS EXIF and hands it back, so the Where step opens on
          // the ground the broker was standing on — but only if he has not
          // already placed a pin himself.
          const at = media.suggestedLocation ?? media.extractedGps;
          if (at && Number.isFinite(at.latitude) && Number.isFinite(at.longitude)) {
            setValues((v) => (v.pin ? v : { ...v, pin: { latitude: at.latitude, longitude: at.longitude } }));
          }
        })
        .catch((e: unknown) =>
          // The server's text, never "upload failed": "Unpublish the listing
          // to change its photos." is a different problem from a dead
          // network, and the broker can only act on the real one.
          mark(key, { state: 'failed', error: say(e, 'The photo did not reach the server') }),
        );
    },
    [mark],
  );

  const addPhotos = useCallback(
    (files: PickedPhoto[]) => {
      if (!files.length) return;
      const base = nextOrder.current;
      nextOrder.current = base + files.length;
      const items: FlowPhoto[] = files.map((file, i) => {
        const key = `${base + i}-${Math.random().toString(36).slice(2, 8)}`;
        picked.current.set(key, file);
        return { key, uri: file.uri, state: 'uploading' as const };
      });
      setPhotos((prev) => [...prev, ...items]);
      items.forEach((item, i) => send(item.key, files[i], base + i));
    },
    [send],
  );

  const retryPhoto = useCallback(
    (key: string) => {
      const file = picked.current.get(key);
      if (!file) return;
      // A retry goes to the END of the gallery: the order it was given the
      // first time may already belong to a photo that landed.
      const order = nextOrder.current;
      nextOrder.current = order + 1;
      send(key, file, order);
    },
    [send],
  );

  const removePhoto = useCallback((key: string) => {
    const id = draftId.current;
    const mediaId = mediaIds.current.get(key);
    if (id && mediaId) {
      deleteListingPhoto(id, mediaId).catch(() => {
        // It stays gone on the phone; the next draft read is the truth.
      });
    }
    picked.current.delete(key);
    mediaIds.current.delete(key);
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const patch = useCallback((part: Partial<DraftValues>) => {
    setValues((v) => ({ ...v, ...part }));
  }, []);

  const uploaded = photos.filter((p) => p.state === 'done').length;
  const draft = useMemo<DraftState>(
    () => ({ ...values, uploadedPhotos: uploaded }),
    [values, uploaded],
  );
  const missing = useMemo(() => missingForPublish(draft), [draft]);

  const save = useCallback(async () => {
    const id = draftId.current;
    if (!id) throw new Error('No draft to save yet');
    setSaving(true);
    try {
      const updated = await saveDraft(id, draftPayload({ ...values, uploadedPhotos: uploaded }));
      setServerDraft(updated);
      // The three satellite views of the pin, as the web's Where step draws
      // them. Best effort: a listing with a photo does not need them, and a
      // missing Mapbox token on the server must not block the flow.
      if (updated.location?.latitude || updated.location?.longitude) {
        generateMapViews(id).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }, [uploaded, values]);

  const publish = useCallback(async () => {
    const id = draftId.current;
    if (!id) throw new Error('No draft to publish yet');
    setPublishing(true);
    try {
      await save();
      const result = await publishDraft(id);
      return result.listingId ?? id;
    } finally {
      setPublishing(false);
    }
  }, [save]);

  const value = useMemo(
    () => ({
      ready,
      error,
      retry,
      serverDraft,
      metadata,
      photos,
      addPhotos,
      retryPhoto,
      removePhoto,
      values,
      patch,
      draft,
      missing,
      saving,
      save,
      publishing,
      publish,
    }),
    [
      ready,
      error,
      retry,
      serverDraft,
      metadata,
      photos,
      addPhotos,
      retryPhoto,
      removePhoto,
      values,
      patch,
      draft,
      missing,
      saving,
      save,
      publishing,
      publish,
    ],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useCreateFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useCreateFlow must be used inside CreateFlowProvider');
  return ctx;
}
