import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface NewEntry {
    title: string;
    entryType: EntryType;
    body: string;
    tags: Array<string>;
}
export type Timestamp = bigint;
export interface EditEntry {
    title: string;
    entryType: EntryType;
    body: string;
    tags: Array<string>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface StyleSuggestion {
    rule: StyleRule;
    flaggedText: string;
    suggestion: string;
    endIndex: bigint;
    startIndex: bigint;
}
export type UserId = Principal;
export interface Entry {
    id: EntryId;
    status: PublishedStatus;
    title: string;
    entryType: EntryType;
    body: string;
    createdAt: Timestamp;
    tags: Array<string>;
    publishedAt?: Timestamp;
    author: UserId;
    updatedAt: Timestamp;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type EntryId = bigint;
export interface StyleReview {
    suggestions: Array<StyleSuggestion>;
    wordCount: bigint;
    readingTimeMinutes: bigint;
}
export interface EntryFilter {
    search?: string;
    statusFilter?: PublishedStatus;
    typeFilter?: EntryType;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum EntryType {
    blog = "blog",
    note = "note",
    diary = "diary"
}
export enum PublishedStatus {
    published = "published",
    draft = "draft"
}
export enum SortOrder {
    newestFirst = "newestFirst",
    oldestFirst = "oldestFirst"
}
export enum StyleRule {
    longSentence = "longSentence",
    readability = "readability",
    passiveVoice = "passiveVoice",
    repeatedWords = "repeatedWords"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createEntry(payload: NewEntry): Promise<Entry>;
    deleteEntry(id: EntryId): Promise<void>;
    editEntry(id: EntryId, payload: EditEntry): Promise<Entry>;
    execute(qJson: string): Promise<Result>;
    getCallerUserRole(): Promise<UserRole>;
    getEntry(id: EntryId): Promise<Entry | null>;
    getPublicEntry(id: EntryId): Promise<Entry | null>;
    isCallerAdmin(): Promise<boolean>;
    listMyEntries(filter: EntryFilter): Promise<Array<Entry>>;
    listPublicFeed(search: string | null, tag: string | null, order: SortOrder): Promise<Array<Entry>>;
    publishEntry(id: EntryId): Promise<Entry>;
    reviewEntryStyle(body: string): Promise<StyleReview>;
    schema(): Promise<string>;
    unpublishEntry(id: EntryId): Promise<Entry>;
}
