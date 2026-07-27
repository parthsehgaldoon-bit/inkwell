import Array "mo:core/Array";
import Char "mo:core/Char";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/entries";

module {
  public type Entry = Types.Entry;
  public type NewEntry = Types.NewEntry;
  public type EditEntry = Types.EditEntry;
  public type EntryId = Types.EntryId;
  public type UserId = Types.UserId;
  public type EntryFilter = Types.EntryFilter;
  public type StyleReview = Types.StyleReview;
  public type StyleSuggestion = Types.StyleSuggestion;
  public type StyleRule = Types.StyleRule;

  // Create a new entry record from a NewEntry payload. New entries start as
  // drafts (publishedAt = null, status = #draft).
  public func create(
    id : EntryId,
    author : UserId,
    payload : NewEntry,
    now : Types.Timestamp,
  ) : Entry {
    {
      id;
      author;
      title = payload.title;
      body = payload.body;
      entryType = payload.entryType;
      tags = payload.tags;
      createdAt = now;
      updatedAt = now;
      publishedAt = null;
      status = #draft;
    };
  };

  // Apply an EditEntry payload to an existing entry, returning the updated entry.
  // Editing always returns the entry to draft status (auto-save as draft) and
  // clears publishedAt, per the auto-save-draft requirement.
  public func edit(self : Entry, payload : EditEntry, now : Types.Timestamp) : Entry {
    {
      self with
      title = payload.title;
      body = payload.body;
      entryType = payload.entryType;
      tags = payload.tags;
      updatedAt = now;
      publishedAt = null;
      status = #draft;
    };
  };

  // Mark an entry as published, setting publishedAt and status.
  public func publish(self : Entry, now : Types.Timestamp) : Entry {
    { self with publishedAt = ?now; status = #published; updatedAt = now };
  };

  // Return an entry to draft status, clearing publishedAt.
  public func unpublish(self : Entry) : Entry {
    { self with publishedAt = null; status = #draft };
  };

  // Test whether an entry contains the given search term in title or body
  // (case-insensitive substring match).
  public func matchesSearch(self : Entry, q : Text) : Bool {
    if (q.isEmpty()) { return true };
    let term = q.toLower();
    self.title.toLower().contains(#text term) or self.body.toLower().contains(#text term);
  };

  // Test whether an entry has a given tag (case-insensitive).
  public func hasTag(self : Entry, tag : Text) : Bool {
    if (tag.isEmpty()) { return false };
    let t = tag.toLower();
    self.tags.find(func(s : Text) : Bool { s.toLower() == t }) != null;
  };

  // Test whether an entry matches the given filter (title/content search,
  // type, status). Empty/null filter components match everything.
  public func matchesFilter(self : Entry, filter : EntryFilter) : Bool {
    let searchOk = switch (filter.search) {
      case null true;
      case (?q) matchesSearch(self, q);
    };
    let typeOk = switch (filter.typeFilter) {
      case null true;
      case (?t) self.entryType == t;
    };
    let statusOk = switch (filter.statusFilter) {
      case null true;
      case (?s) self.status == s;
    };
    searchOk and typeOk and statusOk;
  };

  // ---- Style checker (rule-based, no external AI) ----
  //
  // The body is treated as plain text for analysis: HTML/markup tags are
  // stripped first so that the rules operate on the visible prose. Each rule
  // produces zero or more StyleSuggestion records with character offsets
  // measured against the *stripped* text.

  // Strip HTML tags from a rich-text body. Anything between < and > is
  // removed; entities are left as-is (rare enough not to skew word counts).
  func stripMarkup(body : Text) : Text {
    let chars = body.toIter();
    let buf = List.empty<Char.Char>();
    let inTag : { var v : Bool } = { var v = false };
    for (c in chars) {
      if (inTag.v) {
        if (c == '>') { inTag.v := false };
      } else {
        if (c == '<') { inTag.v := true } else { buf.add(c) };
      };
    };
    Text.fromArray(buf.toArray());
  };

  // Split text into sentences on . ! ? followed by whitespace or end.
  // Returns an array of (sentenceText, startIndex) tuples where startIndex
  // is the offset of the sentence within the source text.
  func splitSentences(text : Text) : [(Text, Nat)] {
    let result = List.empty<(Text, Nat)>();
    let chars = text.toIter().toArray();
    let n = chars.size();
    var start : Nat = 0;
    var i : Nat = 0;
    var buf = "";
    while (i < n) {
      let c = chars[i];
      buf := buf # c.toText();
      if (c == '.' or c == '!' or c == '?') {
        // Look ahead: include trailing quotes/brackets, then require
        // whitespace or end-of-text to count as a sentence boundary.
        var j = i + 1;
        var lookahead = "";
        while (j < n) {
          let nc = chars[j];
          let ncCode = nc.toNat32();
          let isQuoteOrBracket = ncCode == 34 or ncCode == 41 or ncCode == 93 or ncCode == 39;
          if (isQuoteOrBracket) {
            lookahead := lookahead # nc.toText();
            j += 1;
          } else {
            break;
          };
        };
        let isBoundary = j >= n or chars[j].isWhitespace();
        if (isBoundary) {
          buf := buf # lookahead;
          result.add((buf.trim(#char ' '), start));
          start := j;
          buf := "";
          i := j;
        } else {
          i += 1;
        };
      } else {
        i += 1;
      };
    };
    let trailing = buf.trim(#char ' ');
    if (not trailing.isEmpty()) { result.add((trailing, start)) };
    result.toArray();
  };

  // Tokenize a sentence into words (lowercased, punctuation stripped).
  func words(text : Text) : [Text] {
    let result = List.empty<Text>();
    let chars = text.toIter().toArray();
    let n = chars.size();
    var i : Nat = 0;
    var buf = "";
    while (i < n) {
      let c = chars[i];
      if (c.isAlphabetic() or c == '\'' or c == '-') {
        buf := buf # c.toText();
      } else {
        if (not buf.isEmpty()) {
          result.add(buf.toLower());
          buf := "";
        };
      };
      i += 1;
    };
    if (not buf.isEmpty()) { result.add(buf.toLower()) };
    result.toArray();
  };

  // Count words in stripped text.
  func countWords(text : Text) : Nat {
    words(text).size();
  };

  // Detect passive voice: a form of "to be" followed by a word ending in
  // "ed" or "en". Returns suggestions with offsets relative to the source
  // text (the sentence's start is added).
  func detectPassiveVoice(
    sentence : Text,
    sentenceStart : Nat,
    acc : List.List<StyleSuggestion>,
  ) {
    let ws = words(sentence);
    let beForms : [Text] = [
      "is", "are", "was", "were", "be", "been", "being", "am",
    ];
    var i : Nat = 0;
    while (i + 1 < ws.size()) {
      let w = ws[i];
      let next = ws[i + 1];
      let isBe = beForms.find(func(b : Text) : Bool { b == w }) != null;
      let endsEd = next.endsWith(#text "ed");
      let endsEn = next.endsWith(#text "en") and next != "been" and next != "men" and next != "women" and next != "children";
      if (isBe and (endsEd or endsEn)) {
        acc.add({
          rule = #passiveVoice;
          flaggedText = w # " " # next;
          suggestion = "Consider rewriting in the active voice";
          startIndex = sentenceStart;
          endIndex = sentenceStart + sentence.size();
        });
      };
      i += 1;
    };
  };

  // Detect long sentences (more than 30 words).
  func detectLongSentence(
    sentence : Text,
    sentenceStart : Nat,
    acc : List.List<StyleSuggestion>,
  ) {
    let count = words(sentence).size();
    if (count > 30) {
      acc.add({
        rule = #longSentence;
        flaggedText = sentence;
        suggestion = "This sentence has " # count.toText() # " words — consider splitting it";
        startIndex = sentenceStart;
        endIndex = sentenceStart + sentence.size();
      });
    };
  };

  // Detect repeated words (the same word appearing twice in a row, ignoring
  // case). Returns one suggestion per occurrence.
  func detectRepeatedWords(
    sentence : Text,
    sentenceStart : Nat,
    acc : List.List<StyleSuggestion>,
  ) {
    let ws = words(sentence);
    var i : Nat = 0;
    while (i + 1 < ws.size()) {
      if (ws[i] == ws[i + 1] and ws[i] != "") {
        acc.add({
          rule = #repeatedWords;
          flaggedText = ws[i] # " " # ws[i + 1];
          suggestion = "Repeated word — remove the duplicate";
          startIndex = sentenceStart;
          endIndex = sentenceStart + sentence.size();
        });
      };
      i += 1;
    };
  };

  // Detect readability issues: very long words (more than 12 characters) or
  // sentences with high average word length (> 6 chars) signal dense prose.
  func detectReadability(
    sentence : Text,
    sentenceStart : Nat,
    acc : List.List<StyleSuggestion>,
  ) {
    let ws = words(sentence);
    if (ws.size() == 0) { return };
    var totalLen : Nat = 0;
    for (w in ws.vals()) { totalLen += w.size() };
    let avg = totalLen / ws.size();
    if (avg > 6) {
      acc.add({
        rule = #readability;
        flaggedText = sentence;
        suggestion = "Average word length is high — consider simpler words";
        startIndex = sentenceStart;
        endIndex = sentenceStart + sentence.size();
      });
    };
  };

  // Run the rule-based style checker over a body of text, returning
  // suggestions, word count, and an estimated reading time.
  //
  // Reading time assumes 200 words per minute (a common adult reading rate).
  public func reviewStyle(body : Text) : StyleReview {
    let stripped = stripMarkup(body);
    let wordCount = countWords(stripped);
    // 200 words per minute; round up so a 1-word entry still reads as 1 min.
    let readingTimeMinutes = if (wordCount == 0) { 0 } else {
      let minutes = wordCount / 200;
      if (minutes == 0) { 1 } else { minutes };
    };
    let suggestions = List.empty<StyleSuggestion>();
    for ((sentence, start) in splitSentences(stripped).vals()) {
      let trimmed = sentence.trim(#char ' ');
      if (not trimmed.isEmpty()) {
        detectPassiveVoice(sentence, start, suggestions);
        detectLongSentence(sentence, start, suggestions);
        detectRepeatedWords(sentence, start, suggestions);
        detectReadability(sentence, start, suggestions);
      };
    };
    {
      suggestions = suggestions.toArray();
      wordCount;
      readingTimeMinutes;
    };
  };
};
