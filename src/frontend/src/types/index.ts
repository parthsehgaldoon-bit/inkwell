/**
 * Frontend type contract for Inkwell.
 *
 * Re-exports the generated backend types from `@/backend` so pages and hooks
 * import from a single, stable surface. Adds a few frontend-only helpers
 * (variant label maps, timestamp formatting) used across pages.
 */
import type { Principal } from "@icp-sdk/core/principal";

export type {
  Entry,
  NewEntry,
  EditEntry,
  EntryFilter,
  EntryId,
  EntryType,
  PublishedStatus,
  SortOrder,
  StyleReview,
  StyleSuggestion,
  StyleRule,
  Timestamp,
  UserId,
} from "@/backend";

import {
  type Entry,
  EntryType,
  type EntryType as EntryTypeType,
  PublishedStatus,
  type PublishedStatus as PublishedStatusType,
  SortOrder,
  type SortOrder as SortOrderType,
  StyleRule,
  type StyleRule as StyleRuleType,
} from "@/backend";

export type { Principal };

/** Human-readable labels for the three entry kinds. */
export const ENTRY_TYPE_LABELS: Record<EntryTypeType, string> = {
  [EntryType.blog]: "Blog",
  [EntryType.note]: "Note",
  [EntryType.diary]: "Diary",
};

/** Human-readable labels for the publish lifecycle. */
export const STATUS_LABELS: Record<PublishedStatusType, string> = {
  [PublishedStatus.draft]: "Draft",
  [PublishedStatus.published]: "Published",
};

/** Human-readable labels for the public feed sort order. */
export const SORT_ORDER_LABELS: Record<SortOrderType, string> = {
  [SortOrder.newestFirst]: "Newest first",
  [SortOrder.oldestFirst]: "Oldest first",
};

/** Human-readable labels for the built-in style rules. */
export const STYLE_RULE_LABELS: Record<StyleRuleType, string> = {
  [StyleRule.longSentence]: "Long sentence",
  [StyleRule.readability]: "Readability",
  [StyleRule.passiveVoice]: "Passive voice",
  [StyleRule.repeatedWords]: "Repeated words",
};

/** Short helper to format a backend timestamp (ns since epoch) as a date. */
export function formatEntryDate(ns: bigint | undefined): string {
  if (ns === undefined) return "";
  const ms = Number(ns / 1_000_000n);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Convert a backend timestamp (ns) to an ISO string for <time dateTime>. */
export function entryDateIso(ns: bigint | undefined): string {
  if (ns === undefined) return "";
  const ms = Number(ns / 1_000_000n);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString();
}

/** Reading-time estimate from a StyleReview's word count + minutes. */
export function readingTimeLabel(minutes: bigint): string {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return "Under a minute";
  if (m === 1) return "1 min read";
  return `${m} min read`;
}

/** True when an entry is owned by the given principal. */
export function isEntryAuthor(
  entry: Entry,
  principal: Principal | null | undefined,
): boolean {
  if (!principal) return false;
  return entry.author.toText() === principal.toText();
}
