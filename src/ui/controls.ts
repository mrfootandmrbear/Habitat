export function mountControls(
  parent: HTMLElement,
  initial: { raining: boolean },
  handlers: { onToggleRain: () => void; onReset: () => void },
): { setRaining: (v: boolean) => void; setStatus: (text: string) => void } {
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

  const status = document.createElement("div");
  status.id = "status";
  status.textContent = "Habitat · Slice 1";

  bar.append(rainBtn, resetBtn, status);
  parent.appendChild(bar);

  return {
    setRaining: syncRainLabel,
    setStatus: (text: string) => {
      status.textContent = text;
    },
  };
}
