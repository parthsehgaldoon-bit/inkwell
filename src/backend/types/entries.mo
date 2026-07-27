import Common "common";

module {
  public type EntryId = Common.EntryId;
  public type UserId = Common.UserId;
  public type Timestamp = Common.Timestamp;

  // The three supported entry types.
  public type EntryType = {
    #blog;
    #note;
    #diary;
  };

  // Published status. Drafts are private to the author; published entries
  // appear in the shared public feed.
  public type PublishedStatus = {
    #draft;
    #published;
  };

  // Filter values for listing the signed-in user's own entries.
  public type EntryFilter = {
    search : ?Text;            // search by title/content (case-insensitive substring)
    typeFilter : ?EntryType;  // filter by entry type
    statusFilter : ?PublishedStatus; // filter by published status
  };

  // Sort order for the public feed (by publish date).
  public type SortOrder = {
    #newestFirst;
    #oldestFirst;
  };

  // Public, shared (serializable) view of an entry returned by the API.
  public type Entry = {
    id : EntryId;
    author : UserId;
    title : Text;
    body : Text;            // rich text content (e.g. HTML or markdown)
    entryType : EntryType;
    tags : [Text];
    createdAt : Timestamp;
    updatedAt : Timestamp;
    publishedAt : ?Timestamp; // null while draft
    status : PublishedStatus;
  };

  // Payload for creating a new entry.
  public type NewEntry = {
    title : Text;
    body : Text;
    entryType : EntryType;
    tags : [Text];
  };

  // Payload for editing an existing entry. All fields replace the current values.
  public type EditEntry = {
    title : Text;
    body : Text;
    entryType : EntryType;
    tags : [Text];
  };

  // A single style suggestion produced by the rule-based checker.
  public type StyleRule = {
    #passiveVoice;
    #longSentence;
    #repeatedWords;
    #readability;
  };

  public type StyleSuggestion = {
    rule : StyleRule;
    flaggedText : Text;     // the offending excerpt
    suggestion : Text;       // suggested improvement
    startIndex : Nat;        // offset into the body where the issue begins
    endIndex : Nat;          // offset into the body where the issue ends
  };

  // Result of running the style checker over an entry body.
  public type StyleReview = {
    suggestions : [StyleSuggestion];
    wordCount : Nat;
    readingTimeMinutes : Nat; // estimated reading time
  };
};
