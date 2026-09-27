# For the day

![For the day — Psalms + Proverbs](for-the-day-logo-banner.png)

A quiet place to read Psalms and Proverbs, one day at a time.

For the day brings together each day's passages in a simple reader. Scroll through the words, swipe between passages, and pick up where you left off.

## A daily rhythm

On days 1–30, read five Psalms and one chapter of Proverbs. On day 7, for example, you'll read Psalms 7, 37, 67, 97, and 127, followed by Proverbs 7. Day 31 pairs Psalm 119 with Proverbs 31.

The reader opens to today. You can choose another day, return to Today, or revisit a passage whenever you like.

## Make yourself at home

- Your place is remembered in each passage.
- Adjust text size, spacing, and appearance to suit your reading.
- Move between passages with a swipe, the passage indicators, or the reader menu.
- Use a keyboard, select text, and zoom with familiar browser controls.
- Share your current location or copy its link from the reader menu.

WEBU (World English Bible Updated) is available from bundled public-domain Psalms and Proverbs without credentials or a database. CSB, NIV, NLT, and ESV are available locally with configured provider access. The built app supports installation and can open its reader shell offline; Fresh retained chapters can reopen offline: CSB/NIV/NLT for up to 24 hours and ESV for up to one hour. Whole-chapter verse bounds, browser eviction and unavailable storage can shorten retention; missing or expired chapters require a connection.

## Try it on your computer

To try WEBU without Docker or provider credentials, run `mise install`, `mise run install`, then `mise run dev:web`. Open [Psalm 23 in WEBU](http://localhost:5173/23/psalm/23/4?translation=WEBU), or choose WEBU in settings. `mise run webu:update` checks for upstream updates and regenerates the corpus with footnotes removed. Source refresh is always explicit; ordinary reading, builds and tests never download Scripture.

You'll need [mise](https://mise.jdx.dev/), Docker Desktop running, and API.Bible access to the CSB translation.

1. Install the tools and prepare the app:

   ```sh
   mise install
   mise run setup
   ```

2. Open the newly created `.env` file and fill in `API_BIBLE_KEY` and `API_BIBLE_CSB_ID` from your API.Bible account. Keep this file private.

3. Start the reader:

   ```sh
   mise run dev
   ```

4. Open [localhost:5173](http://localhost:5173) in your browser. Press Ctrl-C in the terminal when you're done.

To read on your phone, stop the app and run `mise run host`. Connect your phone to the same Wi-Fi network and open the address printed in the terminal.

To try the installable build on your computer, run `mise run build`, then `mise run preview`, and open [localhost:4173](http://localhost:4173). See [PWA behavior](docs/pwa.md) for offline and update details.

## Explore further

See the [reader guide](docs/reading-first-interface.md) for controls and the [developer guide](docs/development.md) for configuration, commands, and verification notes.

The logo is available as a [banner](for-the-day-logo-banner.png), [stacked logo](for-the-day-logo-stacked.png), and [icon](for-the-day-logo-icon.png).
