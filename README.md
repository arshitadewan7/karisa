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

```
public/index.html      the page
public/style.css       the look (silver board, papers, magnets)
public/app.js          the board: dragging, adding, saving
public/stickers.js     sticker, frame and clip-card library (all SVG)
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
| `follows` | who follows whom (for the community features) |

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
