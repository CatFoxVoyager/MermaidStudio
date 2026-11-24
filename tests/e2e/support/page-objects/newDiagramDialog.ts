import { Page } from '@playwright/test';

/**
 * Completes the new-diagram naming dialog: accepts it with the proposed
 * default name. Every creation path (toolbar button, empty state, template
 * pick) now opens the dialog first — `TopBar.newDiagram()` and
 * `TemplatesPage.selectTemplate()` both call this, so keep the sequence in
 * exactly one place.
 *
 * Precondition: the dialog was just triggered; the name field appears
 * asynchronously. Steps: wait for the field (10 s), accept the default name,
 * confirm, wait for the dialog to be gone.
 */
export async function completeNewDiagramDialog(page: Page): Promise<void> {
  const nameField = page.getByTestId('new-diagram-name');
  await nameField.waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('new-diagram-default-name').click();
  await page.getByTestId('new-diagram-create').click();
  await nameField.waitFor({ state: 'detached', timeout: 10000 });
}
