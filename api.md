# API Integration Specification: Extension Team

All protected routes require an `Authorization: Bearer <token>` header. The `/auth/login` endpoint returns this token, which must be stored by the extension and used in all subsequent requests to identify the user and enforce data ownership.

---

## Authentication Endpoints (`/auth`)

### POST /auth/signin

Create a new user account.

* **Request Body (JSON):**

```ts
{
  email: string;
  username: string;
  password: string;
}

```

* **Response (201 Created):**

```ts
{
  status: "created";
  user_id: string;
}

```

### POST /auth/login

Authenticate a user and retrieve a session token.

* **Request Body (JSON):**

```ts
{
  identifier: string; // Can be username or email
  password: string;
}

```

* **Response (200 OK):**

```ts
{
  token: string;
  expires_at: string; // ISO timestamp
}

```

### GET /auth/me

Validate the active token and retrieve profile details. Use this endpoint when the extension initializes to verify if the current session is still valid.

* **Response (200 OK):**

```ts
{
  user_id: string;
  email: string;
  username: string;
}

```

### POST /auth/logout

Revoke the active session token.

* **Request Headers / Body:**
* Can accept the token via standard `Authorization: Bearer <token>` header, OR
* Via JSON Body: `{ "token": string }`


* **Response (200 OK):** Token successfully revoked.
* **Response (404 Not Found):** Token does not exist or is already invalid.

---

## Upload Workflow (`/upload`)

### POST /upload/inspect

Preflight helper for URL/link-based processing. Analyzes a source link to extract platform metadata before the actual upload occurs. Use this to auto-fill metadata fields in the extension UI.

* **Request Body (JSON):**

```ts
{
  source_url: string;
}

```

* **Response (200 OK):**

```ts
{
  platform: string;
  platform_domain: string;
  channel: string;
  channel_identifier: string;
  video_id: string;
  upload_method: string;
}

```

### POST /upload

Upload a raw media asset (image, video, or audio). This route handles deduplication automatically based on file hash.

* **Request Payload:** `multipart/form-data`
* `image` OR `audio` OR `media` (File binary, exactly one required)
* `source_url` (String, optional)
* `channel` (String, optional)
* `platform_domain` (String, optional)
* `channel_identifier` (String, optional)
* `upload_method` (String, optional)
* `posted_time` OR `time_posted` (String/Timestamp, optional)


* **Scenario A: File hash already exists (De-duplication short-circuit)**
* **Response (200 OK):**



```ts
{
  status: "exact_match";
  media_id: string;
  filename: string;
  metadata: Record<string, any>;
}

```

* **Scenario B: New unique file upload (Queued for processing)**
* **Response (202 Accepted):** The extension must begin polling `/media/:id` or `/media/user` to check when processing concludes.



```ts
{
  status: "accepted";
  message: string; // e.g., "Upload was queued"
  job_id: string;
  media_id: string;
}

```

---

## Personal Upload Management (`/media`)

### GET /media/user

List the authenticated user's uploaded assets. Returns up to 100 items, sorted by `upload_date` in descending order.

* **Response (200 OK):**

```ts
{
  media: Array<{
    id: string;
    filename: string;
    media_type: "image" | "video" | "audio";
    source_url: string | null;
    channel: string | null;
    status: "processing" | "ready"; // "processing" means vector embedding is pending
  }>;
}

```

### GET /media/:id

Fetch the metadata of a specific upload. Use this route to poll after receiving a 202 status from `POST /upload`.

* **Response (200 OK):** Item exists.

```ts
{
  media_id: string;
  filename: string;
  media_type: "image" | "video" | "audio";
  source_url: string | null;
  channel: string | null;
  platform_domain: string | null;
  status: "processing" | "ready";
}

```

* **Response (404 Not Found):** Media node is not generated yet.

```ts
{
  media: null;
}

```

---

## Similarity, Previews, and Relationships

### GET /media/:id/similar

Retrieve items in the database matching or similar to the targeted upload. Use this endpoint to populate the extension UI's "similar content" panel.

* **Response (200 OK):**

```ts
{
  media_id: string;
  matches: Array<{
    id: string;
    similarity: number;
    raw_similarity: number;
    similarity_type: string;
    forensic_agreement: boolean;
    status: string;
    dimension_scores: Record<string, number>;
    frame_match_seconds?: number; // Video targets only
    frame_index?: number;         // Video targets only
  }>;
}

```

### GET /media/:id/get

Streams the original media binary payload directly for inline player rendering or preview.

* **Response (200 OK):** Binary stream content (`image/*`, `video/*`, `audio/*`). **Not JSON.**

### GET /media/:id/get/:frame

Streams a single sampled thumbnail frame from a target video asset.

* **Response (200 OK):** Binary image stream.

### GET /images/:id/relationship/:other_id

Inspect detailed alignment data mapping why two distinct media nodes are marked as related. (Optional for basic features, but helpful for deep-dive UI insights).

* **Response (200 OK):**

```ts
{
  raw_similarity: number;
  weight: number;
  forensic_agreement: boolean;
  rel_type: string;
  dimension_scores: Record<string, number>;
  media_types: {
    source: string;
    target: string;
  };
  frame_indices?: {
    source_frame?: number;
    target_frame?: number;
  };
}

```
