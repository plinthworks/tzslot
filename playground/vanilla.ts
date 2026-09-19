/**
 * The page without a framework. Nothing here imports Angular: if this renders,
 * @tzslot/dom stands on its own, which is the promise it makes.
 *
 * Exported rather than run on import, so a test can mount it — the same lesson
 * as the Angular playground, whose page once failed to start unseen.
 */
import { createCalendar, createDateField, createDateTimeRange } from '@tzslot/dom';
import { Temporal } from '@tzslot/core';
import '../packages/theme/tzslot.css';
import '../packages/theme/contrast.css';

const paris = (iso: string) =>
  Temporal.PlainDateTime.from(iso)
    .toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' })
    .toInstant();

export function mountVanilla(doc: Document): void {
  const $ = (id: string) => doc.getElementById(id)!;

  createCalendar($('calendar'), {
    locale: 'en-GB',
    onChange: (day) => ($('calendar-out').textContent = day?.toString() ?? 'nothing chosen'),
  });

  createDateField($('field'), {
    locale: 'en-GB',
    onChange: (day) => ($('field-out').textContent = day?.toString() ?? 'nothing chosen'),
  });

  createDateTimeRange($('interval'), {
    timeZone: 'Europe/Paris',
    stepMinutes: 60,
    locale: 'en-GB',
    value: { start: paris('2026-10-24T23:00'), end: paris('2026-10-25T05:00') },
  });
}
