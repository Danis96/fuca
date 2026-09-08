# Post-game photos

Post-match images can be uploaded directly from a completed match. They are stored
in the existing ImageKit account under the `post-game` folder and their URL is
saved on the Firestore match document.

This directory remains available as a zero-config local fallback. Put local
post-match images here when needed.

By default, a completed match looks for:

`/assets/post-game/{matchId}.jpg`

An admin can also open the completed match and enter a different filename such as
`2026-09-08-team-photo.webp`. That file must also live in this directory.

Supported formats depend on the browser; JPG, PNG, and WebP are recommended.
