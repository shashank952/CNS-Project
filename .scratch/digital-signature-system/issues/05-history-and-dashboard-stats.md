# 05: Activity History and dashboard statistics

**What to build:** A user reviews Operation Records newest first, filters them by operation type and result, clears them after confirmation, and sees the dashboard's four summary counts and recent activity derived from those same records.

**Blocked by:** 03 (sign a Document), 04 (verify a Document)

**Status:** done

- [x] `GET /api/history` returns newest-first records and honors the `operation` and `result` filters; unknown filter values return `invalid_filter`.
- [x] `DELETE /api/history` hard-deletes all records and returns the deleted count.
- [x] `GET /api/dashboard/stats` returns the four counts as SQL aggregates plus the ten newest records.
- [x] The dashboard cards, recent activity, empty, loading, and backend-unavailable states use the stats API.
- [x] The History page provides a table, both filters, refresh, a clear action with confirmation, and an empty state.
- [x] Tests cover persistence, filtering, clearing, statistics recomputed after signing and verification, and the page interactions.
