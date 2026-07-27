import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowUpDown, Newspaper, Search, Tag, X } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SortOrder, useListPublicFeed } from "@/hooks/useEntries";
import { ENTRY_TYPE_LABELS, entryDateIso, formatEntryDate } from "@/types";
import type { Entry, SortOrder as SortOrderType } from "@/types";

/**
 * Public Feed page — a single shared feed of every published entry from every
 * author, ordered by publish date.
 *
 * Search (title/content) and tag filter are persisted in the URL query string
 * (`?q=…&tag=…&order=…`) so the view is shareable and survives reloads. No
 * login is required to read the feed.
 */

const DEFAULT_ORDER: SortOrderType = SortOrder.newestFirst;

/** Read the current feed search params straight from the router location. */
function useFeedSearch(): {
  q: string;
  tag: string;
  order: SortOrderType;
} {
  const search = useRouterState({ select: (s) => s.location.search }) as {
    q?: string;
    tag?: string;
    order?: string;
  };
  const q = typeof search.q === "string" ? search.q : "";
  const tag = typeof search.tag === "string" ? search.tag : "";
  const order: SortOrderType =
    search.order === SortOrder.oldestFirst
      ? SortOrder.oldestFirst
      : DEFAULT_ORDER;
  return { q, tag, order };
}

export function PublicFeedPage() {
  const navigate = useNavigate();
  const { q, tag, order } = useFeedSearch();

  // The hook takes null when the filter is empty so the backend returns all.
  const feedQuery = useListPublicFeed(
    q.trim() ? q.trim() : null,
    tag.trim() ? tag.trim() : null,
    order,
  );

  // Build the unique tag list from the unfiltered feed for the filter chips.
  // We re-query without filters only when we need the tag palette and there's
  // an active filter; otherwise the current result already has everything.
  const allTagsQuery = useListPublicFeed(null, null, DEFAULT_ORDER);
  const tagPalette = useMemo(() => {
    const list = allTagsQuery.data ?? [];
    const counts = new Map<string, number>();
    for (const entry of list) {
      for (const t of entry.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allTagsQuery.data]);

  /** Push a new search state into the URL. */
  function updateSearch(next: {
    q?: string;
    tag?: string;
    order?: SortOrderType;
  }) {
    const merged = { q, tag, order, ...next };
    const params: Record<string, string> = {};
    if (merged.q.trim()) params.q = merged.q.trim();
    if (merged.tag.trim()) params.tag = merged.tag.trim();
    if (merged.order !== DEFAULT_ORDER) params.order = merged.order;
    navigate({ to: "/feed", search: params, replace: false });
  }

  const entries = feedQuery.data ?? [];
  const isLoading = feedQuery.isLoading || feedQuery.isFetching;
  const isEmpty = !isLoading && entries.length === 0;
  const hasActiveFilters = q.trim() !== "" || tag.trim() !== "";

  return (
    <div className="mx-auto max-w-3xl" data-ocid="feed.page">
      {/* Page heading */}
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-primary">
          <Newspaper className="h-5 w-5" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.2em]">
            The Common
          </span>
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground">
          Public Feed
        </h1>
        <p className="mt-2 max-w-xl font-body text-muted-foreground">
          A single, shared shelf of everything published across Inkwell — blogs,
          notes, and diaries from every author, ordered by publish date.
        </p>
      </header>

      {/* Search + sort controls */}
      <div
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        data-ocid="feed.controls"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => updateSearch({ q: e.target.value })}
            placeholder="Search titles and content…"
            aria-label="Search entries by title or content"
            className="h-10 pl-9 font-body"
            data-ocid="feed.search_input"
          />
          {q && (
            <button
              type="button"
              onClick={() => updateSearch({ q: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid="feed.clear_search_button"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Select
            value={order}
            onValueChange={(v) => updateSearch({ order: v as SortOrderType })}
          >
            <SelectTrigger
              className="h-10 w-44 font-body"
              aria-label="Sort order"
              data-ocid="feed.sort_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SortOrder.newestFirst}>
                Newest first
              </SelectItem>
              <SelectItem value={SortOrder.oldestFirst}>
                Oldest first
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tag filter chips */}
      {tagPalette.length > 0 && (
        <div
          className="mb-8 flex flex-wrap items-center gap-2"
          data-ocid="feed.tag_filter"
        >
          <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Tag className="h-3.5 w-3.5" aria-hidden />
            Tags
          </span>
          <button
            type="button"
            onClick={() => updateSearch({ tag: "" })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tag.trim() === ""
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            data-ocid="feed.tag_chip.all"
            aria-pressed={tag.trim() === ""}
          >
            All
          </button>
          {tagPalette.slice(0, 16).map(([t, count]) => {
            const active = tag.trim() === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => updateSearch({ tag: active ? "" : t })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-ocid={`feed.tag_chip.${t}`}
                aria-pressed={active}
              >
                #{t}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter summary + clear */}
      {hasActiveFilters && !isLoading && (
        <div
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
          data-ocid="feed.active_filters"
        >
          <span>
            Showing{" "}
            <span className="font-medium text-foreground">
              {entries.length}
            </span>{" "}
            {entries.length === 1 ? "entry" : "entries"}
            {q.trim() && (
              <>
                {" "}
                matching <em className="text-foreground">“{q.trim()}”</em>
              </>
            )}
            {tag.trim() && (
              <>
                {" "}
                tagged <em className="text-foreground">#{tag.trim()}</em>
              </>
            )}
            .
          </span>
          <button
            type="button"
            onClick={() => updateSearch({ q: "", tag: "" })}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="feed.clear_filters_button"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        </div>
      )}

      {/* States */}
      {isLoading && <FeedSkeleton />}

      {!isLoading && isEmpty && (
        <div
          className="rounded-lg border border-dashed border-border bg-card p-12 text-center"
          data-ocid="feed.empty_state"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Newspaper className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-foreground">
            {hasActiveFilters
              ? "No entries match your search"
              : "The shelf is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm font-body text-muted-foreground">
            {hasActiveFilters
              ? "Try a different search term, clear the tag filter, or browse all published entries."
              : "No entries have been published yet. Once authors publish, their work will appear here for everyone to read."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => updateSearch({ q: "", tag: "" })}
              className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid="feed.empty_state.reset_button"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Feed list */}
      {!isLoading && entries.length > 0 && (
        <ul className="flex flex-col gap-6" data-ocid="feed.list">
          {entries.map((entry, i) => (
            <li key={entry.id.toString()}>
              <FeedCard
                entry={entry}
                index={i}
                activeTag={tag.trim()}
                onTag={(t) => updateSearch({ tag: t })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A single entry in the feed. */
function FeedCard({
  entry,
  index,
  activeTag,
  onTag,
}: {
  entry: Entry;
  index: number;
  activeTag: string;
  onTag: (tag: string) => void;
}) {
  const snippet = makeSnippet(entry.body, 220);
  const authorShort = shortPrincipal(entry.author.toText());
  const dateLabel = formatEntryDate(entry.publishedAt ?? entry.createdAt);
  const dateIso = entryDateIso(entry.publishedAt ?? entry.createdAt);

  return (
    <article
      className="group relative rounded-lg border border-border bg-card p-6 shadow-subtle transition-smooth hover:border-primary/40 hover:shadow-md"
      data-ocid={`feed.item.${index}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="font-mono">
          {ENTRY_TYPE_LABELS[entry.entryType]}
        </Badge>
        <span aria-hidden>·</span>
        <time dateTime={dateIso} className="font-body">
          {dateLabel}
        </time>
        <span aria-hidden>·</span>
        <span className="font-mono" title={entry.author.toText()}>
          {authorShort}
        </span>
      </div>

      <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-foreground">
        <Link
          to="/entry/$id"
          params={{ id: entry.id.toString() }}
          className="after:absolute after:inset-0 after:content-[''] transition-smooth hover:text-primary focus-visible:outline-none"
          data-ocid={`feed.item.${index}.link`}
        >
          {entry.title}
        </Link>
      </h2>

      {snippet && (
        <p className="mt-3 font-body leading-relaxed text-muted-foreground line-clamp-3">
          {snippet}
        </p>
      )}

      {entry.tags.length > 0 && (
        <div
          className="relative z-10 mt-4 flex flex-wrap gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {entry.tags.map((t) => {
            const active = activeTag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTag(active ? "" : t)}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-smooth hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-ocid={`feed.item.${index}.tag.${t}`}
                aria-pressed={active}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

/** Loading skeleton matching the feed card layout. */
function FeedSkeleton() {
  return (
    <ul className="flex flex-col gap-6" data-ocid="feed.loading_state">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholder
        <li key={i}>
          <div className="rounded-lg border border-border bg-card p-6 shadow-subtle">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-3 h-7 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <div className="mt-4 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Trim and collapse a body string into a short plain-text preview. */
function makeSnippet(body: string, max: number): string {
  const flat = body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 60 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Render a principal string as a short, readable handle (first 4 … last 4). */
function shortPrincipal(principalText: string): string {
  if (!principalText) return "";
  // Principals are typically 27 chars; show first 5 and last 4.
  if (principalText.length <= 12) return principalText;
  return `${principalText.slice(0, 5)}…${principalText.slice(-4)}`;
}
