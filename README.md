# Break — putting it on your iPhone

An offline schedule and climbing log. Once it's on your home screen it opens like any
app, works with no signal, and keeps every tick, block and session **on the phone
itself**. Nothing is uploaded, there is no account, and no one else can see it.

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

- **Today** — the day's blocks. Tap one to tick it off. The block you're in is
  highlighted, and the streak counts days where you finished at least 60% of them.
- **Week** — any day of the week, with start and end times.
- **Climb** — log each session: date, best send, how it felt, notes, and up to four
  photos. **Take a photo** opens the camera; each shot is scaled down to a 1280px
  long edge and stored on the phone, so a season of sessions stays small. Tap a
  thumbnail to see it full screen. Deleting a session deletes its photos too.
- **Edit** — change the schedule. Tap any block to edit or delete it, or add new
  ones. **Reset schedule** puts the original plan back without touching your ticks
  or climbing log.

## Text size

The app follows **Settings → Accessibility → Display & Text Size → Larger Text**.
Everything grows with it, and past roughly the second accessibility step the rows
restack so activity names stay on their own line instead of being squeezed. Tab bar
labels stay put, which is what iOS itself does.

## Backups

Your data lives in Safari's storage for this app. Deleting the app, or clearing
Safari's website data, erases it. Every few weeks open **Edit → Show backup**, copy
the text, and paste it into Notes or email it to yourself. **Restore from backup**
pastes it back.

**Photos are not in that backup.** It's plain text meant to be pasted into a note,
and photos would make it enormous. They live in the phone's own image store
(IndexedDB) and go when the app goes. If a photo matters, save it to your camera
roll too: tap the thumbnail to open it full screen, then press and hold.

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
