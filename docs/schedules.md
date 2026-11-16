# Schedule controls

The schedule list opens with the Active filter. Choose Paused or All to change
the view. The URL preserves the filter across reloads, links and pagination.
All is stored explicitly as `status=all`, while the API request omits the status
filter. Owner and shared-only filters work with each activity selection.

Open a schedule to edit, pause, resume or run it. List rows show the existing
status and last result, with no management buttons.

**Run now** requests one execution with the saved schedule settings. Paused
schedules can run without enabling their cron. The command does not change the
next scheduled time or reset reusable context. Permissions match editing.
An unfinished occurrence prevents a new manual run.

The acceptance notification means Space stored the command. History refreshes
automatically and marks manual occurrences. Their date is the request time,
not the time execution began. A manual run after a failure creates a new history
entry. It does not repeat an earlier reporting period.

If the request fails, retry in the same open card to reuse its idempotency key.
Reloading or leaving the card discards that pending key. Check history before
requesting another run after reopening the card.

## Profiles and templates

Profile choices use server-side search and pagination. The configured default is
resolved by its exact name, even when it is outside the first page. A profile is
available only while both it and its LLM account are active. Existing choices
stay visible when unavailable or removed. Select an available profile and an
active template before saving or resuming. Pausing and deleting remain available.

Moving a profile to another account in Orpheus changes new sessions. An existing
reusable session keeps its original account and execution settings. Use **Reset
context** when the next run should use the updated profile. Model overrides remain
part of the schedule.
