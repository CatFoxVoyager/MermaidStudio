/**
 * codeViewRegistry ownership rule: a LATE unregister from an unmounting
 * host (e.g. the mobile editor tearing down after the desktop editor has
 * already mounted, across a layout switch) must not clear the registration
 * of a different, still-live accessor. Unregistration only takes effect for
 * the accessor that currently owns the slot.
 */

import { describe, it, expect } from 'vitest';
import { registerCodeViewAccessor, unregisterCodeViewAccessor, getCodeView } from '../codeViewRegistry';

describe('codeViewRegistry unregister ownership', () => {
  it('keeps the current accessor when a stale host unregisters', () => {
    const accessorA = () => ({ view: 'A' } as never);
    const accessorB = () => ({ view: 'B' } as never);

    registerCodeViewAccessor(accessorA);
    registerCodeViewAccessor(accessorB);

    unregisterCodeViewAccessor(accessorA); // late teardown of the old host
    expect(getCodeView()).not.toBeNull();

    unregisterCodeViewAccessor(accessorB); // owner teardown clears the slot
    expect(getCodeView()).toBeNull();
  });
});
