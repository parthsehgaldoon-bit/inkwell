import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";

module {
  // First migration: introduces the entries domain stable state. OldActor is
  // empty because this is a fresh install (no prior actor shape). NewActor
  // enumerates every stable field declared in main.mo and supplies the
  // initial value for each.
  //
  // Note: accessControlState is declared `transient` in main.mo (with an
  // inline initializer), so it is NOT stable and must NOT appear here.
  type OldActor = {};
  type NewActor = {
    entries : Map.Map<Nat, EntryRecord>;
    entriesByAuthor : Map.Map<Principal, Set.Set<Nat>>;
    publishedFeed : List.List<Nat>;
    nextEntryId : { var next : Nat };
  };

  // Inlined entry record (must match Types.Entry in types/entries.mo, but
  // inlined here per migration self-containment rules — only mo:core imports
  // are allowed).
  type EntryType = { #blog; #note; #diary };
  type PublishedStatus = { #draft; #published };
  type EntryRecord = {
    id : Nat;
    author : Principal;
    title : Text;
    body : Text;
    entryType : EntryType;
    tags : [Text];
    createdAt : Int;
    updatedAt : Int;
    publishedAt : ?Int;
    status : PublishedStatus;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      entries = Map.empty();
      entriesByAuthor = Map.empty();
      publishedFeed = List.empty();
      nextEntryId = { var next = 1 };
    };
  };
};
