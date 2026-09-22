import { describe, it, expect, afterEach } from 'vitest';
import { createRangeField } from '../src/range-field.js';

/**
 * Two things a screen decides at runtime: whether the shortcuts are on show,
 * and whether the reader gets to read and change the step of the arrows.
 *
 * Hiding the column used to mean `presets: []`, which empties the list — and
 * then something else has to remember what was in it to put it back.
 */
let field: ReturnType<typeof createRangeField> | null = null;

const mount = (options: Record<string, unknown>) => {
  const host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', ...options });
  field.open();
  return { host, field };
};

const column = () => document.querySelector<HTMLElement>('.tz-rangefield__presets');
const stepButton = () => document.querySelector<HTMLElement>('.tz-field__step');

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('showPresets', () => {
  it('shows the column by default', () => {
    mount({ presets: ['today', 'thisWeek'] });
    expect(column()?.hidden).toBe(false);
    expect(column()!.querySelectorAll('button').length).toBe(2);
  });

  it('hides it without emptying the list', () => {
    const { field: f } = mount({ presets: ['today', 'thisWeek'], showPresets: false });
    expect(column()?.hidden).toBe(true);
    // The list is still there, which is the whole point.
    expect(column()!.querySelectorAll('button').length).toBe(2);
    f.update({ showPresets: true });
    expect(column()?.hidden).toBe(false);
  });

  it('the attribute is obeyed — display on the element would beat it', () => {
    // jsdom lays nothing out, so the rule itself is what can be asserted. The
    // column is display:flex; without this it stayed on screen, hidden or not.
    mount({ presets: ['today'], showPresets: false });
    const css = [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot="rangefield"]')]
      .map((sheet) => sheet.textContent ?? '')
      .join('');
    expect(css).toContain('.tz-rangefield__presets[hidden] { display: none; }');
  });

  it('draws no column at all when there are no shortcuts', () => {
    mount({ presets: [] });
    expect(column()).toBeNull();
  });
});

describe('showStep', () => {
  it('reads the step, and takes a press, when the screen offers a list', () => {
    mount({ shift: [{ step: { days: 7 }, label: 'a week' }, { step: { days: 1 }, label: '1 day' }] });
    expect(stepButton()!.hidden).toBe(false);
    expect(stepButton()!.textContent).toBe('a week');
    expect((stepButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('a list of one reads the step and does not take a press', () => {
    mount({ shift: [{ step: { minutes: 15 }, label: '15 min' }] });
    expect(stepButton()!.hidden).toBe(false);
    expect(stepButton()!.textContent).toBe('15 min');
    expect((stepButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('false hides it even then', () => {
    mount({ shift: [{ step: { minutes: 15 }, label: '15 min' }], showStep: false });
    expect(stepButton()!.hidden).toBe(true);
  });

  it('a step given as a plain duration has no label, so nothing is shown', () => {
    mount({ shift: { minutes: 15 } });
    expect(stepButton()!.hidden).toBe(true);
  });
});
