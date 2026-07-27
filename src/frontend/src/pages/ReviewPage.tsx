import type { EntryId } from "@/backend";
import { useGetEntry, useReviewEntryStyle } from "@/hooks/useEntries";
import {
  ENTRY_TYPE_LABELS,
  type Entry,
  STYLE_RULE_LABELS,
  type StyleRule,
  type StyleSuggestion,
  entryDateIso,
  formatEntryDate,
  readingTimeLabel,
} from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  PenLine,
  Quote,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Style Review page — a separate panel triggered on demand after drafting.
 *
 * Layout: the entry content sits on the left as the "manuscript" while the
 * review suggestions sit on the right in a sage-accented marginalia panel.
 * On mobile the two stack with the review below the manuscript.
 *
 * The review is NOT run automatically on page load. The author presses
 * "Run style review" to trigger `reviewEntryStyle` on the entry body, so the
 * panel is genuinely on-demand rather than inline while typing.
 */
export function ReviewPage({ id }: { id: EntryId }) {
  const navigate = useNavigate();
  const entryQuery = useGetEntry(id);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const entry = entryQuery.data ?? null;
  const reviewQuery = useReviewEntryStyle(
    entry?.body ?? "",
    reviewRequested && !!entry && entry.body.trim().length > 0,
  );

  const review = reviewQuery.data ?? null;
  const visibleSuggestions = useMemo(() => {
    if (!review) return [];
    return review.suggestions
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => !dismissed.has(i))
      .map(({ s, i }) => ({ ...s, _key: i }));
  }, [review, dismissed]);

  function handleDismiss(key: number) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function handleReset() {
    setDismissed(new Set());
    setReviewRequested(false);
  }

  // --- Entry not found / loading -------------------------------------------
  if (entryQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl" data-ocid="review.loading_state">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (entryQuery.isError || entry === null) {
    return (
      <div
        className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-subtle"
        data-ocid="review.error_state"
      >
        <h2 className="font-display text-2xl text-foreground">
          Entry not found
        </h2>
        <p className="mt-2 font-body text-muted-foreground">
          We couldn’t load this entry. It may have been deleted, or the link is
          invalid.
        </p>
        <Link
          to="/my-entries"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="review.back_to_my_entries_button"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to My Entries
        </Link>
      </div>
    );
  }

  const wordCount = review?.wordCount ?? null;
  const readingMinutes = review?.readingTimeMinutes ?? null;

  return (
    <div className="space-y-6" data-ocid="review.page">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-body text-sm uppercase tracking-[0.18em] text-muted-foreground">
            Style Review
          </p>
          <h1 className="mt-1 truncate font-display text-3xl font-semibold text-foreground">
            {entry.title || "Untitled"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-muted-foreground">
            <span>{ENTRY_TYPE_LABELS[entry.entryType]}</span>
            <span aria-hidden>·</span>
            <time dateTime={entryDateIso(entry.createdAt)}>
              {formatEntryDate(entry.createdAt)}
            </time>
            {entry.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-xs">
                  {entry.tags.map((t) => `#${t}`).join(" ")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!reviewRequested}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            data-ocid="review.reset_button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reset
          </button>
          <Link
            to="/editor/$id"
            params={{ id: String(id) }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="review.return_to_editor_button"
          >
            <PenLine className="h-4 w-4" aria-hidden />
            Return to editor
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        {/* Manuscript column — entry content on warm paper */}
        <article
          className="rounded-lg border border-border bg-paper p-6 shadow-subtle sm:p-8 lg:p-10"
          data-ocid="review.manuscript"
        >
          <header className="mb-6 border-b border-border pb-4">
            <h2 className="font-display text-2xl text-foreground">
              {entry.title || "Untitled"}
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              The manuscript under review.
            </p>
          </header>
          <div
            className="prose prose-inkwell max-w-none font-body text-foreground/90 [&>p]:mb-4 [&>h1]:mt-5 [&>h1]:mb-2 [&>h1]:font-display [&>h1]:text-2xl [&>h1]:font-semibold [&>h2]:mt-5 [&>h2]:mb-2 [&>h2]:font-display [&>h2]:text-xl [&>h2]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2 [&>h3]:font-display [&>h3]:text-lg [&>h3]:font-semibold [&>ul]:my-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:pl-6 [&>blockquote]:my-3 [&>blockquote]:border-l-2 [&>blockquote]:border-border [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>pre]:my-3 [&>pre]:overflow-x-auto [&>pre]:rounded-md [&>pre]:bg-secondary [&>pre]:p-3 [&>pre]:font-mono [&>pre]:text-sm [&>a]:text-primary [&>a]:underline [&>code]:rounded [&>code]:bg-secondary [&>code]:px-1 [&>code]:py-0.5 [&>code]:font-mono [&>code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: entry body is trusted HTML from the app's own rich text editor
            dangerouslySetInnerHTML={{
              __html:
                entry.body && entry.body.trim().length > 0
                  ? entry.body
                  : '<p class="text-muted-foreground italic">This entry is empty.</p>',
            }}
          />
        </article>

        {/* Marginalia column — sage-accented review panel */}
        <aside
          className="flex flex-col rounded-lg border-2 border-accent/40 bg-accent/5 p-5 shadow-subtle lg:sticky lg:top-20 lg:self-start"
          data-ocid="review.panel"
          aria-label="Style review panel"
        >
          <div className="flex items-center gap-2 border-b border-accent/30 pb-3">
            <Quote className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Marginalia
            </h2>
          </div>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            A built-in rule-based reader. Run it when you’re ready to refine.
          </p>

          {/* Review controls + stats */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!reviewRequested ? (
              <button
                type="button"
                onClick={() => setReviewRequested(true)}
                disabled={entry.body.trim().length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                data-ocid="review.run_button"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Run style review
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reviewQuery.refetch()}
                disabled={reviewQuery.isFetching}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-medium text-accent-foreground transition-smooth hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                data-ocid="review.rerun_button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${reviewQuery.isFetching ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Re-run review
              </button>
            )}
          </div>

          {/* Stats row — word count + reading time from the review */}
          {review && (
            <dl
              className="mt-4 grid grid-cols-2 gap-2"
              data-ocid="review.stats"
            >
              <Stat
                icon={<FileText className="h-4 w-4" aria-hidden />}
                label="Word count"
                value={
                  wordCount === null ? "—" : Number(wordCount).toLocaleString()
                }
              />
              <Stat
                icon={<Clock className="h-4 w-4" aria-hidden />}
                label="Reading time"
                value={
                  readingMinutes === null
                    ? "—"
                    : readingTimeLabel(readingMinutes)
                }
              />
            </dl>
          )}

          {/* Panel body — states */}
          <div className="mt-5 min-h-[12rem] flex-1">
            {!reviewRequested && !reviewQuery.isFetching ? (
              <PanelIdle />
            ) : reviewQuery.isFetching ? (
              <PanelLoading />
            ) : reviewQuery.isError ? (
              <PanelError onRetry={() => reviewQuery.refetch()} />
            ) : visibleSuggestions.length === 0 ? (
              <PanelEmpty
                total={review?.suggestions.length ?? 0}
                dismissedCount={dismissed.size}
              />
            ) : (
              <SuggestionList
                suggestions={visibleSuggestions}
                onDismiss={handleDismiss}
              />
            )}
          </div>

          {/* Footer — return to editor to apply changes manually */}
          <div className="mt-5 border-t border-accent/30 pt-4">
            <Link
              to="/editor/$id"
              params={{ id: String(id) }}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-medium text-accent-foreground transition-smooth hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              data-ocid="review.apply_in_editor_button"
            >
              <PenLine className="h-4 w-4" aria-hidden />
              Apply changes in the editor
            </Link>
            <p className="mt-2 text-center font-body text-xs text-muted-foreground">
              Suggestions stay here as notes — edit the manuscript yourself.
            </p>
          </div>
        </aside>
      </div>

      {/* Hidden navigation hook for screen readers / back behavior */}
      <button
        type="button"
        onClick={() =>
          navigate({ to: "/editor/$id", params: { id: String(id) } })
        }
        className="sr-only"
        data-ocid="review.hidden_back_button"
      >
        Back to editor
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-accent/30 bg-card/60 px-3 py-2"
      data-ocid="review.stat"
    >
      <span className="text-accent">{icon}</span>
      <div className="min-w-0">
        <dt className="font-body text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="truncate font-mono text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function PanelIdle() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-accent/40 bg-accent/5 px-4 py-8 text-center"
      data-ocid="review.idle_state"
    >
      <Sparkles className="h-8 w-8 text-accent/70" aria-hidden />
      <p className="mt-3 font-display text-lg text-foreground">
        Ready when you are
      </p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Press{" "}
        <span className="font-medium text-foreground">Run style review</span> to
        scan the manuscript for passive voice, long sentences, repeated words,
        and readability.
      </p>
    </div>
  );
}

function PanelLoading() {
  return (
    <div
      className="space-y-3"
      data-ocid="review.reviewing_state"
      aria-busy="true"
    >
      <p className="font-body text-sm text-muted-foreground">
        Reading the manuscript…
      </p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-md border border-accent/20 bg-card/60 p-3"
          data-ocid={`review.skeleton.${i}`}
        >
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center"
      data-ocid="review.review_error_state"
    >
      <p className="font-display text-lg text-foreground">
        Couldn’t finish the review
      </p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Something went wrong while running the style check. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid="review.retry_button"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}

function PanelEmpty({
  total,
  dismissedCount,
}: {
  total: number;
  dismissedCount: number;
}) {
  const allDismissed = total > 0 && dismissedCount >= total;
  return (
    <div
      className="flex h-full flex-col items-center justify-center rounded-md border border-accent/30 bg-accent/10 px-4 py-8 text-center"
      data-ocid="review.empty_state"
    >
      <Check className="h-10 w-10 text-accent" aria-hidden />
      <p className="mt-3 font-display text-xl text-foreground">
        {allDismissed ? "All notes dismissed" : "Your writing looks clean!"}
      </p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        {allDismissed
          ? "You’ve cleared every suggestion. Re-run the review or return to the editor."
          : "No style issues found in this manuscript. Lovely work — ready to publish."}
      </p>
    </div>
  );
}

function SuggestionList({
  suggestions,
  onDismiss,
}: {
  suggestions: Array<StyleSuggestion & { _key: number }>;
  onDismiss: (key: number) => void;
}) {
  return (
    <ul className="space-y-3" data-ocid="review.suggestion_list">
      {suggestions.map((s, idx) => (
        <li
          key={s._key}
          className="animate-fade-in rounded-md border border-accent/30 bg-card/70 p-3 shadow-xs"
          data-ocid={`review.suggestion.${idx}`}
        >
          <div className="flex items-start justify-between gap-2">
            <RuleBadge rule={s.rule} />
            <button
              type="button"
              onClick={() => onDismiss(s._key)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss this suggestion"
              data-ocid={`review.dismiss_button.${idx}`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Flagged text */}
          <div className="mt-2">
            <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">
              Flagged
            </p>
            <blockquote className="mt-1 border-l-2 border-accent/50 bg-accent/5 px-3 py-2 font-body text-sm italic text-foreground/90">
              “{s.flaggedText}”
            </blockquote>
          </div>

          {/* Suggested improvement */}
          <div className="mt-2">
            <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">
              Suggestion
            </p>
            <p className="mt-1 font-body text-sm text-foreground">
              {s.suggestion}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RuleBadge({ rule }: { rule: StyleRule }) {
  const label = STYLE_RULE_LABELS[rule] ?? "Style";
  return (
    <span
      className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-body text-xs font-medium text-accent-foreground"
      data-ocid="review.rule_badge"
    >
      {label}
    </span>
  );
}

// Re-export the page component shape for the router.
export type { Entry };
