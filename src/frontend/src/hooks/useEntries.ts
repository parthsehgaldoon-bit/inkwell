import { createActor } from "@/backend";
import {
  type EditEntry,
  type Entry,
  type EntryFilter,
  type EntryId,
  EntryType,
  type NewEntry,
  PublishedStatus,
  SortOrder,
  type SortOrder as SortOrderType,
  type StyleReview,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * React Query hooks for every Inkwell backend method.
 *
 * `useActor(createActor)` is called at the top of each hook (never inside a
 * queryFn / mutationFn) and returns `{ actor, isFetching }`. Queries are
 * disabled until the actor is ready so unauthenticated visitors still get
 * sensible empty/loading states without throwing.
 */

const KEYS = {
  myEntries: (filter: EntryFilter) => ["my-entries", filter] as const,
  entry: (id: EntryId) => ["entry", String(id)] as const,
  publicEntry: (id: EntryId) => ["public-entry", String(id)] as const,
  publicFeed: (
    search: string | null,
    tag: string | null,
    order: SortOrderType,
  ) => ["public-feed", { search, tag, order }] as const,
};

/** List the signed-in author's own entries, optionally filtered. */
export function useListMyEntries(filter: EntryFilter = {}) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: KEYS.myEntries(filter),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyEntries(filter);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Fetch a single entry owned by the current author. */
export function useGetEntry(id: EntryId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: id === null ? ["entry", "none"] : KEYS.entry(id),
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getEntry(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

/** Fetch a published entry — accessible without sign-in. */
export function useGetPublicEntry(id: EntryId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: id === null ? ["public-entry", "none"] : KEYS.publicEntry(id),
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getPublicEntry(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

/** List the shared public feed. `search` and `tag` are optional filters. */
export function useListPublicFeed(
  search: string | null = null,
  tag: string | null = null,
  order: SortOrderType = SortOrder.newestFirst,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: KEYS.publicFeed(search, tag, order),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPublicFeed(search, tag, order);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Run the built-in rule-based style review on a body of text. */
export function useReviewEntryStyle(body: string, enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["style-review", body] as const,
    queryFn: async (): Promise<StyleReview> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.reviewEntryStyle(body);
    },
    enabled: !!actor && !isFetching && enabled && body.trim().length > 0,
    staleTime: 0,
  });
}

/** Create a new entry. Invalidates the author's entry list on success. */
export function useCreateEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (payload: NewEntry): Promise<Entry> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createEntry(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
    },
  });
}

/** Edit an existing entry. Invalidates the entry + list on success. */
export function useEditEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: EntryId;
      payload: EditEntry;
    }): Promise<Entry> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.editEntry(id, payload);
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      qc.invalidateQueries({ queryKey: KEYS.entry(entry.id) });
      if (entry.status === PublishedStatus.published) {
        qc.invalidateQueries({ queryKey: ["public-feed"] });
        qc.invalidateQueries({ queryKey: KEYS.publicEntry(entry.id) });
      }
    },
  });
}

/** Delete an entry. Invalidates the list on success. */
export function useDeleteEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: EntryId): Promise<void> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteEntry(id);
    },
    onSuccess: (_void, id) => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      qc.invalidateQueries({ queryKey: KEYS.entry(id) });
      qc.invalidateQueries({ queryKey: ["public-feed"] });
      qc.invalidateQueries({ queryKey: KEYS.publicEntry(id) });
    },
  });
}

/** Publish a draft entry to the public feed. */
export function usePublishEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: EntryId): Promise<Entry> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.publishEntry(id);
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      qc.invalidateQueries({ queryKey: KEYS.entry(entry.id) });
      qc.invalidateQueries({ queryKey: ["public-feed"] });
      qc.invalidateQueries({ queryKey: KEYS.publicEntry(entry.id) });
    },
  });
}

/** Unpublish a previously published entry (returns it to draft). */
export function useUnpublishEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: EntryId): Promise<Entry> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.unpublishEntry(id);
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      qc.invalidateQueries({ queryKey: KEYS.entry(entry.id) });
      qc.invalidateQueries({ queryKey: ["public-feed"] });
      qc.invalidateQueries({ queryKey: KEYS.publicEntry(entry.id) });
    },
  });
}

/** Convenience: parse a route param string into an EntryId (bigint). */
export function parseEntryId(raw: string | undefined): EntryId | null {
  if (!raw) return null;
  const n = BigInt(raw);
  if (n < 0n) return null;
  return n;
}

/** Re-export the enums so pages can build filter objects without importing @/backend. */
export { EntryType, PublishedStatus, SortOrder };
