# Template selection

The schedule editor searches active templates by name on the server. Scrolling
or **Show more** loads another page; a failed page can be retried without losing
the current options. Changing the search cancels old requests and restarts the list.

The configured default comes from schedule settings and is checked by exact name,
so it can be selected even when it is outside the first page. A new schedule uses
it only when it exists and is active. Otherwise, choose an active template explicitly.
There is no automatic replacement with the first option.

Editing preserves the saved name independently of the loaded options. An inactive
or removed template stays visible with an explanation but cannot be selected or
saved. A failed lookup is shown as unavailable, not as a missing record. Once a
template is chosen, its exact lookup must confirm it is active before saving.
The backend checks it again because activity can change while the form is open.

Creating, editing and resuming schedules require an active template. A standalone
pause action and deletion remain available when the catalog is unavailable; a
pause combined with form edits still requires template validation.

During the current rollout, core runtime still reads TOML. A catalog record can
therefore be selectable here before its name is allowed for new core sessions.
