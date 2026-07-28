export type TimeRate = "pause" | "1x" | "4x" | "16x";

const TIME_SCALE: Record<TimeRate, number> = {
  pause: 0,
  "1x": 1,
  "4x": 4,
  "16x": 16,
};

export function mountControls(
  parent: HTMLElement,
  initial: { raining: boolean; timeRate: TimeRate },
  handlers: {
    onToggleRain: () => void;
    onReset: () => void;
    onTimeRate: (rate: TimeRate) => void;
  },
): {
  setRaining: (v: boolean) => void;
  setTimeRate: (rate: TimeRate) => void;
  setStatus: (text: string) => void;
} {
  const bar = document.createElement("div");
  bar.id = "controls";

  const rainBtn = document.createElement("button");
  rainBtn.type = "button";
  const syncRainLabel = (raining: boolean): void => {
    rainBtn.textContent = raining ? "Rain: on" : "Rain: off";
  };
  syncRainLabel(initial.raining);
  rainBtn.addEventListener("click", handlers.onToggleRain);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Reset water";
  resetBtn.addEventListener("click", handlers.onReset);

  const timeGroup = document.createElement("div");
  timeGroup.id = "time-rates";
  timeGroup.setAttribute("role", "group");
  timeGroup.setAttribute("aria-label", "Simulation time rate");

  const rates: TimeRate[] = ["pause", "1x", "4x", "16x"];
  const rateButtons = new Map<TimeRate, HTMLButtonElement>();

  for (const rate of rates) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = rate === "pause" ? "Pause" : rate;
    btn.addEventListener("click", () => handlers.onTimeRate(rate));
    timeGroup.appendChild(btn);
    rateButtons.set(rate, btn);
  }

  const syncTimeRate = (rate: TimeRate): void => {
    for (const [key, btn] of rateButtons) {
      btn.classList.toggle("active", key === rate);
    }
  };
  syncTimeRate(initial.timeRate);

  const status = document.createElement("div");
  status.id = "status";
  status.textContent = "Habitat · Slice 2";

  bar.append(rainBtn, resetBtn, timeGroup, status);
  parent.appendChild(bar);

  return {
    setRaining: syncRainLabel,
    setTimeRate: syncTimeRate,
    setStatus: (text: string) => {
      status.textContent = text;
    },
  };
}

export { TIME_SCALE };
