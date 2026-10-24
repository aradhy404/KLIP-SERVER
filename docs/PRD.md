# Klip — Product Requirements Document

**Version:** 1.0
**Status:** v1.0 shipped on 24 Oct 2026 (auth, entries, contacts, confirm, dispute and settle are live)
**Tagline:** Keep track. Keep it fair.

## 1. Product Overview

Klip is a private ledger for the favours and money **you have given** to people around you.

It answers one question:

> **Who owes me, and for what?**

Klip is deliberately *lender-first*. You record what you gave. The other person is invited to confirm it. Klip is not a generic expense splitter or a two-sided Khatabook clone.

## 2. Core Product Decision (v0.2)

| Decision | Detail |
|---|---|
| Only one direction | The entry creator is always the **lender**. There is no "I owe" entry. |
| Lender invites borrower | The borrower does not need an account to be recorded. When they register with the same phone number, entries addressed to them appear automatically. |
| Borrower gets value after joining | Once registered, the borrower sees what they have been asked to confirm and can confirm or dispute it. |
| Phone number is identity | Users log in with their phone number. Counterparties are identified by phone number. |
| Names are private labels | The lender gives each counterparty a name. That name is visible only to the lender. |

**Why:** it keeps the product focused on one clear job (the person who gave wants a reliable record), and the confirm/dispute step keeps it fair and prevents one-sided claims from silently becoming "truth".

**Consequence to accept:** a person who only borrows gets no value until their lender is on Klip. Growth depends on lenders inviting people.

## 3. Problem Statement

People lend small amounts of money and do favours constantly: shared meals, borrowed cash, notes, rides. These are tracked in memory, chats and screenshots. Over time it becomes hard to remember who owes what, why, and whether it was ever settled. Asking for it back is also awkward.

## 4. Target Users

Students and young adults who lend money and do favours for friends, roommates, classmates, project teammates and club members.

## 5. Goals

1. Recording an entry takes under 15 seconds.
2. A lender can see exactly who owes them, how much, and why.
3. The other person can confirm or dispute, so the record is trusted.
4. Entries can be settled and stay in history.
5. Private data is protected: only the two people on an entry can see it.
6. A dashboard shows totals at a glance.

## 6. Non-Goals for MVP

- "I owe" entries (by design, see section 2)
- Payments, UPI, banking integrations
- Group expenses or splitting
- Chat or social features
- Push notifications
- Reading the phone's contact list (not reliably possible on web; planned for the mobile app)
- Photo attachments (table exists, feature is post-MVP)
- Native mobile apps
- OTP phone verification (planned for v1.1, see section 13)

## 7. Core Concepts

### Entry
A claim by the lender that someone owes them. Either `money` (amount in paise, INR only) or `favour` (no amount).

### Counterparty
The person who owes. Identified by a normalized 10-digit Indian phone number. May or may not be registered.

### Contact
The lender's private name for a counterparty phone number. Used so the UI shows "Rohan" instead of "8188851176".

### Status lifecycle

```text
pending ──confirm──▶ confirmed ──settle──▶ settled
   │                     │
   └────dispute────▶ dispute ──(creator edits)──▶ pending
```

| Status | Meaning |
|---|---|
| `pending` | Created by the lender, not yet reviewed by the counterparty |
| `confirmed` | Counterparty agreed |
| `dispute` | Counterparty disagrees; lender must edit or cancel |
| `settled` | Paid back or favour returned; kept in history |

**v1 behaviour:** a disputed entry is closed by the lender with Settle once they have sorted it out. Editing and cancelling an entry arrive in v1.1.

## 8. Balance Rules

- **Owed to you** = sum of `amount_paise` on entries you created with status `pending` or `confirmed`. Pending amounts are marked *unconfirmed* in the UI.
- **You owe** (shown to the counterparty) = sum of entries addressed to you with status `confirmed` only. Pending entries appear as requests to review and do not count until confirmed.
- `dispute` and `settled` entries are excluded from totals.
- Favours have no amount. They are shown as a count of open favours.
- **Net balance** = owed to you minus you owe.
- Single currency (INR), stored as integer paise.

## 9. MVP Features and Status

| Area | Feature | Status |
|---|---|---|
| Auth | Register, login (phone + password), JWT, rate limiting | Done |
| Entries | Create money/favour entry | Done |
| Entries | List my entries (as lender or counterparty) | Done |
| Entries | Auto-link entries when a counterparty registers | Done |
| Contacts | Private name per counterparty phone | Done |
| Entries | Counterparty confirm / dispute | Done |
| Entries | Lender settles an entry (also closes a disputed one) | Done |
| Entries | Lender edits or cancels while pending/disputed | v1.1 |
| Dashboard | Totals shown in the app | Done (added up in the client from the latest 100 entries) |
| Dashboard | Totals computed by the API | v1.1 |
| Dashboard | Remove all sample data, use real date | Done |
| Invite | "Invite on WhatsApp" link with prefilled message | v1.1 |
| History | Filter by who gave (everything, I gave, asked of me) | Done |
| History | Filter by status | v1.1 |
| Quality | Authorization checks (user C cannot act on A and B's entry) | Verified manually; automated tests in v1.1 |
| Deploy | Client on Vercel, API on Render, DB on Neon | Done |
| Docs | README with live link and screenshots | To do |

## 10. User Stories

- As a lender, I record that Rohan owes me ₹500 for dinner in a few taps.
- As a lender, I give Rohan a name so I do not have to remember his number.
- As a lender, I invite Rohan to Klip so he can confirm the entry.
- As a borrower, I register with my number and see what I am asked to confirm.
- As a borrower, I confirm or dispute an entry.
- As a lender, I mark an entry settled when I am paid back.
- As a user, I see my totals and my history.
- As a user, I know nobody else can read my records.

## 11. Functional Requirements

- Protected resources require authentication.
- Passwords are hashed and never returned.
- Only the creator and the counterparty can read an entry. Everyone else gets 404.
- Only the counterparty can confirm or dispute. Only the creator can edit, cancel or settle.
- Every status change writes an append-only event.
- Money is stored as integer paise.
- A user cannot create an entry against their own phone number.
- All input is validated on the server. Errors are consistent JSON.

## 12. Non-Functional Requirements

- **Security:** hashed passwords, secrets only in environment variables, rate-limited auth, strict CORS allowlist.
- **Reliability:** multi-step writes use transactions.
- **Maintainability:** routes, controllers, services and DB access are separate layers.
- **Performance:** responsive under MVP load. The free Render tier can take ~50 seconds to wake after inactivity; this is accepted for MVP.

## 13. Known Limitations and Risks

| Risk | Impact | Plan |
|---|---|---|
| Phone numbers are not verified | Someone can register another person's number and see entries addressed to it | Add OTP verification in v1.1, before real users |
| Free-tier cold starts | First request can be slow | Acceptable for MVP; mention in README |
| Borrower-only users get no value | Slower growth | WhatsApp invite link; revisit after real usage |
| No password reset | Locked-out users | Resolved by OTP in v1.1 |

## 14. Roadmap

- **v1.0 (MVP):** everything marked Done in section 9. Shipped 24 Oct 2026.
- **v1.1:** dashboard endpoint, edit and cancel, WhatsApp invite link, status filter, automated tests, OTP verification at registration and password reset via OTP.
- **v1.2:** reminders, favour categories, partial settlement.
- **v2:** mobile app (contact picker, push notifications), photo attachments.

## 15. Success Criteria

A user can:
1. Register and log in.
2. Create a money entry and a favour entry for a counterparty with a name.
3. See them in the list and in correct dashboard totals.
4. Have the counterparty register, see the entry, and confirm it.
5. Settle it and see the totals update.
6. Log out and find the data persisted.
7. Not be able to see anyone else's entries.

## 16. MVP Completion Definition

Every row marked Done in section 9 works on the live deployment, the three-account authorization table passes, and no secrets are in the repository or its history. v1.0 meets this; only the README screenshots remain.

## 17. Open Questions

1. Can a settlement be partial?
2. Can the counterparty also mark "I have paid" for the lender to confirm?
3. What happens to entries whose counterparty never registers? (expire, remind, archive)
4. May the lender edit a confirmed entry? Current answer: no, only settle.
