# Reading day and cache eligibility

Days 1–30 have Psalms d, d+30, d+60, d+90, d+120, then Proverbs d. Day 7 is Psalms 7, 37, 67, 97, 127 and Proverbs 7. Day 31 is Psalm 119 and Proverbs 31; it remains selectable during February.

The root URL resolves today's local calendar day once when opening the reading session. Explicit URLs and manual day selection take precedence. A session must retain its chosen day across midnight; the Today action resolves the clock again when invoked. Domain functions accept an injected clock and optional IANA time zone; the browser default uses its local calendar.

ESV cache eligibility uses the fixed 31-position cycle, not the calendar month's length. The smaller circular distance between selected reading day and current local day must be at most five, inclusive. On day 30 the eligible days are 25–31 and 1–4. A chapter must also belong to the selected reading plan. Psalm 119 belongs to both day 29 and day 31, and each request is evaluated using its selected day. The server will use its own clock with validated reader time-zone context; omitted context bypasses ESV caching. Eligibility alone does not replace freshness or provider storage budgets.
