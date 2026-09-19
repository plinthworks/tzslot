/**
 * The Tailwind example's behaviour: a day, then the times on it, then a
 * summary. Plain @tzslot/dom — the page's look is Tailwind, the widgets' look
 * is the theme bridged to Tailwind's colours.
 */
import { createCalendar, createTimeSlots } from '@tzslot/dom';

const ZONE = 'Europe/Paris';

export function mountTailwind(doc: Document): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => doc.getElementById(id) as T;
  const summary = $('summary');
  const confirm = $<HTMLButtonElement>('confirm');
  const hint = $('slots-hint');

  const slots = createTimeSlots($('slots'), {
    timeZone: ZONE,
    stepMinutes: 30,
    minTime: '09:00',
    maxTime: '17:30',
    // Lunch is booked.
    isDisabled: (slot) => slot.time.hour === 12,
    onChange: (instant) => {
      confirm.disabled = instant === null;
      summary.textContent = instant
        ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: ZONE }).format(
            new Date(instant.epochMilliseconds),
          )
        : 'Choose a time.';
    },
  });

  createCalendar($('day'), {
    locale: 'en-GB',
    // Closed at weekends.
    isDateDisabled: (day) => day.dayOfWeek > 5,
    onChange: (day) => {
      hint.hidden = day !== null;
      slots.update({ date: day, value: null });
      confirm.disabled = true;
      summary.textContent = day ? 'Choose a time.' : 'Nothing chosen yet.';
    },
  });

  const toggle = $('dark-toggle');
  toggle.addEventListener('click', () => {
    const dark = doc.documentElement.classList.toggle('dark');
    toggle.textContent = dark ? 'Light' : 'Dark';
  });
}
