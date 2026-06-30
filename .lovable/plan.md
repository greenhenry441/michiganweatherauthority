# MWA — Settings, Push, and Big Feature Drop

## Part 1 — Settings actually work

Every toggle in `/settings` becomes a real preference persisted to the `user_preferences` table (new) and applied app-wide.

- **Notifications**
  - Master push on/off (existing).
  - Severity filters: Extreme / Severe / Moderate / Minor checkboxes — server filters before sending.
  - County filter: multi-select MI counties (alerts not touching selected counties are skipped).
  - Quiet hours: start/end time + timezone; alerts during quiet hours go silent unless `severity = extreme`.
  - Alert-type filter: tornado, severe T-storm, flood, winter, marine, etc.
- **Display**
  - Theme picker (noir / aurora / og) — already exists, verify it persists.
  - Units: °F/°C, mph/kph, in/mm, 12/24h clock — wire into HomeRadar, Forecasts, HourlyMeteogram, AlertCard.
  - Map default: radar / alerts / lightning / satellite.
- **Account**
  - Display name + avatar upload (`avatars` bucket).
  - Email change (Supabase auth update).
  - Password change.
  - MFA enrollment (existing component — verify).
  - Delete account (server fn → admin delete user).
- **Test push button**: sends a real notification to the current device only.

## Part 2 — Push notifications work

- Add `/api/public/push/test` server route (signed-in caller verified by bearer).
- Server reads `user_preferences` per subscription and filters: severity, county overlap, quiet hours, type.
- Fix subscription upsert to require `authenticated` (already done) and write `prefs_user_id`.
- Add cron-driven sweep that retries failed pushes and prunes 410/404 endpoints.
- Settings page shows: permission state, registration state, last test result, subscription count.

## Part 3 — New features

### Personal weather
- **Saved locations**: home + favorites (geocoded). Home city drives the index page hero.
- **Custom alert thresholds**: notify me when temp < X, wind > Y, etc. — evaluated by a 5-min cron against Open-Meteo.
- **Daily briefing**: opt-in 7am push with today's high/low/precip + active alerts for home city.

### Severe-weather tools
- **Lightning radius alerts**: notify when a strike lands within N miles of home (uses existing LightningPanel data source).
- **Tornado tracker page**: live MI tornado warnings with polygon map, time-to-impact for saved locations.
- **Storm chase mode**: full-screen dark dashboard — radar + lightning + warnings + reports, auto-refresh 30s.
- **Spotter reports**: signed-in users submit ground truth (hail size, wind damage, funnel sighted) with photo + auto-geolocation.

### Social / community
- **Storm report feed** at `/reports`: list + map of recent user reports.
- **Photo uploads** with Supabase Storage (`storm-photos` bucket, public-read).
- **Reactions** (👍 confirmed, 👎 doubtful) + comment thread per report.
- **Leaderboard**: top reporters this month by confirmed reports.

### Command tools (admin only)
- **Alert composer**: rich editor + severity + areas (county multi-select on a map) + send-now / schedule.
- **Broadcast scheduler**: queue alerts for future ISO time, processed by cron.
- **Analytics dashboard**: DAU, push delivery rate, click-through, top counties, alerts/day chart.
- **Audit log viewer**: every admin action (already partially logged) shown with filters.
- **Subscriber explorer**: list push subs with device, last-seen, prefs, manual revoke.

## Technical notes

### Database (one migration)
- `user_preferences` (user_id PK, units jsonb, notify_severity text[], notify_counties text[], notify_types text[], quiet_start time, quiet_end time, quiet_tz text, daily_briefing bool, lightning_radius_mi int, home_lat/home_lon, default_map text)
- `saved_locations` (id, user_id, label, lat, lon, is_home)
- `alert_thresholds` (id, user_id, metric, op, value, location_id)
- `spotter_reports` (id, user_id, kind, value, lat, lon, photo_url, notes, created_at, confirmed_count, doubt_count)
- `report_reactions` (id, report_id, user_id, kind UNIQUE per user/report)
- `report_comments` (id, report_id, user_id, body)
- `scheduled_alerts` (id, payload jsonb, send_at, sent_at, status)
- `admin_audit_log` exists — add UI only.
- `push_delivery_log` (id, alert_id, sub_id, ok, status_code, created_at)
- All with strict RLS; admin tables gated by `has_role(uid, 'admin')`.
- Storage buckets: `avatars` (public), `storm-photos` (public).

### Server
- New `*.functions.ts`: `preferences`, `saved-locations`, `thresholds`, `spotter-reports`, `scheduled-alerts`, `analytics`, `account`.
- New `/api/public/push/test`, `/api/public/cron/check-thresholds`, `/api/public/cron/dispatch-scheduled`, `/api/public/cron/daily-briefing`, `/api/public/cron/lightning-watch`.
- Update `admin-alerts.functions.ts` to honor per-user prefs and write `push_delivery_log`.
- pg_cron jobs: every 5 min (thresholds + scheduled), every 60s (lightning), 7am local (briefing), nightly prune.

### Frontend
- Rebuild `/settings` with tabs (Notifications, Display, Account, Devices, Danger).
- New routes: `/reports`, `/reports/$id`, `/chase`, `/tornado`, `/command/composer`, `/command/scheduler`, `/command/analytics`, `/command/audit`, `/command/subscribers`.
- New `usePreferences()` hook and `<UnitsContext>` provider for app-wide unit formatting.
- New `<CountyMultiSelect>`, `<LocationSearch>` (Open-Meteo geocoder), `<PhotoUpload>`.

### Verification
- Send-test-push button proves end-to-end delivery for the current user/device.
- Each settings tab shows a live "Last saved: …" indicator and refetches on save.
- Cron health card on `/command/analytics` shows last run + success of each job.

## Risk / scope

This is a very large batch. Estimated 1 big migration + ~25 new files + ~10 edits. I'll ship in this order so the app stays usable at each step: migration → preferences + units → push test + filtering → saved locations → spotter reports → command tools → cron jobs → chase mode polish.