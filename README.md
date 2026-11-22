# magnet diary

A digital photo journal on a brushed silver board. Every day gets its own board. Photos, notes and stickers stick on like magnets and can be dragged, resized and rotated.

- **Accounts:** email and password via [Better Auth](https://www.better-auth.com). Each person only ever sees their own diary.
- **Database:** SQLite (one file). No external database service.
- **Photos:** resized in the browser, then saved on the server. They're only served to the person who uploaded them.

## Run it on your laptop

You need Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create an account. Data goes in `./data/` (the database plus an `uploads/` folder).

## What's in the folder

```
server.js              the backend: auth, days, photos
public/index.html      the page
public/style.css       the look (silver board, papers, magnets)
public/app.js          the board: dragging, notes, stickers, saving
Dockerfile             how the host builds it
```

## Put it on your domain (Railway)

Railway runs the app and keeps the database and photos on a persistent disk (a "volume"). It has a small monthly cost; check their current pricing.

1. **Push this folder to GitHub.** Make a new private repo and push this folder to it. `.gitignore` already keeps `node_modules` and `data` out.
2. **Create the service.** On [railway.com](https://railway.com): New Project → Deploy from GitHub repo → pick the repo. It finds the `Dockerfile` by itself.
3. **Add a volume.** Right-click the service → Attach Volume → set the mount path to `/data`. **Don't skip this.** Without it, every redeploy wipes all accounts and photos.
4. **Set the variables.** In the service's Variables tab:
   - `BETTER_AUTH_SECRET`: a long random string (run `openssl rand -hex 32`, or use Railway's "generate" button)
   - `BETTER_AUTH_URL`: `https://yourdomain.com`
   - `DATA_DIR`: `/data`
   - `NODE_ENV`: `production`
5. **Connect your domain.** Service → Settings → Networking → Custom Domain → enter `yourdomain.com` (and `www.yourdomain.com` if you want it). Railway shows a DNS record. Add it at the place you bought the domain (GoDaddy, Namecheap, Cloudflare, …). HTTPS is set up automatically once DNS updates, usually within minutes, sometimes up to a few hours.
6. **If you use both `www` and the bare domain,** set `BETTER_AUTH_URL` to the one you send people to, and put the other in `TRUSTED_ORIGINS`.

Health check URL: `/healthz`.

### Backups

Everything lives in the `/data` volume: `app.db` plus `uploads/`. Railway can snapshot volumes. Turn on backups in the volume settings, because this is someone's diary.

## Add it to the home screen

On iPhone: open the site in Safari → Share → **Add to Home Screen**. It opens full screen with its own icon, like an app.

## Using it

- Every new day starts as an empty board.
- **＋ add** opens one menu with everything:
  - **Photos:** pick a frame first (vintage photobooth strip, polaroid, print, pocket gadget, no border), then choose photos. A photobooth strip takes up to 4 photos and develops them into one grainy strip in black and white, sepia or faded colour. Polaroids and prints become one framed photo per picture.
  - **Write:** guest check, postcard, notebook, receipt, ticket, sticky, typewriter or label tape. The writing sheet has a **give me a prompt** button for when she doesn't know what to write.
  - **Decorate:** felt puzzle pieces, a chrome spiral, stars, hearts, pin buttons and plain magnets.
- **◐ board**: silver, gunmetal, pearl or rose metal.
- Tap something to select it. **Drag** to move, drag the **↻ handle** to resize and rotate, or **pinch and twist with two fingers** on a phone. Double-tap a note to write on it.
- The bar changes when something is selected: change photo style (polaroid / print / bare / pocket gadget), black and white, photobooth tone, caption, magnet or tape, paper type, front, back, copy, delete (with undo).
- **‹ ›** moves between days. **days** lists every day she's pinned something, with a photo preview.
- Changes save automatically about a second after she stops moving things.

## Good next steps

- **Password reset:** needs an email service (e.g. Resend) plugged into Better Auth's `sendResetPassword`.
- **Sign in with Google/Apple:** Better Auth supports these with a few lines in `server.js` plus keys from each provider.
- **Export a day as an image** to post on Instagram.
