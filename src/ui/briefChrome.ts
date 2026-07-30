/**
 * Scenario brief chrome (Slice 15) — presentation over ScenarioSession.
 * Observer only; does not resolve G-007.
 */

export type BriefChromeState = {
  active: boolean;
  brief: string;
  currentlySatisfied: boolean;
  achieved: boolean;
  samplesTaken: number;
};

/** DOM affordance: brief + satisfied / not-yet (no victory screen). */
export function mountBriefChrome(parent: HTMLElement): {
  setState: (state: BriefChromeState) => void;
  root: HTMLElement;
} {
  const root = document.createElement("div");
  root.id = "scenario-brief";
  root.setAttribute("aria-label", "Scenario brief");
  root.hidden = true;

  const title = document.createElement("div");
  title.className = "scenario-brief-title";
  title.textContent = "Brief";

  const body = document.createElement("div");
  body.className = "scenario-brief-body";

  const status = document.createElement("div");
  status.className = "scenario-brief-status";
  status.setAttribute("aria-live", "polite");

  root.append(title, body, status);
  parent.appendChild(root);

  return {
    root,
    setState(state) {
      root.hidden = !state.active;
      if (!state.active) return;
      body.textContent = state.brief;
      if (state.currentlySatisfied) {
        status.textContent = "Holding — the window is satisfied.";
        status.dataset.satisfied = "true";
      } else if (state.achieved) {
        status.textContent = "Was holding — not currently satisfied.";
        status.dataset.satisfied = "past";
      } else {
        status.textContent = "Not yet — keep the place tending itself.";
        status.dataset.satisfied = "false";
      }
    },
  };
}

/** Tier-P proxy: brief chrome present when scenario active. */
export function briefChromePresent(state: BriefChromeState): boolean {
  return state.active && state.brief.trim().length > 0;
}
