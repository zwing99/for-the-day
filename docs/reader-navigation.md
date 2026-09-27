# URLs and reader navigation

Routes are `/`, `/:day`, `/:day/psalm/:chapter`, and `/:day/proverbs/:chapter`, with optional `/intro` or a provider's printed verse label. Shared canonical links include `?translation=CSB` (or NIV/NLT/ESV), with repeated `org` identity parameters when supplied. Partial and range labels remain strings. Invalid syntax, outside-plan chapters and absent fetched verse labels produce recovery rather than clamping.

Root chooses today's local day once. Day-only routes may restore that day's active-passage hint. Explicit URL locations override saved passage locations; saved locations override intro/first-verse defaults. Versioned guarded storage holds only logical URLs and preferences, with session-memory fallback. Each day/passage has an independent location; no Scripture objects are persisted.

Explicit passage/navigation actions push history. Vertical reading replaces the current entry. Begin replaces an intro entry. Popstate restores while marker observers are suppressed, including within a mounted passage; obsolete fetches are cancelled and late responses ignored. Pagehide and hidden-document events flush the current logical location. Translation adapters and exact cross-translation mapping remain later tasks.

Native scrolling is primary. Touch observation never prevents native vertical movement or pinch zoom. Horizontal navigation requires 56px travel, 1.75× horizontal dominance, completion within 700ms, and no established vertical intent. Cancellation, multiple touches, controls and active text selection reject passage changes. Ends are bounded. Scoped arrows and direct passage selection provide alternatives; tall-card vertical keys retain native scrolling.

Prominent button rows have been removed. The reader menu supplies card/passage alternatives and presentation controls; small named indicators allow direct selection. See [reading-first-interface.md](reading-first-interface.md) for the current interaction and browser review.

Verification on 2026-09-26: 111 unit/component tests passed, covering strict URLs, partial/range labels, corrupt/unavailable storage, independent positions, cancellation, mounted popstate, keyboard exclusions and touch classification. Chromium Playwright checks with invented fixtures proved independent A/B/C restoration, reload, explicit links, one-action Back to the previous passage, and Forward. Live VoiceOver is not a completion gate. Physical Safari/touch review remains a later gate.
