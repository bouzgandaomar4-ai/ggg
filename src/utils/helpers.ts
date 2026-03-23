export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function updateLoadingStatus(text: string): void {
  const status = document.getElementById('loading-status');
  if (status) status.textContent = text;
}

export function setButtonsVisible(visible: boolean): void {
  const container = document.getElementById('path-buttons');
  if (container) {
    container.style.opacity = visible ? '1' : '0';
    container.style.pointerEvents = visible ? 'auto' : 'none';
  }
}

export function showBackButton(show: boolean): void {
  const btn = document.getElementById('back-btn');
  if (btn) {
    if (show) {
      btn.classList.remove('opacity-0', 'pointer-events-none');
      btn.classList.add('opacity-100', 'pointer-events-auto');
    } else {
      btn.classList.remove('opacity-100', 'pointer-events-auto');
      btn.classList.add('opacity-0', 'pointer-events-none');
    }
  }
}
