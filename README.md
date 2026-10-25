# Break — putting it on your iPhone

An offline schedule, climbing log and prayer tracker. Once it's on your home screen
it opens like any app, works with no signal, and keeps every tick, block and session
**on the phone itself**. Nothing is uploaded, there is no account, and no one else
can see it. The one thing it fetches is your zone's prayer timetable from JAKIM's
e-Solat, once a year, and that request carries only the zone code.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app — layout, logic, your default schedule |
| `manifest.webmanifest` | Name, icon and colours for the home-screen app |
| `sw.js` | The offline cache |
| `icon-180.png` | Home-screen icon (iOS) |
| `icon-192.png`, `icon-512.png` | Icons for everything else |

All six files must sit in the same folder.

## Putting it on the phone

iOS only installs a web app from a web address, so the files need somewhere to live.
GitHub Pages is free and takes about five minutes. **Your data still never goes
there** — only the app's code does. The schedule you tick off stays on the phone.

1. Go to [github.com/new](https://github.com/new). Name the repository `break`,
   choose **Public**, and create it.
   (Free GitHub Pages only serves public repositories. The code being public is
   harmless — it holds none of your data.)
2. On the new repository page click **uploading an existing file**, drag in the six
   files listed above from the `break-app` folder (this README isn't needed), and
   click **Commit changes**.
3. Open **Settings → Pages**. Under *Source* pick **Deploy from a branch**, set the
   branch to **main** and the folder to **/ (root)**, then **Save**.
4. Wait a minute, then reload that page — it shows your address, like
   `https://<your-username>.github.io/break/`.
5. On your iPhone open that address **in Safari** (not Chrome — only Safari can
   install to the home screen). Tap **Share**, scroll down, tap **Add to Home
   Screen**, then **Add**.
6. Open it from the home screen. It now runs full screen with no browser bar, and
   works in the gym basement with no signal.

## Using it

- **Today** — three rings up top: today's blocks, this week's training minutes,
  and climbing sessions against your four a week. Below them, the block you're in
  with a live ring counting down. **Start focus** turns the screen into a big
  countdown that keeps the phone awake on the desk. Tap a block to tick it, or
  swipe it right. A long swipe left opens that block in the editor; save, cancel
  or delete and you're back on Today. Tick the last one of the day and see what
  happens.
- **The sky** behind everything follows the real time of day — dawn, day, golden
  hour, dusk, night.
- **Week** — any day of the week with the gym's hours for that day, plus a heatmap
  of the last eight weeks showing which days you actually kept to the plan.
- **Climb** — the gym's opening hours up top, with a live badge (open, midday
  break, or closed and when it opens next) and your own session times marked
  against each day. If you move a climbing block somewhere the gym is shut, it
  says which one and why. During a climbing block, Today shows the same badge. If
  the gym changes its hours, edit the `GYM` list in `index.html` (minutes from
  midnight, Monday first). Below that, your progression charted from your best sends (V-scale or Font, so
  6b+ and V4 land on the same scale) with a grade pyramid underneath, and a toast
  when you beat your hardest send. Log each session: date, best send, how it felt
  (five faces from blue Great to red Awful, which also show in the log), notes, and
  up to four photos. **Take a photo** opens the camera; each shot is scaled down to a 1280px
  long edge and stored on the phone, so a season of sessions stays small. Tap a
  thumbnail to see it full screen. Deleting a session deletes its photos too.
- **Solat** — the five daily prayers with your zone's official JAKIM times. Pick
  your zone once and the app downloads that year's timetable from e-Solat, then
  works offline. Tick a prayer when you've prayed it, here or from the row of five
  on Today. If a prayer's time ends before you tick it (Subuh at syuruk, Zohor at
  Asar, Asar at Maghrib, Maghrib at Isyak, Isyak at the next Subuh), it goes on
  your qadha list, oldest first and in prayer order, and stays there until you tap
  **Made up**. Forgot to tick one you did pray on time? Tap it and choose **I
  prayed it on time**. **Excused** is for haid or nifas, when no qadha is owed.
  Qadha from before you started tracking goes in with **Add qadha from before**:
  either "missed all five for about 2 years" (a month counts as 30 days, a year
  as 365), or a count for each prayer. Each **Made up** takes one off, **Made up
  one of each** takes one off all five, and a bar shows how far you've come.
  **How qadha works** sums up the rulings (Shafi'i school, from the Federal
  Territory Mufti's office) with links to each source. Until JAKIM publishes a
  new year's timetable, the app uses the same dates from last year and says so.
- **Edit** — change the schedule. Tap any block to edit or delete it, or add new
  ones. Two blocks can't share the same time on the same day (one ending exactly
  when the next starts is fine). If a block overlaps others, the form lists each
  one and what will happen to it. **Add and make room** then shortens those blocks
  or takes them off the days you share, and the message that follows has an
  **Undo**. **Start at …** moves your block to the next free time instead, when
  there is one. Blocks that already overlap are flagged in the list; tap one to
  fix it. **Reset schedule** puts the original plan back without touching your
  ticks or climbing log.

## Text size

The app follows **Settings → Accessibility → Display & Text Size → Larger Text**.
Everything grows with it, and past roughly the second accessibility step the rows
restack so activity names stay on their own line instead of being squeezed. Tab bar
labels stay put, which is what iOS itself does.

## Backups

Your data lives in Safari's storage for this app. Deleting the app, or clearing
Safari's website data, erases it, so keep a copy in iCloud:

1. Open **Schedule → Your data** and tap **Back up to iCloud**.
2. In the share sheet, choose **Save to Files**, then **iCloud Drive** (a folder
   called Break keeps them together), and **Save**.

The file, `break-backup-<date>.json`, holds everything: the schedule, ticks,
climbing log with its photos, prayer ticks and qadha, earlier qadha included. The
prayer timetable isn't in it; it downloads again by itself.

To bring it back, on this phone or a new one, tap **Restore from file** and pick
the file. The app says what's in it and asks before it replaces anything.

When your last backup is more than a week old, Today shows a reminder with **Back
up now**. **Later** hides it for three days.

There's still a plain-text backup under **Copy or paste a text backup instead**,
for pasting into Notes. It leaves out photos, which would make it enormous.

## Changing the app later

Edit the files, upload them to the repository again, and bump the version in `sw.js`
(change `break-v1` to `break-v2`). Next time the phone has signal it picks up the new
version.

## Testing it on this computer first

From the folder that contains `break-app`:

```bash
python -m http.server 8765 --directory break-app
```

Then open `http://localhost:8765`. The app works the same there, but the data on your
computer and the data on your phone are separate.
