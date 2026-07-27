import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  NotebookPen,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntryType,
  PublishedStatus,
  useDeleteEntry,
  useListMyEntries,
  usePublishEntry,
  useUnpublishEntry,
} from "@/hooks/useEntries";
import {
  ENTRY_TYPE_LABELS,
  type Entry,
  type EntryFilter,
  type EntryType as EntryTypeType,
  type PublishedStatus as PublishedStatusType,
  STATUS_LABELS,
  entryDateIso,
  formatEntryDate,
} from "@/types";

/**
 * My Entries — the signed-in author's personal library.
 *
 * Search and filter state lives in the URL query string so a refresh keeps
 * the view and a copied link shares the exact filter set. The page reads
 * `q`, `type`, and `status` from `location.search` and writes back through
 * `useNavigate`, debouncing the search input so typing doesn't thrash the
 * router history.
 */

type TypeFilter = "all" | EntryTypeType;
type StatusFilter = "all" | PublishedStatusType;

const TYPE_FILTER_VALUES: EntryTypeType[] = [
  EntryType.blog,
  EntryType.note,
  EntryType.diary,
];
const STATUS_FILTER_VALUES: PublishedStatusType[] = [
  PublishedStatus.draft,
  PublishedStatus.published,
];

const TYPE_ICON: Record<EntryTypeType, React.ReactNode> = {
  [EntryType.blog]: <BookOpen className="h-3.5 w-3.5" aria-hidden />,
  [EntryType.note]: <FileText className="h-3.5 w-3.5" aria-hidden />,
  [EntryType.diary]: <NotebookPen className="h-3.5 w-3.5" aria-hidden />,
};

export default function MyEntriesPage() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as {
    q?: string;
    type?: string;
    status?: string;
  };

  // Derive the active filter values from the URL.
  const activeType = normalizeType(search.type);
  const activeStatus = normalizeStatus(search.status);
  const activeQuery = typeof search.q === "string" ? search.q : "";

  // Local input mirrors the URL `q` so typing feels immediate; we debounce
  // commits back to the URL.
  const [queryInput, setQueryInput] = useState(activeQuery);
  const [pendingDeleteId, setPendingDeleteId] = useState<bigint | null>(null);

  useEffect(() => {
    setQueryInput(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (queryInput === activeQuery) return;
      void navigate({
        to: "/my-entries",
        search: (prev) => ({
          ...prev,
          q: queryInput.trim() ? queryInput.trim() : undefined,
        }),
        replace: true,
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [queryInput, activeQuery, navigate]);

  const filter: EntryFilter = useMemo(
    () => ({
      search: activeQuery.trim() ? activeQuery.trim() : undefined,
      typeFilter: activeType === "all" ? undefined : activeType,
      statusFilter: activeStatus === "all" ? undefined : activeStatus,
    }),
    [activeQuery, activeType, activeStatus],
  );

  const { data, isLoading, isError, error } = useListMyEntries(filter);
  const entries = data ?? [];

  const publishMutation = usePublishEntry();
  const unpublishMutation = useUnpublishEntry();
  const deleteMutation = useDeleteEntry();

  function setFilter(key: "type" | "status", value: string) {
    void navigate({
      to: "/my-entries",
      search: (prev) => ({
        ...prev,
        [key]: value === "all" ? undefined : value,
      }),
      replace: true,
    });
  }

  function clearFilters() {
    setQueryInput("");
    void navigate({
      to: "/my-entries",
      search: {},
      replace: true,
    });
  }

  function togglePublish(entry: Entry) {
    const isPublished = entry.status === PublishedStatus.published;
    const mutation = isPublished ? unpublishMutation : publishMutation;
    mutation.mutate(entry.id, {
      onSuccess: (updated) => {
        toast.success(
          isPublished ? "Returned to drafts" : "Published to the public feed",
          { description: updated.title },
        );
      },
      onError: (err) => {
        toast.error("Could not update entry", {
          description: err instanceof Error ? err.message : undefined,
        });
      },
    });
  }

  function confirmDelete() {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Entry deleted");
        setPendingDeleteId(null);
      },
      onError: (err) => {
        toast.error("Could not delete entry", {
          description: err instanceof Error ? err.message : undefined,
        });
      },
    });
  }

  const hasActiveFilter =
    activeQuery.trim() !== "" || activeType !== "all" || activeStatus !== "all";

  return (
    <div className="mx-auto max-w-5xl" data-ocid="my_entries.page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            My Entries
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Your private library of blogs, notes, and diary entries. Publish any
            draft to share it on the public feed.
          </p>
        </div>
        <Button asChild data-ocid="my_entries.new_button">
          <a href="/editor/new">
            <PencilLine className="h-4 w-4" aria-hidden />
            New entry
          </a>
        </Button>
      </header>

      {/* Filter bar */}
      <section
        className="mb-6 rounded-lg border border-border bg-card p-4 shadow-subtle"
        data-ocid="my_entries.filter_bar"
        aria-label="Filter entries"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search titles and content…"
              className="pl-9"
              aria-label="Search entries"
              data-ocid="my_entries.search_input"
            />
            {queryInput !== "" && (
              <button
                type="button"
                onClick={() => setQueryInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-smooth hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
                data-ocid="my_entries.search_clear_button"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <Select
            value={activeType}
            onValueChange={(v) => setFilter("type", v)}
          >
            <SelectTrigger
              className="w-full sm:w-40"
              aria-label="Filter by type"
              data-ocid="my_entries.type_select"
            >
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-ocid="my_entries.type_option.all">
                All types
              </SelectItem>
              {TYPE_FILTER_VALUES.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  data-ocid={`my_entries.type_option.${t}`}
                >
                  {ENTRY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeStatus}
            onValueChange={(v) => setFilter("status", v)}
          >
            <SelectTrigger
              className="w-full sm:w-40"
              aria-label="Filter by status"
              data-ocid="my_entries.status_select"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-ocid="my_entries.status_option.all">
                All statuses
              </SelectItem>
              {STATUS_FILTER_VALUES.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  data-ocid={`my_entries.status_option.${s}`}
                >
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilter && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              data-ocid="my_entries.clear_filters_button"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </section>

      {/* Body */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Could not load entries."
          }
          onRetry={() => window.location.reload()}
        />
      ) : entries.length === 0 ? (
        <EmptyState hasFilter={hasActiveFilter} onClear={clearFilters} />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-ocid="my_entries.list"
          aria-label="Your entries"
        >
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id.toString()}
              entry={entry}
              index={index}
              onTogglePublish={() => togglePublish(entry)}
              onDelete={() => setPendingDeleteId(entry.id)}
              publishPending={
                publishMutation.isPending &&
                publishMutation.variables === entry.id
              }
              unpublishPending={
                unpublishMutation.isPending &&
                unpublishMutation.variables === entry.id
              }
              deletePending={
                deleteMutation.isPending &&
                deleteMutation.variables === entry.id
              }
            />
          ))}
        </ul>
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent data-ocid="my_entries.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry from your library and the
              public feed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="my_entries.delete_cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="my_entries.delete_confirm_button"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntryCard({
  entry,
  index,
  onTogglePublish,
  onDelete,
  publishPending,
  unpublishPending,
  deletePending,
}: {
  entry: Entry;
  index: number;
  onTogglePublish: () => void;
  onDelete: () => void;
  publishPending: boolean;
  unpublishPending: boolean;
  deletePending: boolean;
}) {
  const isPublished = entry.status === PublishedStatus.published;
  const publishPendingState = isPublished ? unpublishPending : publishPending;
  const toggleLabel = isPublished ? "Unpublish" : "Publish";
  const ToggleIcon = isPublished ? EyeOff : Eye;
  const idStr = entry.id.toString();

  return (
    <li
      className="group rounded-lg border border-border bg-card p-4 shadow-subtle transition-smooth hover:shadow-md"
      data-ocid={`my_entries.item.${index}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-primary/30 bg-primary/5 text-primary"
              data-ocid={`my_entries.type_badge.${index}`}
            >
              {TYPE_ICON[entry.entryType]}
              {ENTRY_TYPE_LABELS[entry.entryType]}
            </Badge>
            <Badge
              variant={isPublished ? "secondary" : "outline"}
              className={
                isPublished
                  ? "bg-accent/15 text-accent-foreground"
                  : "text-muted-foreground"
              }
              data-ocid={`my_entries.status_badge.${index}`}
            >
              {STATUS_LABELS[entry.status]}
            </Badge>
            <time
              dateTime={entryDateIso(entry.updatedAt)}
              className="font-mono text-xs text-muted-foreground"
            >
              Edited {formatEntryDate(entry.updatedAt)}
            </time>
          </div>

          <h3 className="mt-2 font-display text-lg font-medium text-foreground">
            <a
              href={`/editor/${idStr}`}
              className="transition-smooth hover:text-primary"
              data-ocid={`my_entries.title_link.${index}`}
            >
              {entry.title || "Untitled entry"}
            </a>
          </h3>

          {entry.tags.length > 0 && (
            <ul
              className="mt-2 flex flex-wrap gap-1.5"
              aria-label="Tags"
              data-ocid={`my_entries.tags.${index}`}
            >
              {entry.tags.map((tag) => (
                <li key={tag}>
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground"
                  >
                    #{tag}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            data-ocid={`my_entries.edit_button.${index}`}
          >
            <a href={`/editor/${idStr}`}>
              <PencilLine className="h-4 w-4" aria-hidden />
              Edit
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            data-ocid={`my_entries.review_button.${index}`}
          >
            <a href={`/review/${idStr}`}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Review
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePublish}
            disabled={publishPendingState}
            data-ocid={`my_entries.publish_button.${index}`}
            aria-label={toggleLabel}
          >
            <ToggleIcon className="h-4 w-4" aria-hidden />
            {publishPendingState ? "…" : toggleLabel}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deletePending}
            aria-label="Delete entry"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            data-ocid={`my_entries.delete_button.${index}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <ul
      className="flex flex-col gap-3"
      data-ocid="my_entries.loading_state"
      aria-label="Loading entries"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholder
          key={i}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-3 h-6 w-2/3" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  hasFilter,
  onClear,
}: {
  hasFilter: boolean;
  onClear: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-dashed border-border bg-card p-12 text-center"
      data-ocid="my_entries.empty_state"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <NotebookPen className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-xl font-medium text-foreground">
        {hasFilter ? "No entries match your filters" : "Your library is empty"}
      </h2>
      <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted-foreground">
        {hasFilter
          ? "Try a different search term or clear the filters to see everything."
          : "Start a new blog, jot a note, or open a diary entry. Everything you write here is private until you publish."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {hasFilter ? (
          <Button
            variant="outline"
            onClick={onClear}
            data-ocid="my_entries.empty_clear_button"
          >
            <X className="h-4 w-4" aria-hidden />
            Clear filters
          </Button>
        ) : null}
        <Button asChild data-ocid="my_entries.empty_new_button">
          <a href="/editor/new">
            <PencilLine className="h-4 w-4" aria-hidden />
            Write your first entry
          </a>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
      data-ocid="my_entries.error_state"
      role="alert"
    >
      <h2 className="font-display text-xl font-medium text-foreground">
        Could not load your entries
      </h2>
      <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted-foreground">
        {message}
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={onRetry}
        data-ocid="my_entries.error_retry_button"
      >
        Try again
      </Button>
    </div>
  );
}

function normalizeType(raw: string | undefined): TypeFilter {
  if (!raw) return "all";
  return TYPE_FILTER_VALUES.includes(raw as EntryTypeType)
    ? (raw as EntryTypeType)
    : "all";
}

function normalizeStatus(raw: string | undefined): StatusFilter {
  if (!raw) return "all";
  return STATUS_FILTER_VALUES.includes(raw as PublishedStatusType)
    ? (raw as PublishedStatusType)
    : "all";
}
