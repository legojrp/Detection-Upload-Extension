All protected routes use Authorization: Bearer <token>. Login returns the token, and everything else uses that token to identify the user and enforce ownership.

**Auth**
- POST /auth/signin: create a new account. Send JSON with email, username, password. Returns 201 with status: created and user_id.
- POST /auth/login: authenticate with JSON containing identifier and password. identifier can be username or email. Returns 200 with token and expires_at.
- GET /auth/me: validate the current token and fetch the signed-in user. Returns 200 with user_id, email, username. Use this when the extension opens to confirm the session is still valid.
- POST /auth/logout: revoke a token. Send the token in the Authorization header or as JSON { token }. Returns 200 when logged out, 404 if the token does not exist.

**Upload flow**
- POST /upload/inspect: preflight helper for link-based uploads. Send JSON { source_url }. It returns platform hints such as platform, platform_domain, channel, channel_identifier, video_id, and upload_method. This is useful for auto-filling metadata before the user uploads.
- POST /upload: upload the actual image, video, or audio file. Use multipart form-data with one file field named image, audio, or media, plus optional fields source_url, channel, platform_domain, channel_identifier, upload_method, posted_time, or time_posted. The current behavior is:
  - if the file hash already exists, it short-circuits with 200 and exact_match details
  - if it is a new upload, it returns 202 with status: accepted, job_id, media_id, and a message saying the upload was queued
  - the extension should then poll /media/:id or /media/user to see when processing finishes

**Personal uploads**
- GET /media/user: list the signed-in user’s uploads. Returns { media: [...] } with up to 100 items, ordered by upload_date descending. Each item includes id, filename, media_type, metadata fields like source_url and channel, and status, which is processing when embedding is still pending and ready otherwise.
- GET /media/:id: fetch one upload’s metadata. This is the route to poll after POST /upload. Returns media_id, filename, media_type, and metadata fields. If the media node is not there yet, it returns 404 with media: null.

**Similarity and preview**
- GET /media/:id/similar: get similar media for a given uploaded item. This is the route the extension should use to show “similar videos from this piece of media.” It returns { media_id, matches: [...] }. Each match can include similarity, raw_similarity, similarity_type, forensic_agreement, status, dimension_scores, and, for video targets, frame_match_seconds and frame_index.
- GET /media/:id/get: stream the original media file for preview or playback. This returns binary content, not JSON.
- GET /media/:id/get/:frame: stream a sampled frame from a video. This is useful for thumbnails or frame preview.
- GET /images/:id/relationship/:other_id: fetch the stored relationship between two media items. This is not required for basic upload/search flows, but it is useful if the extension wants to show why two items are related. It returns raw_similarity, weight, forensic_agreement, rel_type, dimension_scores, media types, and frame indices when available.

If you want, I can turn this into a compact integration spec for the extension team, with example requests and response shapes in TypeScript.
