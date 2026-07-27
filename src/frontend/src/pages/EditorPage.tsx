import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EntryType,
  PublishedStatus,
  parseEntryId,
  useCreateEntry,
  useDeleteEntry,
  useEditEntry,
  useGetEntry,
} from "@/hooks/useEntries";
import { ENTRY_TYPE_LABELS } from "@/types";
import type { Entry, EntryId, EntryType as EntryTypeType } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Save, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import { toast } from "sonner";

import "react-quill-new/dist/quill.snow.css";

/**
 * Full-page editor for creating and editing Inkwell entries.
 *
 * Two modes:
 *  - `mode === "new"`  → blank draft, creates on first save.
 *  - `mode === "edit"` → loads an existing entry by id, edits in place.
 *
 * The editor is a focused writing surface: generous whitespace, comfortable
 * line height, warm paper background. A sticky meta bar holds the title,
 * type selector, tags, word count, reading time, and actions. The body uses
 * react-quill-new with a curated toolbar (headings, bold, italic, lists,
 * links, blockquotes, code blocks). Auto-save fires on a debounced timer
 * while editing an existing entry; new entries save on explicit Save.
 */

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 2000;
const WORDS_PER_MINUTE = 220;

/** Quill toolbar — headings, inline emphasis, lists, links, quotes, code. */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  clipboard: {
    // Keep paste as plain structured text — no inline styles from external sources.
    matchVisual: false,
  },
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "link",
];

const ENTRY_TYPES: EntryTypeType[] = [
  EntryType.blog,
  EntryType.note,
  EntryType.diary,
];

/** Strip HTML tags to get plain text for word count + reading time. */
function plainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? "";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function readingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

interface EditorPageProps {
  /** "new" creates a blank entry; "edit" loads an existing one by id. */
  mode: "new" | "edit";
  /** Raw route param string for the entry id (edit mode only). */
  idParam?: string;
}

export function EditorPage({ mode, idParam }: EditorPageProps) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const entryId: EntryId | null = isEdit ? parseEntryId(idParam) : null;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entryType, setEntryType] = useState<EntryTypeType>(EntryType.blog);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hasLoaded, setHasLoaded] = useState(!isEdit);

  // Track whether the form has changed since the last save (for autosave + dirty guard).
  const lastSavedRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: existing, isLoading: entryLoading } = useGetEntry(entryId);
  const createEntry = useCreateEntry();
  const editEntry = useEditEntry();
  const deleteEntry = useDeleteEntry();

  // Hydrate form from the fetched entry (edit mode).
  useEffect(() => {
    if (!isEdit || !existing) return;
    setTitle(existing.title);
    setBody(existing.body);
    setEntryType(existing.entryType);
    setTags(existing.tags);
    const snapshot = snapshotOf(
      existing.title,
      existing.body,
      existing.entryType,
      existing.tags,
    );
    lastSavedRef.current = snapshot;
    setHasLoaded(true);
  }, [isEdit, existing]);

  const snapshot = snapshotOf(title, body, entryType, tags);
  const isDirty = hasLoaded && snapshot !== lastSavedRef.current;

  const plain = useMemo(() => plainText(body), [body]);
  const wordCount = useMemo(() => countWords(plain), [plain]);
  const readMinutes = useMemo(() => readingMinutes(wordCount), [wordCount]);

  /** Persist the current form to the backend. Returns the saved Entry. */
  const persist = useCallback(
    async (silent = false): Promise<Entry | null> => {
      if (!title.trim() && !plain.trim()) {
        if (!silent) toast.error("Add a title or some body before saving.");
        return null;
      }
      const payload = {
        title: title.trim() || "Untitled",
        entryType,
        body,
        tags,
      };
      try {
        setSaveState("saving");
        let saved: Entry;
        if (isEdit && entryId !== null) {
          saved = await editEntry.mutateAsync({ id: entryId, payload });
        } else {
          saved = await createEntry.mutateAsync(payload);
        }
        lastSavedRef.current = snapshotOf(
          saved.title,
          saved.body,
          saved.entryType,
          saved.tags,
        );
        setSaveState("saved");
        if (!silent) toast.success("Entry saved as draft.");
        return saved;
      } catch (err) {
        setSaveState("error");
        if (!silent) toast.error("Save failed", { description: String(err) });
        return null;
      }
    },
    [
      title,
      plain,
      entryType,
      body,
      tags,
      isEdit,
      entryId,
      editEntry,
      createEntry,
    ],
  );

  /** Debounced autosave — only in edit mode, only when dirty. */
  useEffect(() => {
    if (!isEdit || !hasLoaded || !isDirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persist(true);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [isEdit, hasLoaded, isDirty, persist]);

  const handleSave = async () => {
    const saved = await persist(false);
    if (saved) {
      // For a brand-new entry, jump to its edit route so subsequent autosaves edit in place.
      if (!isEdit) {
        navigate({ to: "/editor/$id", params: { id: String(saved.id) } });
      }
    }
  };

  const handleReview = async () => {
    const saved = await persist(false);
    if (saved) {
      navigate({ to: "/review/$id", params: { id: String(saved.id) } });
    }
  };

  const handleDelete = async () => {
    if (!isEdit || entryId === null) return;
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success("Entry deleted.");
      navigate({ to: "/my-entries" });
    } catch (err) {
      toast.error("Delete failed", { description: String(err) });
    }
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) {
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };

  const removeTag = (t: string) =>
    setTags((prev) => prev.filter((x) => x !== t));

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  if (isEdit && entryLoading && !hasLoaded) {
    return (
      <div
        className="mx-auto flex max-w-3xl items-center justify-center py-24"
        data-ocid="editor.loading_state"
      >
        <Loader2
          className="h-5 w-5 animate-spin text-muted-foreground"
          aria-hidden
        />
        <span className="ml-2 font-body text-muted-foreground">
          Loading entry…
        </span>
      </div>
    );
  }

  if (isEdit && hasLoaded && existing === null && !entryLoading) {
    return (
      <div
        className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-subtle"
        data-ocid="editor.not_found_state"
      >
        <h2 className="font-display text-2xl text-foreground">
          Entry not found
        </h2>
        <p className="mt-2 font-body text-muted-foreground">
          This entry may have been deleted, or you don't have access to it.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => navigate({ to: "/my-entries" })}
          data-ocid="editor.back_to_entries_button"
        >
          Back to My Entries
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto max-w-3xl" data-ocid="editor.page">
        {/* Sticky meta bar — title, type, tags, actions */}
        <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex flex-wrap items-center gap-3">
            <SaveStateBadge state={saveState} dirty={isDirty} />

            <div className="ml-auto flex items-center gap-2">
              {isEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleteEntry.isPending}
                      aria-label="Delete entry"
                      data-ocid="editor.delete_button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete entry</TooltipContent>
                </Tooltip>
              )}

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={createEntry.isPending || editEntry.isPending}
                data-ocid="editor.save_button"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save draft
              </Button>

              <Button
                onClick={handleReview}
                disabled={createEntry.isPending || editEntry.isPending}
                data-ocid="editor.review_button"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Save &amp; review
              </Button>
            </div>
          </div>
        </div>

        {/* Title — large display serif, comfortable */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Entry title"
          data-ocid="editor.title_input"
          className="w-full bg-transparent font-display text-4xl font-semibold leading-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />

        {/* Type selector + tags row */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <fieldset
            className="flex items-center gap-1.5"
            aria-label="Entry type"
          >
            {ENTRY_TYPES.map((t) => {
              const active = entryType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  aria-pressed={active}
                  data-ocid={`editor.type.${t}`}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {ENTRY_TYPE_LABELS[t]}
                </button>
              );
            })}
          </fieldset>

          <div className="h-5 w-px bg-border" aria-hidden />

          <TagsInput
            tags={tags}
            draft={tagDraft}
            onChange={setTagDraft}
            onKeyDown={onTagKeyDown}
            onAdd={addTag}
            onRemove={removeTag}
          />
        </div>

        {/* Word count + reading time */}
        <div
          className="mt-4 flex items-center gap-4 font-body text-sm text-muted-foreground"
          data-ocid="editor.stats"
        >
          <span>
            <span className="font-medium text-foreground">{wordCount}</span>{" "}
            words
          </span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span>
            {readMinutes === 0 ? "Under a minute" : `${readMinutes} min read`}
          </span>
        </div>

        {/* Rich text editor — the writing surface */}
        <div
          className="mt-6 rounded-lg border border-border bg-card shadow-subtle"
          data-ocid="editor.body"
        >
          <ReactQuill
            theme="snow"
            value={body}
            onChange={setBody}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            placeholder="Begin where the silence ends…"
          />
        </div>

        {/* Warm literary styling for the Quill surface */}
        <EditorStyles />
      </div>
    </TooltipProvider>
  );
}

/** Snapshot of the editable fields — used to detect dirty state. */
function snapshotOf(
  title: string,
  body: string,
  entryType: EntryTypeType,
  tags: string[],
): string {
  return JSON.stringify({ title, body, entryType, tags: [...tags].sort() });
}

function SaveStateBadge({
  state,
  dirty,
}: { state: SaveState; dirty: boolean }) {
  if (state === "saving") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        data-ocid="editor.saving_state"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-destructive"
        data-ocid="editor.error_state"
      >
        Save failed
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        data-ocid="editor.unsaved_state"
      >
        Unsaved changes
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      data-ocid="editor.saved_state"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-accent" aria-hidden />
      Saved
    </span>
  );
}

interface TagsInputProps {
  tags: string[];
  draft: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
}

function TagsInput({
  tags,
  draft,
  onChange,
  onKeyDown,
  onAdd,
  onRemove,
}: TagsInputProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
          data-ocid={`editor.tag.${t}`}
        >
          {t}
          <button
            type="button"
            onClick={() => onRemove(t)}
            aria-label={`Remove tag ${t}`}
            className="rounded-full p-0.5 transition-smooth hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid={`editor.tag_remove.${t}`}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <Input
        type="text"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onAdd}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        aria-label="Add tag"
        data-ocid="editor.tag_input"
        className="h-8 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

/**
 * Scoped CSS overrides for the Quill snow theme so it inherits the warm
 * literary tokens — paper background, ink text, terracotta accents, and a
 * comfortable line height for the writing surface.
 */
function EditorStyles() {
  return (
    <style>{`
      .ql-toolbar.ql-snow {
        border: none !important;
        border-bottom: 1px solid var(--color-border) !important;
        background: transparent;
        padding: 0.5rem 0.75rem;
      }
      .ql-container.ql-snow {
        border: none !important;
        background: transparent;
        font-family: var(--font-body);
        font-size: 1.0625rem;
        min-height: 24rem;
      }
      .ql-editor {
        min-height: 24rem;
        padding: 1.5rem 1rem;
        line-height: 1.75;
        color: var(--color-foreground);
      }
      .ql-editor.ql-blank::before {
        color: var(--color-muted-foreground);
        font-style: italic;
        opacity: 0.7;
      }
      .ql-editor h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.875rem; line-height: 1.25; margin: 1.25rem 0 0.75rem; }
      .ql-editor h2 { font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; line-height: 1.3; margin: 1.1rem 0 0.6rem; }
      .ql-editor h3 { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; line-height: 1.35; margin: 1rem 0 0.5rem; }
      .ql-editor p { margin: 0.5rem 0; }
      .ql-editor blockquote {
        border-left: 3px solid var(--color-primary);
        padding-left: 1rem;
        margin: 1rem 0;
        color: var(--color-muted-foreground);
        font-style: italic;
      }
      .ql-editor pre {
        background: var(--color-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 0.75rem 1rem;
        font-family: var(--font-mono);
        font-size: 0.9375rem;
        overflow-x: auto;
      }
      .ql-editor a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
      .ql-editor ul, .ql-editor ol { padding-left: 1.5rem; margin: 0.5rem 0; }
      .ql-snow .ql-stroke { stroke: var(--color-muted-foreground); }
      .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill { fill: var(--color-muted-foreground); }
      .ql-snow .ql-picker-label { color: var(--color-foreground); }
      .ql-snow.ql-toolbar button:hover .ql-stroke,
      .ql-snow.ql-toolbar button.ql-active .ql-stroke {
        stroke: var(--color-primary);
      }
      .ql-snow.ql-toolbar button:hover .ql-fill,
      .ql-snow.ql-toolbar button.ql-active .ql-fill {
        fill: var(--color-primary);
      }
      .ql-snow .ql-tooltip {
        background: var(--color-popover);
        border: 1px solid var(--color-border);
        color: var(--color-popover-foreground);
        border-radius: var(--radius);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        z-index: 30;
      }
      .ql-snow .ql-tooltip input[type=text] {
        border: 1px solid var(--color-input);
        border-radius: var(--radius);
        padding: 0.25rem 0.5rem;
        color: var(--color-foreground);
        background: var(--color-background);
      }
    `}</style>
  );
}
