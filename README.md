# magnet diary

A digital photo journal on a brushed silver board. Every day gets its own board. Photos, notes and stickers stick on like magnets and can be dragged, resized and rotated.

Live at **https://karisa.space**

## How it's built

- **Front end:** plain HTML, CSS and JavaScript in `public/`. No build step.
- **Backend:** [Supabase](https://supabase.com) project `karisa` (Sydney).
  - **Auth:** email and password, with password reset.
  - **Database:** Postgres. Every photo, note and sticker is its own row in `items`, so several people can edit one board later without overwriting each other.
  - **Security:** row level security on every table. Boards are private by default. Public boards can be seen but not edited. Only the owner and invited editors can change a board.
  - **Photos:** a private `photos` bucket, shown through signed links that expire after 12 hours.
  - **Edge function `delete-account`:** removes someone's photos and account.
- **Hosting:** Vercel, serving `public/` (see `vercel.json`).

## Community

- **Profiles:** username, name, bio and photo. Asked for the first time someone opens the feed, together, me, or posts.
- **Posting:** on any board you own, tap **↗ post**, write a caption and choose **followers** or **everyone**. The post shows the live board, so anything added later appears on it. "take it down" makes the board private again.
- **Home:** posts from people you follow plus your own, with a stories row of friends who posted. Double-tap a board to give it a magnet. Share copies a link to the post.
- **Explore:** search people, and a grid of every board posted for everyone.
- **Tagging:** when posting, tag friends by @username. They get a notification, can always see the post (even followers-only), and it shows on the *tagged* tab of their profile. Anyone can remove themselves from a post. `@username` in captions and comments links to their profile.
- **Activity:** new followers, magnets, comments, tags and board invites, grouped by today / this week / earlier (heart icon on the home screen).
- **Magnets and comments:** a magnet is a like. Comments can be deleted by whoever wrote them or by the post's owner.
- **Together:** shared memory boards. Create one, tap **people** and invite friends by @username. Everyone on the board can add and move things, and changes show up on everyone's screen live. Green rings show who has it open.
- **Me:** profile with posts and tagged grids, edit profile, share profile.
- **Several boards a day:** under the date, tap **＋ another board** to start a second (or third…) board for the same day. Number pills switch between them, and tapping the current one lets you delete it. Each board can be posted on its own. Links look like `#2026-11-28/2`.
- **Live photos:** add → photos → *live photo*. Film a few seconds or pick a video; the first 3 seconds become a looping polaroid with a LIVE badge (shrunk to ~540px, usually under 1 MB). It moves on the board and in feed posts; thumbnails and story images use a still frame. Browsers can't read the moving part of an iPhone Live Photo, so use a video (or "Save as Video" in Photos).
- **✦ AI arrange:** add → photos → *ai arrange*. Pick up to 8 photos and an optional vibe; Claude (Sonnet 5.5, via the `ai-arrange` edge function) looks at the photos and designs the board: frames, a photobooth strip for similar shots, a headline, a short note and matching stickers. Everything it suggests is checked against the real catalog before it's placed, and there's an undo. Each person gets 20 AI boards a day (`AI_DAILY_LIMIT`). Without an API key it falls back to a built-in layout.
- **Share to Instagram story:** the ◎ story button on a board, "share" on a post, or the button on a recap makes a 1080×1920 image. On a phone the share menu opens straight to Instagram → Story.
- **Invites (Clubhouse-style):** everyone gets 5 personal invites (me → invite friends). An invite link shows who invited you on the sign-up screen; accepting it makes you follow each other, and profiles show "invited by @…". Board owners can share a link that adds people straight to a shared board (up to 25 people, 30 days).
- **Monthly recaps:** a calendar of the month's boards with stats and an AI-written one-liner, shareable as a story. Linked from the days list, the profile, and a banner on home during the first week of each month.
- **Safety:** diaries are private unless posted. Posts, comments and profiles can be reported; reports land in the `reports` table (Supabase → Table Editor) for you to review.

```
public/index.html      the page
public/style.css       the look (silver board, papers, magnets)
public/app.js          the board: dragging, adding, saving
public/stickers.js     sticker, frame and clip-card library (all SVG)
public/community.js    feed, profiles, posting, comments, together boards
public/store.js        every call to Supabase
public/config.js       Supabase URL + publishable key (safe in the browser)
public/vendor/         bundled supabase-js
supabase/migrations/   database schema, security rules, storage
supabase/functions/    edge functions
```

## Run it on your laptop

```bash
npm run dev
```

Open http://localhost:3000. It talks to the live Supabase project, so use a test account.

## Database tables

| table | what it holds |
| --- | --- |
| `profiles` | one per person: display name, username (later), bio, diary title |
| `boards` | a day board (`kind = day`) or a shared board; background; visibility (private / followers / public) |
| `board_members` | people invited to a board, as editor or viewer |
| `items` | every photo, note, sticker and word-art piece on a board |
| `follows` | who follows whom |
| `posts` | a board shared to the feed, with caption |
| `reactions` | magnets (likes) on posts |
| `comments` | comments on posts |
| `post_tags` | people tagged in posts |
| `reports` | reports filed by people, for you to review |
| `invites`, `invite_redemptions` | invite links and who used them |
| `ai_usage` | AI boards made per person per day (server only) |

## AI setup

The AI needs an Anthropic API key, stored as a Supabase secret (never in the website):

1. Get a key at https://console.anthropic.com (API keys).
2. Supabase → project **karisa** → Edge Functions → Secrets → add `ANTHROPIC_API_KEY`.
3. Optional: `AI_MODEL` (default `claude-sonnet-5-5`) and `AI_DAILY_LIMIT` (default 20).

## Supabase settings to check

- **Authentication → URL Configuration:** Site URL `https://karisa.space`, and add `https://karisa.space/**` and `http://localhost:3000/**` to Redirect URLs.
- **Authentication → Emails:** Supabase's built-in email only sends to members of your Supabase team. Before other people sign up, either connect your own email sender under **SMTP Settings** (for example Resend), or turn off **Confirm email** under Sign In / Providers → Email. Password reset emails also need SMTP.

## Using it

- Every new day starts as an empty board.
- **＋ add** opens one library with tabs:
  - **photos:** pick a frame, then choose photos. Photobooth strip (up to 4 photos, black and white / sepia / faded), polaroid, print, pocket gadget, no border, four digicams (silver, pink, black, champagne), candybar phone, mp3 player, retro TV, vintage ID card (her name goes on the card), felt laced frame, starburst frame, ribbon frame and pop-up window.
  - **write:** guest check, postcard, notebook, receipt, ticket, sticky, typewriter, label tape, plus clip cards (scallop, oval label, ring notebook, dashed card, pink oval), a pop-up message and a "now playing" song card.
  - **words:** word-art text in sticker, outline, chrome, label or plain styles.
  - **stars:** embroidered patches, puffy satin, chrome, faceted, disco, sequin, glitter, holographic, jelly, denim, tiny star scatter, sparkles.
  - **clips & pins:** binder clips in 13 finishes, safety pins, paperclip, push pins, pixel cursor and hand, wax seal.
  - **buttons:** sewing buttons in solid colours, gingham, polka, heart, flower, daisy, star and bunny shapes.
  - **charms:** glazed bows, angel wing, clover, moon, key, butterfly, fish, hearts, flowers, cherries.
  - **classics:** the original felt puzzle pieces, spiral, chrome star/heart, pin buttons and magnets.
- **Fonts and ink:** every note, caption and word-art piece has a font picker (18 fonts: handwriting, script, serif, typewriter, pixel, bubble) and ink colours.
- To change a photo's frame or a note's paper later, select it and tap the frame/paper button in the bar.
- **◐ board**: silver, gunmetal, pearl or rose metal.
- Tap something to select it. **Drag** to move, drag the **↻ handle** to resize and rotate, or **pinch and twist with two fingers** on a phone. Double-tap a note to write on it.
- The bar changes when something is selected: change photo style (polaroid / print / bare / pocket gadget), black and white, photobooth tone, caption, magnet or tape, paper type, front, back, copy, delete (with undo).
- **‹ ›** moves between days. **days** lists every day she's pinned something, with a photo preview.
- Changes save automatically about a second after she stops moving things.

## Good next steps

- **Password reset:** needs an email service (e.g. Resend) plugged into Better Auth's `sendResetPassword`.
- **Sign in with Google/Apple:** Better Auth supports these with a few lines in `server.js` plus keys from each provider.
- **Export a day as an image** to post on Instagram.
