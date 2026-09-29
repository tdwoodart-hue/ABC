# Scheduled Private Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver encrypted scheduled messages that unlock at the selected time, notify the partner without exposing contents, and are available from Đôi lời muốn nói.

**Architecture:** The browser encrypts each message with Web Crypto. Firestore stores ciphertext and safe metadata only; Vercel functions, authenticated with Firebase ID tokens, hold and release the per-message key material after `unlockAt`. A cron function triggers content-free partner notifications for due messages.

**Tech Stack:** React 19, TypeScript, Firebase Auth/Firestore/Admin, Vercel Functions and Cron, Web Crypto API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-29-scheduled-private-messages-design.md`

## Global Constraints

- Never write plaintext message content or its AES key to Firestore.
- Push payloads must not contain message content.
- API requests authenticate with a Firebase ID token and must verify the couple membership and recipient.
- A missing production secret must prevent sending rather than fall back to unsafe storage.
- Preserve the existing allowed-account model and update Firestore rules for the new collection.

## Review Focus

- A message scheduled in the past must be rejected before any write.
- A recipient attempting to open before `unlockAt` must receive no key material.
- A third allowed account must not read a message not addressed to it.
- Invalid ciphertext, IV, or returned key must fail closed without rendering partial content.
- A scheduled push must contain only generic title/body plus the message route, never plaintext.

---

### Task 1: Encrypted message model and browser cryptography

**Files:**
- Create: `src/utils/scheduledMessages.ts`
- Test: `tests/scheduled-messages.test.mjs`

**Interfaces:**
- Produces `ScheduledMessageDraft`, `EncryptedScheduledMessage`, `encryptScheduledMessage`, `decryptScheduledMessage`, and `validateUnlockAt` for the composer and API client.

- [ ] **Step 1: Write the failing crypto tests**

Test encrypt/decrypt round-trip, tampered IV/key rejection, and an unlock time that is not in the future.

- [ ] **Step 2: Run the crypto test to verify it fails**

Run: `node --test tests/scheduled-messages.test.mjs`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the Web Crypto boundary in `src/utils/scheduledMessages.ts`**

Use AES-GCM with a fresh 256-bit key and 96-bit IV. Encode opaque binary values as base64; export functions with typed message metadata and no Firestore dependency.

- [ ] **Step 4: Run the crypto test to verify it passes**

Run: `node --test tests/scheduled-messages.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/scheduledMessages.ts tests/scheduled-messages.test.mjs
git commit -m "feat(messages): add encrypted message primitives"
```

### Task 2: Key-release and due-message API

**Files:**
- Create: `api/scheduled-messages/create.ts`
- Create: `api/scheduled-messages/key.ts`
- Create: `api/scheduled-messages/notify-due.ts`
- Create: `api/scheduled-messages/admin.ts`
- Modify: `vercel.json`
- Test: `tests/scheduled-message-api.test.mjs`

**Interfaces:**
- Consumes `EncryptedScheduledMessage` from Task 1.
- Produces POST create endpoint, GET/POST key endpoint, and cron-only notification endpoint.

- [ ] **Step 1: Write the failing API policy tests**

Test missing Firebase token, mismatched recipient, pre-unlock request, due request, and a generic push payload that has no content field.

- [ ] **Step 2: Run the API policy test to verify it fails**

Run: `node --test tests/scheduled-message-api.test.mjs`

Expected: FAIL because endpoints and authorization helpers are missing.

- [ ] **Step 3: Implement shared Firebase Admin and encrypted key-material helpers in `api/scheduled-messages/admin.ts`**

Read Firebase Admin variables already used by `api/send-push.ts`; require `SCHEDULED_MESSAGES_KEY_SECRET` and encrypt/decrypt server-held key material with AES-256-GCM. Implement exact account/couple/recipient checks.

- [ ] **Step 4: Implement the create and key-release handlers**

`create.ts` persists ciphertext metadata to `couples/{coupleId}/scheduled_messages` and key material only to the server-protected collection. `key.ts` never returns a key before `unlockAt` and returns it only to `recipientUid`.

- [ ] **Step 5: Implement `notify-due.ts` and configure Vercel cron**

Authenticate Vercel cron with `CRON_SECRET`, query due and unnotified messages, send generic push data pointing to `/?messages=1`, and atomically mark notification status.

- [ ] **Step 6: Run API tests to verify they pass**

Run: `node --test tests/scheduled-message-api.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/scheduled-messages vercel.json tests/scheduled-message-api.test.mjs
git commit -m "feat(messages): add timed key release and notification API"
```

### Task 3: Firestore policy and Đôi lời muốn nói interface

**Files:**
- Modify: `firestore.rules`
- Modify: `src/components/MoreMenuSheet.tsx`
- Modify: `src/components/BottomNavigation.tsx`
- Create: `src/components/ScheduledMessagesModal.tsx`
- Create: `src/utils/scheduledMessageClient.ts`
- Test: `tests/scheduled-messages-ui.test.mjs`

**Interfaces:**
- Consumes Task 1 types and Task 2 API routes.
- Produces `ScheduledMessagesModal`, opened from More menu, with compose/inbox/sent views.

- [ ] **Step 1: Write failing UI and rule tests**

Assert the menu has Đôi lời muốn nói, locked cards do not render plaintext, compose refuses past times, and the rules contain recipient/sender restrictions for `scheduled_messages`.

- [ ] **Step 2: Run the UI/rule test to verify it fails**

Run: `node --test tests/scheduled-messages-ui.test.mjs`

Expected: FAIL because the modal and policy do not exist.

- [ ] **Step 3: Implement restrictive Firestore rules for `scheduled_messages`**

Allow creation only when `senderUid == request.auth.uid`; allow reads only to sender or recipient; prevent direct client writes of server key material and status fields.

- [ ] **Step 4: Implement `scheduledMessageClient.ts`**

It gets the Firebase ID token, calls create/key endpoints, streams message metadata from Firestore, and decrypts only after the server returns the key.

- [ ] **Step 5: Implement `ScheduledMessagesModal.tsx` and connect the More menu**

Add a Heart message item titled `Đôi lời muốn nói`. The modal provides compose, datetime selection, Hộp thư đến, Đã gửi, locked state with opening time, and generic error states. It must never show a draft/content in browser notifications.

- [ ] **Step 6: Run UI/rule tests to verify they pass**

Run: `node --test tests/scheduled-messages-ui.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules src/components/MoreMenuSheet.tsx src/components/BottomNavigation.tsx src/components/ScheduledMessagesModal.tsx src/utils/scheduledMessageClient.ts tests/scheduled-messages-ui.test.mjs
git commit -m "feat(messages): add private messages interface"
```

### Task 4: Release verification and versioning

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Test: existing and new tests

**Interfaces:**
- Consumes all prior completed tasks.
- Produces a versioned, production-ready release.

- [ ] **Step 1: Add a failing release assertion**

Extend the source checks to require `Đôi lời muốn nói` and a generic notification payload without message text.

- [ ] **Step 2: Run it to verify it fails when the release markers are absent**

Run: `node --test tests/*.test.mjs`

Expected: FAIL until implementation markers are present.

- [ ] **Step 3: Bump the minor version and write the changelog entry**

Set the next semantic minor release number and document the key-release configuration prerequisite.

- [ ] **Step 4: Run full verification**

Run: `node --test tests/*.test.mjs; npm run lint; npm run build; git diff --check`

Expected: all exit successfully; Vite chunk-size warning may remain informational.

- [ ] **Step 5: Commit, tag, and push**

```bash
git add package.json CHANGELOG.md tests
git commit -m "chore(release): publish scheduled private messages"
git tag v0.3.0
git push origin main --tags
```
