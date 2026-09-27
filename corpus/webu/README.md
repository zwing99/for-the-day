# Pinned WEBU source

These are public-domain World English Bible Updated (`engwebu`) Psalms and Proverbs, downloaded from the edition's USFX archive. `provenance.json` records the exact archive URL, retrieval time, archive checksum, unchanged book-extract checksums and license checksum. `license.html` is the supplied license. Only these two books are retained; the complete archive stays in ignored `.local/webu/`.

This directory and `public/scripture/webu/` are an explicit exception to the repository's prohibition on tracked real Scripture fixtures. CSB/NIV/NLT/ESV text and provider metadata remain excluded.

`mise run webu:update` checks upstream and regenerates reader assets with footnotes removed. Unchanged extracts and license leave tracked provenance unchanged; updates produce a reviewable diff. `mise run webu:refresh` provides the separate source-only network step. It downloads and pins new extracts; inspect the source and provenance diff before adoption. `mise run webu:generate` then generates revisioned chapters from local extracts. Generation never downloads missing data. A changed revision replaces the preceding generated directory; review the generated additions and removals together. `mise run webu:verify` detects missing, stale, corrupt or unexpected assets; ordinary builds and tests never refresh Scripture.

Footnote (`f`) subtrees are deliberately omitted from reader assets. The original XML remains unchanged. Following text, words, punctuation, inline semantics, poetry indentation, titles (including the first chapter’s book title) and source verse boundaries are preserved. XML whitespace between block elements is serialization whitespace, not Scripture; whitespace inside literary blocks remains exact. Word tags retain source Strong's attributes; `qs` keeps its source emphasis. Unknown chapter markup fails generation.

Generation uses Node, the existing jsdom XML parser, and the system unzip command for explicit refresh only. Unit tests independently walk the pinned XML to compare every chapter's text, poetry, titles, verse order and semantic indexes with actual production JSON assets.
