import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { applyReview, studyId } from "../src/utils/study.js";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../functions/index.js", import.meta.url),
);
const admin = require("firebase-admin");
const { createSocialHandlers } = require("../functions/lib/social.js");
let environment, db, social, studyStore;
const projectId = "demo-aleman";
before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Run through npm run test:rules, never against production",
  );
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  admin.initializeApp({ projectId });
  db = admin.firestore();
  social = createSocialHandlers(db, () =>
    admin.firestore.FieldValue.serverTimestamp(),
  );
  await mkdir(new URL("../.test-runtime/", import.meta.url), {
    recursive: true,
  });
  await build({
    entryPoints: ["src/services/studyStore.js"],
    outfile: ".test-runtime/study.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    external: ["firebase/firestore", "ts-fsrs"],
    plugins: [
      {
        name: "emulator-db",
        setup(plugin) {
          plugin.onResolve({ filter: /\/firebase\.js$/ }, () => ({
            path: "emulator",
            namespace: "test",
          }));
          plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents:
              "export const db = globalThis.emulatorDb; export const auth = globalThis.emulatorAuth;",
          }));
        },
      },
    ],
  });
  globalThis.emulatorDb = client("alice");
  globalThis.emulatorAuth = { currentUser: { uid: "alice" } };
  const local = new Map();
  globalThis.localStorage = {
    get length() {
      return local.size;
    },
    key: (i) => [...local.keys()][i],
    getItem: (key) => local.get(key) ?? null,
    setItem: (key, value) => local.set(key, value),
    removeItem: (key) => local.delete(key),
    clear: () => local.clear(),
  };
  studyStore = await import("../.test-runtime/study.mjs");
});
beforeEach(async () => {
  await environment.clearFirestore();
  globalThis.emulatorAuth.currentUser = { uid: "alice" };
  globalThis.localStorage.clear();
  studyStore.clearStudyMemory("alice");
  for (const uid of ["alice", "bob", "mallory"]) {
    await db.doc(`users/${uid}`).set({
      uid,
      displayName: uid,
      displayName_lowercase: uid,
      email: `${uid}@private.test`,
      tier: "free",
      shareVocabulary: false,
    });
    await db
      .doc(`publicProfiles/${uid}`)
      .set({ uid, displayName: uid, displayName_lowercase: uid });
    await db
      .doc(`users/${uid}/words/w`)
      .set({ german: "Haus", spanish: "casa", type: "noun" });
  }
});
after(async () => {
  await environment.cleanup();
  await admin.app().delete();
  await rm(new URL("../.test-runtime/", import.meta.url), {
    recursive: true,
    force: true,
  });
});
const client = (uid) => environment.authenticatedContext(uid).firestore();
const request = (uid, data) => ({
  auth: { uid, token: { email: `${uid}@private.test` } },
  data,
});

test("entitlements and private identities cannot be created or modified by clients", async () => {
  const alice = client("alice");
  await assertSucceeds(getDoc(doc(alice, "users/alice")));
  await assertFails(updateDoc(doc(alice, "users/alice"), { tier: "premium" }));
  await assertFails(
    updateDoc(doc(alice, "users/alice"), { email: "stolen@example.test" }),
  );
  await assertFails(
    setDoc(doc(client("new"), "users/new"), { tier: "premium" }),
  );
  await assertFails(setDoc(doc(client("new"), "users/new"), { tier: "free" }));
  await assertFails(getDoc(doc(alice, "users/bob")));
  await assertFails(getDocs(query(collection(alice, "users"), limit(20))));
  await assertSucceeds(
    getDocs(query(collection(alice, "publicProfiles"), limit(20))),
  );
  await assertFails(getDocs(collection(alice, "publicProfiles")));
  await assertFails(
    updateDoc(doc(alice, "publicProfiles/alice"), {
      email: "leak@example.test",
    }),
  );
  await assertSucceeds(
    updateDoc(doc(alice, "users/alice"), { shareVocabulary: true }),
  );
});

test("sharing requires opt-in and reciprocal accepted friendship, and can be revoked", async () => {
  const alice = client("alice"),
    words = collection(alice, "users/bob/words");
  await assertFails(getDocs(words));
  await db.doc("users/bob").update({ shareVocabulary: true });
  await assertFails(getDocs(words));
  await db.doc("users/bob/friends/alice").set({});
  await assertFails(getDocs(words));
  await db.doc("users/alice/friends/bob").set({});
  await assertSucceeds(getDocs(words));
  await assertFails(
    updateDoc(doc(alice, "users/bob/words/w"), { spanish: "hacked" }),
  );
  await assertFails(getDocs(collection(client("mallory"), "users/bob/words")));
  await assertSucceeds(
    updateDoc(doc(client("bob"), "users/bob"), { shareVocabulary: false }),
  );
  await assertFails(getDocs(words));
  await db.doc("users/bob").update({ shareVocabulary: true });
  await social.removeFriend(request("alice", { friendUid: "bob" }));
  await assertFails(getDocs(words));
});

test("friend requests use server identities and client mutation/forgery is denied", async () => {
  const { requestId } = await social.sendFriendRequest(
    request("alice", {
      toUid: "bob",
      from_uid: "mallory",
      from_displayName: "Spoof",
    }),
  );
  const ref = doc(client("bob"), `friendRequests/${requestId}`);
  assert.equal((await getDoc(ref)).data().from_uid, "alice");
  await assertFails(updateDoc(ref, { from_uid: "mallory" }));
  await assertFails(updateDoc(ref, { status: "accepted" }));
  await assertFails(deleteDoc(ref));
  await assertFails(
    setDoc(doc(client("mallory"), "friendRequests/forged"), {
      from_uid: "mallory",
      to_uid: "bob",
      status: "pending",
    }),
  );
  await assert.rejects(
    social.handleFriendRequest(
      request("mallory", { requestId, action: "accept" }),
    ),
    /No puedes/,
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(client("bob"), "friendRequests"),
        where("to_uid", "==", "bob"),
        where("status", "==", "pending"),
      ),
    ),
  );
  await assertFails(getDocs(collection(client("mallory"), "friendRequests")));
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      social.handleFriendRequest(
        request("bob", { requestId, action: "accept" }),
      ),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    (await db.doc("users/bob/friends/alice").get()).data().displayName,
    "alice",
  );
  assert.equal((await db.doc("users/alice/friends/bob").get()).exists, true);
  assert.equal((await db.doc("users/bob/friends/mallory").get()).exists, false);
});

test("profile registration reserves case-insensitive names transactionally and never changes tier", async () => {
  const results = await Promise.allSettled(
    ["new1", "new2"].map((uid) =>
      social.savePublicProfile(
        request(uid, { displayName: "New Name", tier: "premium" }),
      ),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const uid = results[0].status === "fulfilled" ? "new1" : "new2";
  const profile = (await db.doc(`publicProfiles/${uid}`).get()).data();
  assert.deepEqual(Object.keys(profile).sort(), [
    "displayName",
    "displayName_lowercase",
    "uid",
  ]);
  assert.equal((await db.doc(`users/${uid}`).get()).data().tier, "free");
  await assert.rejects(
    social.savePublicProfile(request("new3", { displayName: "NEW NAME" })),
    /ya está/,
  );
  await db.doc(`users/${uid}`).update({ tier: "premium" });
  await social.savePublicProfile(
    request(uid, { displayName: "Rewrite", tier: "free" }),
  );
  assert.equal((await db.doc(`users/${uid}`).get()).data().tier, "premium");
});

test("reviews are owner-only and events immutable; billing collections remain private", async () => {
  const alice = client("alice");
  await assertSucceeds(
    setDoc(doc(alice, "users/alice/reviewEvents/e1"), {
      id: "e1",
      rating: 3,
      direction: "es-de",
    }),
  );
  await assertFails(
    updateDoc(doc(alice, "users/alice/reviewEvents/e1"), { rating: 4 }),
  );
  await assertFails(deleteDoc(doc(alice, "users/alice/reviewEvents/e1")));
  await assertFails(
    setDoc(doc(alice, "users/bob/studyProgress/w"), { correct: 500 }),
  );
  await assertFails(getDoc(doc(client("bob"), "users/alice/reviewEvents/e1")));
  await assertFails(setDoc(doc(alice, "rateLimits/budget"), { count: 0 }));
  await assertFails(getDoc(doc(alice, "rateLimits/budget")));
  await assertFails(
    getDoc(
      doc(
        environment.unauthenticatedContext().firestore(),
        "users/alice/words/w",
      ),
    ),
  );
});

test("review transaction deduplicates concurrent retries and separates derived/direction schedules", async () => {
  const base = { id: "base_with_underscores", german: "stehen" };
  const derived = {
    ...base,
    id: "base_with_underscores_auf",
    baseWordId: base.id,
    isDerived: true,
    prefix: "auf",
  };
  const at = Date.parse("2026-09-14T10:00:00Z");
  const event = {
    id: "review-1",
    cardId: studyId(base, "de-es", "alice"),
    wordId: base.id,
    sourceUid: "alice",
    direction: "de-es",
    german: "stehen",
    spanish: "estar de pie",
    rating: 3,
    at,
    day: "2026-09-14",
    timeZone: "Europe/Zurich",
  };
  await Promise.all([
    studyStore.commitReview("alice", event),
    studyStore.commitReview("alice", event),
  ]);
  assert.equal(
    (await db.doc(`users/alice/studyProgress/${event.cardId}`).get()).data()
      .correct,
    1,
  );
  assert.equal(
    (await db.doc("users/alice/studyDays/2026-09-14").get()).data().reviews,
    1,
  );
  await studyStore.commitReview("alice", {
    ...event,
    id: "review-2",
    cardId: studyId(derived, "es-de", "alice"),
    direction: "es-de",
    german: "aufstehen",
    rating: 1,
  });
  assert.equal(
    (await db.collection("users/alice/studyProgress").get()).size,
    2,
  );
  assert.equal(
    (await db.doc("users/alice/studyDays/2026-09-14").get()).data().newCards,
    2,
  );
  const again = await studyStore.commitReview("alice", {
    ...event,
    id: "review-3",
    at: at - 10000,
  });
  assert.ok(again.progress.lastReviewed > at);
  assert.equal(again.progress.correct, 2);
});

test("offline outbox persists before advancing, retries exactly once and refuses another account", async () => {
  const clientDb = globalThis.emulatorDb;
  await studyStore.loadStudy("alice", true);
  await disableNetwork(clientDb);
  Object.defineProperty(globalThis.navigator, "onLine", {
    value: false,
    configurable: true,
  });
  const input = {
    cardId: studyId({ id: "w" }, "de-es", "alice"),
    wordId: "w",
    sourceUid: "alice",
    direction: "de-es",
    german: "Haus",
    spanish: "casa",
    rating: 1,
    errorType: "article",
    answer: "der Haus",
    isNew: true,
  };
  studyStore.recordReview("alice", input);
  await studyStore.flushReviews("alice");
  assert.equal(studyStore.pendingReviews("alice").length, 1);
  assert.equal(
    studyStore.getStudyStore("alice").state.progress[input.cardId].incorrect,
    1,
  );
  const queued = studyStore.pendingReviews("alice")[0];
  globalThis.emulatorAuth.currentUser = { uid: "bob" };
  await assert.rejects(studyStore.commitReview("alice", queued), /sesión/);
  globalThis.emulatorAuth.currentUser = { uid: "alice" };
  Object.defineProperty(globalThis.navigator, "onLine", {
    value: true,
    configurable: true,
  });
  await enableNetwork(clientDb);
  await studyStore.flushReviews("alice");
  assert.equal(studyStore.pendingReviews("alice").length, 0);
  // Simulate a crash after the server committed but before local removal.
  localStorage.setItem(
    `aleman:review:alice:${queued.id}`,
    JSON.stringify(queued),
  );
  await studyStore.flushReviews("alice");
  assert.equal((await db.collection("users/alice/reviewEvents").get()).size, 1);
  assert.equal(
    (await db.doc(`users/alice/studyProgress/${input.cardId}`).get()).data()
      .incorrect,
    1,
  );
  const set = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("quota");
  };
  assert.throws(() => studyStore.recordReview("alice", input), /quota/);
  localStorage.setItem = set;
  assert.equal(
    studyStore.getStudyStore("alice").state.progress[input.cardId].incorrect,
    1,
  );
  delete globalThis.navigator.onLine;
});

test("untrusted legacy requests cannot create new friendships", async () => {
  await db
    .doc("friendRequests/old-client-request")
    .set({
      from_uid: "mallory",
      to_uid: "bob",
      from_displayName: "alice",
      status: "pending",
    });
  await assert.rejects(
    social.handleFriendRequest(
      request("bob", { requestId: "old-client-request", action: "accept" }),
    ),
    /versión antigua/,
  );
  assert.equal((await db.doc("users/bob/friends/mallory").get()).exists, false);
  await social.handleFriendRequest(
    request("bob", { requestId: "old-client-request", action: "decline" }),
  );
});
