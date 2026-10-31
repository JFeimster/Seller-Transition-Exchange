# Seller Transition Exchange — Version 2 Operational Inventory

Version 2.7 freeze artifact. This document records route boundaries, canonical entities, status classifications, and production limitations. It is an internal operator reference and is not published through the public sitemap.

## Route inventory

| Route family | Visibility | Role | Indexing | Primary state |
| --- | --- | --- | --- | --- |
| `/` | Public | Visitor | Indexable | Functional durable shell + device-local seller draft |
| `/businesses-for-sale`, `/confidential-opportunities`, `/industries/*`, `/markets/*` | Public | Visitor | Indexable when listed | Native marketplace, vertical overlays, regional records |
| `/digital-businesses/*` | Public | Visitor | Indexable for module education | External marketplace adapter, session valuation, referral routing |
| `/resources`, `/resources/*` | Public | Visitor | Indexable | Editorial-review-required guides; publication approval remains false |
| `/quiet-exit*` | Public education | Visitor | Education indexable | Quiet Exit education; private mandate records remain protected |
| `/financing-readiness*`, `/capital-desk/resources` | Public education | Visitor | Education indexable | Educational financing readiness |
| `/change-of-ownership*` | Public education | Visitor | Education indexable | Path education; profiles and plans protected |
| `/buyers*`, `/advisors*`, `/community*` | Public directory/education | Visitor | Directory landing pages indexable; dynamic profiles excluded | Approved records only; honest empty states |
| `/sell` | Protected | Signed-in seller | Excluded | Seller intake and canonical record creation |
| `/exit-readiness`, `/value-builder` | Public tool | Visitor; authenticated save where available | Indexable education/tool entry | Preliminary session/device assessment and value-building guidance |
| `/transition` | Protected | Signed-in seller | Excluded | Seller transition command center |
| `/seller/*` | Protected | Seller | Excluded | Canonical seller/business, listings, launch, deal room, network, financing |
| `/buyer/*` | Protected | Buyer/successor | Excluded | Buyer profile, criteria, verification, access, transition, financing |
| `/advisor/*` | Protected | Advisor | Excluded | Advisor profile, assignments, introductions, activity |
| `/admin/*` | Protected | Admin allowlist | Excluded | Review, approvals, routing, audits, platform administration |
| `/api/*` | Protected or public-safe read | Route-specific | Excluded | Authenticated durable writes; public responses are field-filtered |
| `/go/*` | Controlled redirect | Visitor | Excluded | Validated external referral routing with attribution |

Protected workspace routes use the ChatGPT sign-in gate. Admin mutations require the configured administrator allowlist. The robots policy and sitemap implement the positive public-indexing allowlist.

## Canonical entities

Seller, Business, Listing, Buyer, Successor Transition Profile, Advisor, Financing Request, Transition Plan, Legacy Profile, Legacy Match, Generated Material, Deal Room, Deal Room Item, Introduction Request, Advisor Assignment, Regional Market, Network Event, Event Registration, and Audit Event.

Syndicated digital opportunities remain external marketplace records and never become native Seller, Business, Quiet Exit, or Deal Room records. Demo records carry explicit demo classification.

## Authorization matrix

| Entity | Create/update | Read | Approval/archive | Public |
| --- | --- | --- | --- | --- |
| Seller / Business / Listing | Owning seller; admin review | Owner + scoped admins | Admin publication/archive | Approved listing fields only |
| Buyer / Successor Profile | Owning participant | Owner; scoped seller summaries | Admin verification | Buyer-approved fields only |
| Advisor | Owning advisor | Owner; admin; approved public fields | Admin verification/suspension | Verified public fields only |
| Financing / Capital Desk | Owning seller/buyer; routed partner scope | Owner + routed scope + admin | Admin/partner review | None |
| Transition / Legacy / Match | Owning seller and scoped successor | Owner + scoped reviewer | Seller/admin decision | None |
| Generated Material | Seller-authored draft; scoped editor | Owner + approved scope | Seller/admin/role-specific approval | Approved public output only |
| Deal Room / Item / Grant | Seller/admin; item-scoped grants | Grant recipient within scope | Seller/admin; expiration/revocation | None |
| Introduction Request | Authenticated participant | Requesting/recipient participant + admin | Participant/admin decision | None |
| Regional Market / Event | Admin-reviewed | Public-safe records; admin full record | Admin publish/archive | Approved public fields |
| Audit Event | System append-only | Scoped admin/operator review | No in-place edits | None |

## Migration inventory

Migrations `0000` through `0008` are preserved. Version 2.7 adds corrective migration `0009_strong_madame_web.sql`, adding query indexes for advisor assignments, public advisor status, introductions, regional visibility, events, registrations, network audit events, and seller buyer shortlists. Existing migrations remain immutable.

## Classification matrix

- Native: Seller Transition Exchange-owned canonical record.
- Syndicated External: adapter-sourced digital opportunity; referral only.
- Seller Provided / Buyer Provided / Advisor Submitted / Partner Provided: supplied evidence awaiting the applicable review.
- Verified: documented review state; never a promise of closing, financing, or professional outcome.
- Inferred / Missing / Stale / Conflicting: visible evidence condition.
- Demo: seeded demonstration record, never a production claim.
- Functional Durable State: D1-backed record or audit event.
- Session-Local / Device-Local: temporary valuation or seller draft state.
- UI-Only: interface placeholder with no external action claimed.
- Pending External Integration: delivery, storage, scanning, or confirmation not connected.
- Disabled Secure Action: intentionally unavailable until secure infrastructure is configured.

## Public indexing allowlist

`/`, marketplace education, `/industries/*`, approved regional education, digital-business education, `/resources/*`, public Quiet Exit education, financing education, change-of-ownership education, `/buyers` landing pages, `/advisors` landing pages, and `/community` education/event pages.

## Protected indexing denylist

Seller, buyer, advisor, successor, admin, financing request, Capital Desk package, Transition Plan, Legacy Profile, Legacy Match, Generated Material private routes, Deal Room, grants, assignments, introductions, event registrations, documents, audit events, internal APIs, private mandates, invite-only records, and dynamic buyer/advisor profile IDs.

## Version history

1.1 marketplace baseline · 2.0 platform architecture · 2.0.1 digital businesses/value lab · 2.0.2 resource library · 2.1 Quiet Exit · 2.2 Financing Readiness/Capital Desk · 2.3 Vertical Seller Intelligence · 2.4 Change-of-Ownership/Legacy Matching · 2.5 Seller Launch Studio/Deal Room · 2.6 Buyer/Advisor Network/Regional Markets · 2.7 production hardening and Version 2 freeze.

## Confirmed limitations

Secure binary storage, malware scanning, secure file delivery, external introduction delivery, event email confirmation, live professional credential verification, and real-time external marketplace availability remain pending integrations. The interface preserves these states explicitly and does not represent them as completed.
