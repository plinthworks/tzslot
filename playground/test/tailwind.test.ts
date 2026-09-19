import { describe, it, expect, beforeEach } from 'vitest';
import { mountTailwind } from '../tailwind.js';

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  document.body.innerHTML = `
    <button id="dark-toggle">Dark</button>
    <div id="day"></div>
    <div id="slots"></div><p id="slots-hint"></p>
    <p id="summary"></p><button id="confirm" disabled></button>`;
  mountTailwind(document);
});

describe('the Tailwind example', () => {
  it('lists the times of the day chosen, lunch taken, and enables Confirm', () => {
    const day = document.querySelector<HTMLButtonElement>('.tz-cal__day:not(:disabled):not(.tz-cal__day--outside)')!;
    day.click();
    const slots = Array.from(document.querySelectorAll<HTMLButtonElement>('.tz-slots__slot'));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.find((b) => b.textContent!.startsWith('12:00'))!.disabled).toBe(true);

    slots[0]!.click();
    expect(document.querySelector<HTMLButtonElement>('#confirm')!.disabled).toBe(false);
  });

  it('the toggle puts .dark on the document, which the bridge maps to the widgets', () => {
    document.getElementById('dark-toggle')!.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
