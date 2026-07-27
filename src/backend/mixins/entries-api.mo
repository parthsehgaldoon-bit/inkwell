import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/entries";
import Common "../types/common";
import EntriesLib "../lib/entries";

mixin (
  entries : Map.Map<Common.EntryId, Types.Entry>,
  entriesByAuthor : Map.Map<Common.UserId, Set.Set<Common.EntryId>>,
  publishedFeed : List.List<Common.EntryId>, // ordered by publish date, newest first
  nextEntryId : { var next : Common.EntryId },
) {
  // Ensure the caller is the author of the entry with the given id.
  // Traps if the entry does not exist or the caller is not the author.
  func requireOwnedBy(caller : Common.UserId, id : Common.EntryId) : Types.Entry {
    switch (entries.get(id)) {
      case null Runtime.trap("Entry not found");
      case (?e) {
        if (not Principal.equal(e.author, caller)) {
          Runtime.trap("Not the entry author");
        };
        e;
      };
    };
  };

  // Remove an entry id from the published feed list. O(n) but feeds are
  // small in the MVP.
  func removeFromFeed(id : Common.EntryId) {
    let kept = publishedFeed.filter(func(x : Common.EntryId) : Bool { x != id });
    publishedFeed.clear();
    publishedFeed.addAll(kept.values());
  };

  // Create a new draft entry owned by the caller. Returns the created entry.
  public shared ({ caller }) func createEntry(payload : Types.NewEntry) : async Types.Entry {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    let id = nextEntryId.next;
    nextEntryId.next += 1;
    let entry = EntriesLib.create(id, caller, payload, Time.now());
    entries.add(id, entry);
    // Index by author.
    switch (entriesByAuthor.get(caller)) {
      case null {
        let s = Set.empty<Common.EntryId>();
        s.add(id);
        entriesByAuthor.add(caller, s);
      };
      case (?s) s.add(id);
    };
    entry;
  };

  // Edit an existing entry owned by the caller. Auto-saves as a draft.
  public shared ({ caller }) func editEntry(id : Common.EntryId, payload : Types.EditEntry) : async Types.Entry {
    let existing = requireOwnedBy(caller, id);
    // If the entry was published, remove it from the public feed because
    // editing returns it to draft status.
    if (existing.status == #published) {
      removeFromFeed(id);
    };
    let updated = existing.edit(payload, Time.now());
    entries.add(id, updated);
    updated;
  };

  // Delete an entry owned by the caller.
  public shared ({ caller }) func deleteEntry(id : Common.EntryId) : async () {
    let existing = requireOwnedBy(caller, id);
    entries.remove(id);
    // Remove from author index.
    switch (entriesByAuthor.get(caller)) {
      case null ();
      case (?s) {
        s.remove(id);
        if (s.size() == 0) { entriesByAuthor.remove(caller) };
      };
    };
    // Remove from public feed if it was published.
    if (existing.status == #published) {
      removeFromFeed(id);
    };
  };

  // Get a single entry by id. Returns the entry only if the caller is the
  // author or the entry is published.
  public shared ({ caller }) func getEntry(id : Common.EntryId) : async ?Types.Entry {
    switch (entries.get(id)) {
      case null null;
      case (?e) {
        if (Principal.equal(e.author, caller) or e.status == #published) {
          ?e;
        } else {
          null;
        };
      };
    };
  };

  // List the signed-in user's own entries with optional search and filters.
  public shared ({ caller }) func listMyEntries(filter : Types.EntryFilter) : async [Types.Entry] {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
    let result = List.empty<Types.Entry>();
    switch (entriesByAuthor.get(caller)) {
      case null [];
      case (?s) {
        for (id in s.values()) {
          switch (entries.get(id)) {
            case null ();
            case (?e) {
              if (e.matchesFilter(filter)) {
                result.add(e);
              };
            };
          };
        };
        // Sort newest-first by updatedAt.
        let arr = result.toArray();
        arr.sort(func(a : Types.Entry, b : Types.Entry) : Order.Order {
          Int.compare(b.updatedAt, a.updatedAt);
        });
      };
    };
  };

  // Publish a draft entry, making it visible in the public feed.
  public shared ({ caller }) func publishEntry(id : Common.EntryId) : async Types.Entry {
    let existing = requireOwnedBy(caller, id);
    if (existing.status == #published) {
      // Already published; no-op (return as-is).
      return existing;
    };
    let now = Time.now();
    let updated = existing.publish(now);
    entries.add(id, updated);
    // Add to the public feed. We append; listPublicFeed treats the tail as
    // newest (see listPublicFeed).
    publishedFeed.add(id);
    updated;
  };

  // Unpublish an entry, returning it to draft status.
  public shared ({ caller }) func unpublishEntry(id : Common.EntryId) : async Types.Entry {
    let existing = requireOwnedBy(caller, id);
    if (existing.status == #draft) {
      return existing;
    };
    let updated = existing.unpublish();
    entries.add(id, updated);
    removeFromFeed(id);
    updated;
  };

  // Run the rule-based style checker over a body of text. Read-only; does not
  // require an existing entry. Anonymous callers may use it too so the review
  // panel works while drafting before sign-in.
  public shared ({ caller }) func reviewEntryStyle(body : Text) : async Types.StyleReview {
    ignore caller;
    EntriesLib.reviewStyle(body);
  };

  // List published entries from all authors, ordered by publish date, with
  // optional search by title/content and filter by tag. Readable without login.
  public query func listPublicFeed(search : ?Text, tag : ?Text, order : Types.SortOrder) : async [Types.Entry] {
    let result = List.empty<Types.Entry>();
    // publishedFeed is maintained in insertion order; since we only ever
    // append on publish and never reorder, the most recently published entry
    // is at the tail. For newest-first we iterate in reverse; for
    // oldest-first we iterate forward.
    let iter = switch (order) {
      case (#newestFirst) publishedFeed.reverseValues();
      case (#oldestFirst) publishedFeed.values();
    };
    for (id in iter) {
      switch (entries.get(id)) {
        case null ();
        case (?e) {
          if (e.status == #published) {
            let searchOk = switch (search) {
              case null true;
              case (?q) e.matchesSearch(q);
            };
            let tagOk = switch (tag) {
              case null true;
              case (?t) e.hasTag(t);
            };
            if (searchOk and tagOk) {
              result.add(e);
            };
          };
        };
      };
    };
    result.toArray();
  };

  // Get a single published entry by id for the public detail view. Readable
  // without login. Returns null if the entry is not published.
  public query func getPublicEntry(id : Common.EntryId) : async ?Types.Entry {
    switch (entries.get(id)) {
      case null null;
      case (?e) {
        if (e.status == #published) { ?e } else { null };
      };
    };
  };
};
