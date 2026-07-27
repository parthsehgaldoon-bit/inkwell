import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";

import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import TextValue "mo:caffeineai-oql/TextValue";

import Common "types/common";
import Types "types/entries";
import EntriesApi "mixins/entries-api";

actor {
  // Authorization scaffolding (pre-existing). Made transient so it can use
  // the component's initState() initializer directly — auth state is rebuilt
  // on every restart (the first user to log in becomes admin), so it does
  // not need to persist across upgrades.
  transient let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState, null);

  // Entries domain stable state. Initial values come from the migration chain.
  let entries : Map.Map<Common.EntryId, Types.Entry>;
  let entriesByAuthor : Map.Map<Common.UserId, Set.Set<Common.EntryId>>;
  let publishedFeed : List.List<Common.EntryId>; // ordered by publish date, newest first
  let nextEntryId : { var next : Common.EntryId };

  // Entries domain API.
  include EntriesApi(entries, entriesByAuthor, publishedFeed, nextEntryId);

  // OQL — Data Intelligence. Expose the entries collection so it can be queried
  // in natural language. Published entries are world-readable; the entity is
  // declared controller-only here so the Data Intelligence agent can answer
  // aggregate questions over all entries while end-user reads go through the
  // dedicated public/private API methods above.
  //
  // Manual mode is required because Entry has a variant (`entryType`, `status`),
  // an option (`publishedAt`), and a collection (`tags`) field — auto-derive
  // `.toEntity` only supports all-primitive records.
  include Expose({
    entities = [
      OQL.Entity.manual<Types.Entry>(
        "entry",
        func() = entries.entries().map(func((_, e)) = e),
        "Entry",
        "id",
      )
        .payload("id", func(e) = e.id)
        .payload("author", func(e) = e.author)
        .payload("title", func(e) = e.title)
        .payload("body", func(e) = e.body)
        .payload("entryType", func(e : Types.Entry) : Text {
          switch (e.entryType) {
            case (#blog) "blog";
            case (#note) "note";
            case (#diary) "diary";
          };
        })
        .payload("tags", func(e) = e.tags.vals().join(", "))
        .payload("createdAt", func(e) = e.createdAt)
        .payload("updatedAt", func(e) = e.updatedAt)
        .payload("publishedAt", func(e) = switch (e.publishedAt) { case null 0; case (?t) t })
        .payload("status", func(e) = switch (e.status) { case (#draft) "draft"; case (#published) "published" })
        .controllerOnly()
        .build(),
    ];
  });
};
