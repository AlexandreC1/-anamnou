import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ResourceForm, TextField } from './ClassCommon';

it('keeps failed edits, locks submitted fields while saving, and clears stale success after edits', async () => {
  let rejectSave!: (error: Error) => void;
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(
      () =>
        new Promise<Response>((_, reject) => {
          rejectSave = reject;
        }),
    )
    .mockResolvedValueOnce(new Response('{}'));
  const user = userEvent.setup();
  render(
    <ResourceForm
      path="/schools"
      label="Save"
      locale="en"
      body={(data) => ({ name: data.get('name') })}
    >
      <TextField label="Name" name="name" />
    </ResourceForm>,
  );
  const input = screen.getByLabelText('Name');
  await user.type(input, 'Our school');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(input).toBeDisabled();
  expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  await act(async () => rejectSave(new Error('offline')));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(input).toBeEnabled();
  expect(input).toHaveValue('Our school');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('status')).toBeVisible();
  await user.type(input, ' edited');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
  request.mockRestore();
});
