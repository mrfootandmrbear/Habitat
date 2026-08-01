# Run Habitat on your Mac (no AI)

These steps start Habitat in a browser from Terminal. You only need to do this when you want to play the app yourself.

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

---

**Next time:** skip step 3 unless you just updated the project. Run step 2, then step 4.
