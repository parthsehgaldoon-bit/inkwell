import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Hash, UserCircle } from "lucide-react";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPublicEntry } from "@/hooks/useEntries";
import { parseEntryId } from "@/hooks/useEntries";
import {
  ENTRY_TYPE_LABELS,
  entryDateIso,
  formatEntryDate,
  readingTimeLabel,
} from "@/types";
import type { Entry } from "@/types";

/**
 * Public Entry Detail page — the full, readable view of a single published
 * entry. No login required.
 *
 * The body is a plain string authored by the writer; we render it as literary
 * prose by splitting on blank lines into paragraphs and preserving intra-
 * paragraph line breaks. This keeps the warm editorial feel without assuming a
 * rich-text schema the backend does not expose.
 */
export function EntryDetailPage() {
  const params = useRouterState({
    select: (s) => s.location.pathname,
  }) as string;
  // pathname is "/entry/<id>"; pull the trailing segment.
  const idRaw = params.split("/").filter(Boolean)[1];
  const id = parseEntryId(idRaw);

  const entryQuery = useGetPublicEntry(id);
  const isLoading = entryQuery.isLoading || entryQuery.isFetching;
  const entry = entryQuery.data ?? null;
  const notFound = !isLoading && entry === null;

  return (
    <div className="mx-auto max-w-2xl" data-ocid="entry.page">
      {/* Back link */}
      <Link
        to="/feed"
        className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        data-ocid="entry.back_link"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to feed
      </Link>

      {isLoading && <EntrySkeleton />}

      {notFound && (
        <div
          className="mt-8 rounded-lg border border-dashed border-border bg-card p-12 text-center"
          data-ocid="entry.not_found"
        >
          <h1 className="font-display text-2xl text-foreground">
            Entry not found
          </h1>
          <p className="mx-auto mt-2 max-w-sm font-body text-muted-foreground">
            This entry may have been removed by its author, or the link is
            incomplete.
          </p>
          <Link
            to="/feed"
            className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="entry.not_found.feed_link"
          >
            Browse the public feed
          </Link>
        </div>
      )}

      {entry && <EntryView entry={entry} />}
    </div>
  );
}

/** Full rendered entry. */
function EntryView({ entry }: { entry: Entry }) {
  const dateLabel = formatEntryDate(entry.publishedAt ?? entry.createdAt);
  const dateIso = entryDateIso(entry.publishedAt ?? entry.createdAt);
  const authorShort = shortPrincipal(entry.author.toText());
  const wordCount = countWords(entry.body);
  const minutes =
    BigInt(Math.ceil(wordCount / 200)) < 1n
      ? 1n
      : BigInt(Math.ceil(wordCount / 200));

  return (
    <article className="mt-6" data-ocid="entry.view">
      {/* Type + date + author meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="font-mono">
          {ENTRY_TYPE_LABELS[entry.entryType]}
        </Badge>
        <span className="inline-flex items-center gap-1" aria-hidden>
          <CalendarDays className="h-3.5 w-3.5" />
          <time dateTime={dateIso} className="font-body">
            {dateLabel}
          </time>
        </span>
        <span aria-hidden>·</span>
        <span
          className="inline-flex items-center gap-1 font-mono"
          title={entry.author.toText()}
        >
          <UserCircle className="h-3.5 w-3.5" aria-hidden />
          {authorShort}
        </span>
        <span aria-hidden>·</span>
        <span className="font-body">{readingTimeLabel(minutes)}</span>
      </div>

      {/* Title */}
      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground">
        {entry.title}
      </h1>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div
          className="mt-4 flex flex-wrap items-center gap-1.5"
          data-ocid="entry.tags"
        >
          <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {entry.tags.map((t) => (
            <Link
              key={t}
              to="/feed"
              search={{ tag: t }}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-smooth hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid={`entry.tag.${t}`}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* Divider before the body, like a printed page rule */}
      <hr className="mt-6 border-border" />

      {/* Body — rendered as trusted HTML from the rich text editor */}
      <div
        className="prose prose-inkwell mt-6 max-w-none font-body text-[1.0625rem] leading-[1.8] text-foreground [&>p]:mb-5 [&>h1]:mt-6 [&>h1]:mb-3 [&>h1]:font-display [&>h1]:text-3xl [&>h1]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:font-display [&>h2]:text-2xl [&>h2]:font-semibold [&>h3]:mt-5 [&>h3]:mb-2 [&>h3]:font-display [&>h3]:text-xl [&>h3]:font-semibold [&>ul]:my-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:pl-6 [&>blockquote]:my-4 [&>blockquote]:border-l-2 [&>blockquote]:border-border [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>pre]:my-4 [&>pre]:overflow-x-auto [&>pre]:rounded-md [&>pre]:bg-secondary [&>pre]:p-4 [&>pre]:font-mono [&>pre]:text-sm [&>a]:text-primary [&>a]:underline [&>code]:rounded [&>code]:bg-secondary [&>code]:px-1 [&>code]:py-0.5 [&>code]:font-mono [&>code]:text-sm"
        data-ocid="entry.body"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: entry body is trusted HTML from the app's own rich text editor
        dangerouslySetInnerHTML={{
          __html:
            entry.body && entry.body.trim().length > 0
              ? entry.body
              : '<p class="text-muted-foreground italic">This entry has no body.</p>',
        }}
      />

      {/* Footer rule + back link */}
      <hr className="mt-10 border-border" />
      <div className="mt-6 flex items-center justify-between">
        <Link
          to="/feed"
          className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          data-ocid="entry.footer.back_link"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to feed
        </Link>
        <p className="font-display italic text-sm text-muted-foreground">
          Published {dateLabel}
        </p>
      </div>
    </article>
  );
}

/** Loading skeleton matching the entry layout. */
function EntrySkeleton() {
  return (
    <div className="mt-6" data-ocid="entry.loading_state">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-4 h-10 w-3/4" />
      <Skeleton className="mt-4 h-5 w-1/3 rounded-full" />
      <hr className="mt-6 border-border" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholder
          <Fragment key={i}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Rough word count for the reading-time estimate. Strips HTML first. */
function countWords(body: string): number {
  const text = body.replace(/<[^>]*>/g, " ");
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Short principal handle for display. */
function shortPrincipal(principalText: string): string {
  if (!principalText) return "";
  if (principalText.length <= 12) return principalText;
  return `${principalText.slice(0, 5)}…${principalText.slice(-4)}`;
}
