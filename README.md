# Break — putting it on your iPhone

An offline schedule, climbing log, prayer tracker and list of what's due. Once it's on your home screen
it opens like any app, works with no signal, and keeps every tick, block and session
**on the phone itself**. If you sign in to **Sync** (in Settings, the gear on
Today), it also keeps a copy in your own Supabase, photos included, which only your account can read, so
a lost phone gets it all back. Until you sign in, nothing is uploaded and there
is no account. The other thing it fetches is your zone's prayer
timetable from JAKIM's e-Solat, once a year, and that request carries only the
zone code. With Sync on, it can also send you **reminders** for prayer times,
blocks, assignments, exams and quizzes, even while it's closed (see **Reminders**).

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app — layout, logic, your default schedule |
| `manifest.webmanifest` | Name, icon and colours for the home-screen app |
| `sw.js` | The offline cache, and what shows a reminder and opens Break when you tap it |
| `fonts/inter-latin.woff2` | Inter, the app's typeface, kept here so it works offline (licence in `fonts/OFL.txt`) |
| `icon-180.png` | Home-screen icon (iOS) |
| `icon-192.png`, `icon-512.png` | Icons for everything else |
| `.github/workflows/keep-supabase-awake.yml` | Keeps the Sync project from pausing (see **Sync**) |
| `supabase/functions/remind/` | The Edge Function that sends reminders (see **Reminders**) |
| `supabase/reminders.sql` | The tables and schedule it uses, as applied to the project |

They all sit in one folder, with `fonts/`, `.github/` and `supabase/` as folders
inside it. The phone only needs the first six; `supabase/` runs in your Supabase
project and is kept here as the record.

## Putting it on the phone

iOS only installs a web app from a web address, so the files need somewhere to live.
GitHub Pages is free and takes about five minutes. **Your data still never goes
there** — only the app's code does. The schedule you tick off stays on the phone
(and in your Supabase, if you turn on Sync).

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
   works in the gym basement with no signal. On a weak signal it opens from the
   phone's own copy after three seconds rather than waiting on the connection.

## Using it

- **Today** — three rings up top: today's blocks, this week's training minutes,
  and climbing sessions against your four a week. Below them, the block you're in
  with a live ring counting down. **Start focus** turns the screen into a big
  countdown that keeps the phone awake on the desk. If anything on **Due** is
  coming up in the next week, or is overdue, a **Due soon** card shows the next
  three; tap one to open it, or **See all**. Then the day itself, as one
  line with a stop for each block and for any free time between them (see **Free
  time** below). It fills up to now, with a dot at the exact
  minute. Tap a block to tick it, or swipe it right, once it has started; one
  that hasn't gives a little shake and says when it starts (its swipe shows that
  in grey). Unticking always works. A long swipe left opens that block's editor
  as a sheet over Today, so you never leave it. Tick the last one of the day and
  see what happens.
- **The sky** behind everything follows the real time of day — dawn, day, golden
  hour, dusk, night.
- **The tab bar** — tap a tab, or drag along the bar. The glass lens lifts,
  magnifies the tabs under it, and drops onto the one you let go on. The page
  glides in from the side of its tab, so you keep your bearings. Each tab
  keeps its place when you come back to it; tap the tab you're already on to go
  back to the top.
- **Week** — the whole week as one timetable, the way a class timetable is
  printed: a column a day, Monday first, with today's highlighted, and the hours
  down the side from your earliest block to your latest. Each block sits at its
  time, as tall as it runs, in its type's colour; classes are solid, so they stand
  out. The day names stay at the top while you scroll, and a red line marks now in
  today's column. Tap a block to open it in the editor, right there over Week. Tap
  empty space to add one there: it starts on the half hour you tapped and runs an
  hour, or up to the next block. **+** beside the title adds one on today. Below
  the table, **Classes** lists every class with its days, times, kind and room, by
  its first day of the week; tap one to change it, or **Add a class**. Last comes a
  heatmap of the last eight weeks showing which days you actually kept to the plan.
- **Climb** — the gym's opening hours up top, with a live badge (open, midday
  break, or closed and when it opens next) and your own session times marked
  against each day. If you move a climbing block somewhere the gym is shut, it
  says which one and why. During a climbing block, Today shows the same badge. If
  the gym changes its hours, edit the `GYM` list in `index.html` (minutes from
  midnight, Monday first). Below that, your progression charted from your best sends (V-scale or Font, so
  6b+ and V4 land on the same scale) with a grade pyramid underneath, and a toast
  when you beat your hardest send. Tap **+** beside the title to log a session:
  date, best send, how it felt (five faces from blue Great to red Awful, which
  also show in the log), notes, and up to four photos. **Take a photo** opens the
  camera; each shot is scaled down to a 1280px long edge and stored on the phone,
  so a season of sessions stays small. With Sync on they're backed up too. Tap a
  thumbnail in the log to see it full screen, or tap a session to change any of
  it, add or take out photos, or delete it. Saving changes and deleting both come
  with an **Undo**, and photos you take out are only deleted, from the backup as
  well, once the Undo has gone.
- **Solat** — the five daily prayers with your zone's official JAKIM times. Pick
  your zone once and the app downloads that year's timetable from e-Solat, then
  works offline. Tick a prayer when you've prayed it, here or from the row of five
  on Today. One whose time hasn't come in yet can't be ticked: a tap gives a
  little shake and says when it starts. If a prayer's time ends before you tick it (Subuh at syuruk, Zohor at
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
- **Due** — assignments, exams and quizzes. **+** beside the title adds one: pick
  the kind, give it a name, a course if you like, and the date and time (an
  assignment's time starts at 11:59pm, an exam's or a quiz's at 9am). The list
  runs soonest first, under **Overdue**, **Coming up** and, for an exam or a quiz
  whose time has passed unticked, **Gone by**. Each says how it stands (Upcoming,
  Due soon inside two days, Overdue in red, or Completed) and how long is left,
  and the countdowns tick down while you watch. Above them, the next one in the
  coming fortnight counts down in large type, with a bar that fills as it gets
  close. Tap the round check to tick one off (handed in, or sat), or swipe it
  right; its check pops and its title strikes through before it moves to
  **Completed**, with an **Undo**. Tap a row to change it; **Delete** has an Undo
  too. **All**, **Assignments**, **Exams** and **Quizzes** along the top show one
  kind at a time. They sync like everything else, and Reminders can tell you about
  each a week, three days, a day and an hour before.
- **The block editor** — opens as a sheet over whichever page you're on: a long
  swipe left on Today, a tap on Week, **+** on Week, or **Other…** in free time.
  Give it a **Start** and a **Stop**; it shows the length as you go, and a stop
  earlier than the start runs past midnight ("ending the next morning"). Moving
  the start carries the stop with it, keeping the length, as in Calendar. Two
  blocks can't share the same time on the same day (one ending exactly when the
  next starts is fine). If a block overlaps others, the form lists each one and
  what will happen to it. **Add and make room** then shortens those blocks or
  takes them off the days you share, and the message that follows has an
  **Undo**. **Start at …** moves your block to the next free time instead, when
  there is one. **Delete block** has an Undo too.
- **Classes** — **Block** or **Class** at the top of the editor picks what you're
  adding; a new one starts as whatever you added last, so a whole timetable goes
  in one class after another. A class has a name (say, CSC584 Database Systems),
  a kind if you like (**Lecture**, **Tutorial** or **Lab**) and a room in place of
  a type, plus its days and times like any block. It makes room the same way, it
  shows on Today with its kind and room under its name and on Week's table with
  its room, and its reminder
  says where: "8am–10am · Lab · Makmal 2". Free time never offers a class, and
  Due's **Course** field suggests your class names.
- **Free time** — any stretch of 15 minutes or more between 9:30am and midnight
  with no block shows on Today as a hollow stop on a dashed stretch of
  the line, say "Free · 1.5h, 10am–11:30am". It offers up to two blocks you've
  had at that time before: the original plan for that day first (Breakfast,
  Chores, Lunch), then your other days, nearest in time first. Prayers are never
  offered (they live in Solat), and neither is climbing. On a climbing day
  nothing is offered between 2pm and 7pm, which stays clear for the climb. Tap
  one to add it to that day alone, at its usual length and, where it fits, its
  usual time, with an **Undo**. Whatever it leaves free stays offered. **Other…**
  opens the editor already set to that day, start time and length. Nothing
  changes until you tap.
- **Settings** — the gear beside Today's title. Sync, **Reminders** (in the
  home-screen app), **Clear cache**, and **Reset schedule**,
  which puts the original plan back without touching your ticks or climbing
  log. When Sync needs you (signed out, or failing for a reason other than no
  signal), the gear shows a red dot.

## How it moves

Motion follows iOS and always means something. Sheets rise from the bottom with a
little spring and sink away when closed; drag one down by the grabber at its top,
or by its title, and let go to put it away, or let go early and it springs back.
The thumb in **All / Assignments / Exams / Quizzes** and in Week's days slides to
what you pick. When Due's list changes, rows glide to their new places and new
ones settle in, and a countdown that changes rolls up into place. Buttons give a
little under your finger and spring back. A block or prayer that can't be ticked
yet shakes its head, the way iOS shakes off a wrong passcode. With a mouse, the countdown card and
Today's now card lean a degree towards the pointer; on the iPhone they never
tilt. With **Reduce Motion** on (Settings → Accessibility → Motion), all of it
stays still. The tab bar's Liquid Glass lens is unchanged.

## Text size

The app follows **Settings → Accessibility → Display & Text Size → Larger Text**.
Everything grows with it, and past roughly the second accessibility step the rows
restack so activity names stay on their own line instead of being squeezed. Tab bar
labels stay put, which is what iOS itself does.

The screen itself doesn't zoom: a pinch or a double-tap does nothing, so the page
can never be left zoomed in with the tab bar out of place. That goes for photos in
the climbing log too. Larger Text is the way to make things bigger.

## Backups

Your data lives in Safari's storage for this app, so deleting the app, or
clearing Safari's website data, erases it from the phone. **Sync** is the backup:
signed in, everything goes to your Supabase a moment after it changes, photos
included, and a new or reset phone gets it all back by signing in. The backup
file (Back up to iCloud, Restore from file and the text backup) was taken out on
31 October 2026, because Sync does the same job by itself.

## Sync

Break can also keep a copy of your schedule, ticks, climbing log, photos,
prayers, and assignments, exams and quizzes in the free Supabase project called
**Break**, in Singapore. The phone stays the main copy and works with no signal.
Changes go up a moment after you make them whenever there's a connection, and the
newest change wins. This is the backup, and it runs by itself.

Photos go to the project's private **photos** bucket (under **Storage** in the
dashboard), one file per photo in a folder for your account. New photos go up
the next time Break syncs, a new phone downloads them, and deleting a session
removes its photos there too. At about 200 KB a photo, the free plan's 1 GB
holds roughly 5,000.

**Signing in.** On **Today**, tap the gear for **Settings**, and under **Sync**
tap **Continue with GitHub**. You
sign in to GitHub and approve **Break** once, and it comes straight back to the
app, signed in. That works inside the home-screen app; Google isn't offered
because it refuses sign-in inside home-screen apps on the iPhone.

Or use an email and a password; nothing is emailed. (**Confirm email** is
switched off in the project under **Authentication → Sign In / Providers**,
because free projects can't change what Supabase's emails say.) The first time,
enter your email and a password of 6 or more characters and tap **Create
account**; on other phones tap **Sign in**. If your GitHub account uses the same
email, both ways land in the same account.

The first phone you sign in on uploads everything. On a phone that hasn't synced
with your account before, signing in replaces what's on it with your synced
copy, unless the synced copy is empty or just the default schedule. **Sign out**
only stops syncing; everything stays on the phone.

**How GitHub sign-in is wired.** A GitHub OAuth app called **Break** (GitHub →
Settings → Developer settings → OAuth Apps) sends sign-ins to
`https://rddznoqnnnqlkmkgiwuj.supabase.co/auth/v1/callback`. Its client ID and
secret are in the project under **Authentication → Sign In / Providers →
GitHub**, and **Authentication → URL Configuration** sends people back to
`https://nabilhzq13.github.io/TimetableNabuzy/`.

Once your account exists, you can turn off **Allow new users to sign up** on the
same settings page so nobody else can make one. Their rows would be walled off
from yours anyway.

If you forget the password, your data is still on the phone. Delete your user
under **Authentication → Users**, then create the account again from the phone,
and it uploads everything afresh.

**Keeping it awake.** Supabase pauses a free project after a week without enough
database activity. Opening Break keeps it awake, and for the weeks you don't,
a GitHub Action in this repository (`.github/workflows/keep-supabase-awake.yml`)
calls the project twice a day. It calls `keep_awake()`, a database function that
reads no table and only returns the time, using the same public key Break carries,
so it needs no secrets. You can see its runs under the repository's **Actions**
tab, and **Run workflow** there runs it by hand. If the project ever does pause,
the run fails and GitHub emails you; Break carries on offline until you resume
the project from the dashboard. GitHub switches off scheduled runs in a public
repository after 60 days without a commit, and emails you first; any push, or
**Enable workflow** on the Actions tab, turns it back on.

## Reminders

Break can put four kinds of reminder on your lock screen, even while it's
closed:

- **Prayer times** — when each prayer's time starts, from JAKIM's timetable for
  the zone you picked on Solat. Tapping one opens Solat.
- **Before a prayer runs out** — 30 minutes before a prayer's time ends, but only
  if you haven't ticked it, so it stays off the qadha list.
- **Block starts** — before each block on your schedule, 10 minutes ahead unless
  you change it. A block you've already ticked gets none. A class's says its
  kind and room as well. Tapping one opens Today.
- **Assignments, exams and quizzes** — a week, three days, a day and an hour
  before each one on **Due** (pick any mix of the four), and none once you've
  ticked it off: "Lab report 2 is due tomorrow", "Exam in 3 days: Calculus
  final". Moving one's date or time brings fresh reminders. Tapping one opens Due.

**Turning them on.** They only work in the home-screen app, on iOS 16.4 or
later, and with Sync signed in, because your Supabase is what sends them. On
**Today**, tap the gear for **Settings**, then under **Reminders** tap **Turn
on reminders** and **Allow**. **Send a test** checks that one reaches this
phone. Prayer times come when they start and blocks 10 minutes early; both can be
changed there, along with which kinds you get. The choices sync, so every phone
signed in to your account uses the same ones.

**Quiet hours** run from 12am to 7am, as you've set them: the phone leaves the
bed at midnight, and an early class still gets its reminder. Nothing comes in
quiet hours. Something that starts after they end still gets its reminder, the
minute they end. A deadline's reminder that falls in them comes when they end,
if that's still before the deadline, so the day-before reminder for an
assignment due at 2am arrives at 7am. The hour-before one for a 7am exam, at
6am, would only come once it starts, so it doesn't come. Subuh (about 5:50am)
stays quiet unless you switch on **Let Subuh through**. Setting both times the
same means no quiet hours.

**Turn off** stops them on that phone. **Sign out** does too, since they come
from your synced copy. After **Clear cache** the phone signs itself up again on
the next launch; if it can't, the card says **Off**, and **Turn on reminders**
fixes it. If iOS has notifications for Break switched off, the card says so:
turn them back on in the Settings app, under **Notifications → Break**.

**How it works.** Every minute, a `pg_cron` job called `break-reminders` asks
the project's `remind` Edge Function to send whatever is due. It reads each
phone with reminders on (`push_subs`), your synced schedule, ticks,
assignments, exams and quizzes, choices and zone (`docs`), and JAKIM's timetable, which it downloads from e-Solat once a year
per zone and keeps in `prayer_times`. Each reminder goes once (`push_sent`
remembers what went out for three days). They go out as standard Web Push,
through Apple's push service, signed with a VAPID key pair. The public half is in
`index.html` and in the function. The private half lives only in the
project's **Edge Functions → Secrets** as `VAPID_PRIVATE_KEY`, pasted there by
hand; it's never in the page or this repository. All of this is on the free
plan: about 45,000 runs a month, against 500,000 included.

The function's source is `supabase/functions/remind` (`lib.ts` works out what's
due and does the encryption and signing; `index.ts` talks to the database and
the push service), and `supabase/reminders.sql` is the record of the tables and
schedule. To change the function, edit it there and deploy it again with JWT
verification off, since it checks sign-ins itself:

```bash
supabase functions deploy remind --project-ref rddznoqnnnqlkmkgiwuj --no-verify-jwt
```

If something stops arriving, **Settings → Reminders** shows when the last one
got through or what Apple said about the last one that didn't, and the project's
**Edge Functions → remind → Logs** shows each send. A new key pair (say the
private half leaked) means a new public key in `index.html` (`VAPID`) and in
`index.ts` (`VAPID_PUBLIC`), the new private half in the secret, a redeploy, a
bump of `sw.js`, and **Turn off** then **Turn on reminders** on each phone.

## Clear cache

Break keeps a copy of its own files (the page, the font, the icons) so it opens
with no signal. If it ever looks out of date or acts up, open **Settings** (the
gear on Today) and tap **Clear cache** under **App**. It throws that copy away,
downloads the files again and reopens. Your schedule, ticks, climbing log,
photos, prayers and sign-in are kept somewhere else on the phone, so they stay
exactly as they are. It needs signal, and with none it leaves the cache alone and
says so. **App** also shows which version the phone is running.

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
