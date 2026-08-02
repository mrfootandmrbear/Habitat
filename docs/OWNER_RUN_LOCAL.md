# Run Habitat (no AI)

## Play on iPad (or any browser) — hosted link

After GitHub Pages is enabled and the deploy workflow has run on `main`, open:

**https://mrfootandmrbear.github.io/Habitat/**

On an iPad: Safari → paste that URL → Go. No download, no Node, no Mac required while playing.

**One-time setup (Mac/GitHub, not on the iPad):**

1. Merge the Pages deploy workflow to `main` (`.github/workflows/deploy-pages.yml`).
2. In the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Wait for the **Deploy GitHub Pages** workflow to finish (Actions tab). Re-runs on every push to `main`, or trigger **Run workflow** manually.

Downloading the repo ZIP onto an iPad will not run the game — iPad Safari needs a hosted build (this) or a Mac serving the app on the same Wi‑Fi.

---

## Run on your Mac (local)

These steps start Habitat in a browser from Terminal. You only need to do this when you want to play from a local checkout.

**One-time prerequisite:** Node.js must be installed (it includes the `npm` command). If Terminal says `command not found: npm`, install Node from [nodejs.org](https://nodejs.org) (LTS), then come back here.

---

1. **Open Terminal**  
   Spotlight (`Cmd + Space`) → type `Terminal` → press Return.

2. **Go to the Habitat folder**  
   Paste this and press Return (change the path if your copy lives somewhere else):

   ```bash
   cd ~/Developer/habitat
   ```

3. **Install dependencies** (first time, or after pulling new code)  
   ```bash
   npm install
   ```  
   This downloads the libraries the app needs into a local `node_modules` folder. When it finishes successfully, the prompt returns with no red error text.

4. **Start the local server**  
   ```bash
   npm run dev
   ```  
   Leave this Terminal window open. Vite (the tool that serves the app) will print a local address — usually:

   ```text
   http://localhost:5173/
   ```

5. **Open that address in your browser**  
   Hold `Cmd` and click the `http://…` line in Terminal, or copy it into Safari/Chrome and press Return. Habitat should load.

6. **When you are done**  
   Click back into the Terminal window and press `Ctrl + C` to stop the server.

### Optional: Mac serves, iPad plays (same Wi‑Fi)

```bash
npx vite --host
```

Open the printed `http://192.168.x.x:5173/` address in Safari on the iPad (same Wi‑Fi as the Mac). Prefer the hosted Pages link above when you do not want the Mac running.

---

**Next time (local):** skip step 3 unless you just updated the project. Run step 2, then step 4.
