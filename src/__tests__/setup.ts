import * as FakeIndexedDb from 'fake-indexeddb';

// @ts-expect-error jsdom doesn't have indexedDB
globalThis.indexedDB = (FakeIndexedDb as any).indexedDB;
// @ts-expect-error
globalThis.IDBKeyRange = (FakeIndexedDb as any).IDBKeyRange;
// @ts-expect-error
globalThis.IDBRequest = (FakeIndexedDb as any).IDBRequest;
// @ts-expect-error
globalThis.IDBDatabase = (FakeIndexedDb as any).IDBDatabase;
// @ts-expect-error
globalThis.IDBObjectStore = (FakeIndexedDb as any).IDBObjectStore;