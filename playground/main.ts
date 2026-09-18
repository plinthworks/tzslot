import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Demo } from './demo.js';

// The optional theme, imported the way a consumer would import it. Without it
// the components still work and look plain — which is the point of it being a
// separate package.
import '../packages/theme/tzslot.css';

/**
 * Bootstrap only.
 *
 * The component lives in demo.ts so a test can mount it. A page that fails to
 * start was the one failure the component tests could not see, because
 * importing this file used to start the application as a side effect.
 */
bootstrapApplication(Demo, { providers: [provideZonelessChangeDetection()] }).catch((error) =>
  console.error(error),
);
