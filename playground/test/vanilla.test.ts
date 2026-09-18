import { describe, it, expect, beforeEach } from 'vitest';
import { mountVanilla } from '../vanilla.js';

/** The framework-free page, mounted into a document with its three holes. */
beforeEach(() => {
  document.body.innerHTML = `
    <div id="calendar"></div><output id="calendar-out"></output>
    <div id="field"></div><output id="field-out"></output>
    <div id="interval"></div>`;
  mountVanilla(document);
});

describe('the page without Angular', () => {
  it('draws a calendar, a field and an interval', () => {
    expect(document.querySelectorAll('#calendar .tz-cal__day')).toHaveLength(42);
    expect(document.querySelector('#field .tz-field__trigger')).not.toBeNull();
    expect(document.querySelector('#interval .tz-dtr__summary')!.textContent).toBe('7h');
  });

  it('reports a choice without any framework in between', () => {
    const day = document.querySelector<HTMLButtonElement>('#calendar .tz-cal__day:not(.tz-cal__day--outside)')!;
    day.click();
    expect(document.getElementById('calendar-out')!.textContent).toBe(day.dataset['date']);
  });
});
