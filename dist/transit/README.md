# 搭下一班 · Hong Kong transit ETA

A dependency-free Traditional Chinese mobile transport board. Serve the existing `dist/` directory and open `transit/`. Existing reader files are unchanged. GitHub Pages is already configured to serve `main` at the repository root, so the hosted path is `/demo-app/dist/transit/`.

## Features

- KMB/LWB and Citybus route/terminus search; exact direction, service variant and boarding-stop selection.
- Green minibus lookup by official region (HKI/KLN/NT) and route number, with direction/variant selection.
- All ten MTR Next Train lines; station selection and per-train destination/platform display.
- Up to 24 local favorites; reorder, change stop, remove, manual refresh and 30/60/120-second foreground refresh.
- KMB/LWB stop-name or stop-ID lookup; optional nearby search with local straight-line distance. Geolocation is requested only after an explicit button click. Coordinates are neither saved nor transmitted.
- Light/dark themes, Hong Kong timezone, source timestamps, request timeout, error/offline/stale handling, and an unsaved-storage notice.

Favorites and preferences use distinct transit localStorage keys and do not read the reader's data. Parsed route caches and previous arrivals exist only in memory. The public KMB stop catalogue is also cached in sessionStorage for up to 24 hours, to avoid redownloading the same large list after a tab reload; its source date is shown, and the settings cache-clear button removes it. Static catalogue requests respect the operator's HTTP cache headers. ETA requests use `no-store` and are never saved in the stop catalogue. There is no account, backend, API key, external UI dependency, or third-party asset.

## Data

- [KMB/LWB dataset and API documents](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb): route, stop, route-stop, stop-ETA and ETA APIs at `data.etabus.gov.hk/v1/transport/kmb`. ETA data updates approximately once a minute; static data daily.
- [Citybus official route API](https://rt.data.gov.hk/v2/transport/citybus/route/CTB): route, route-stop, individual stop and ETA APIs at `rt.data.gov.hk/v2/transport/citybus`. Direction and stop sequence are filtered before displaying results.
- [Green minibus official API](https://data.etagmb.gov.hk): region/route discovery, route-stop and exact route-stop ETA. The `enabled` field is respected; `Scheduled`/`未開出` remarks are explicitly labeled as timetable forecasts.
- [MTR dataset](https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data), [v1.7 dictionary](https://opendata.mtr.com.hk/doc/Next_Train_DataDictionary_v1.7.pdf), [v1.7 API specification](https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf). `stations.json` contains station codes/names from the [official station CSV](https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv), retrieved 2026-10-12. Arrival data comes from Next Train, not this static catalog.

`官方 ETA` means an operator-provided forecast. These APIs do not consistently distinguish vehicle-position forecasts from schedule estimates, so the app does not advertise all results as GPS-live. Official schedule remarks are preserved and labeled. It never computes arrivals from headways or supplies example arrivals. Times without a valid source timestamp, more than three minutes old, or implausibly in the future are treated as stale; failed refreshes retain old values only with explicit historical labels and no live countdown. Missing forecasts do not imply that service has stopped.

## Scope and reference

The public [reference app](https://remarkable-souffle-8a5074.netlify.app) was inspected read-only in isolated local Chrome at 390px width. It has a narrow mobile layout, sticky header, bottom home/nearby/settings tabs, weather/clock, local saved routes/stops/MTR directions, route and stop search, nearby radius/name fallback, theme toggle, refresh interval and a route-detail/map view. This app implements the useful route-to-boarding-stop-to-favorites flow with original UI and code. Reference code, embedded stop banks and assets are not copied.

Nearby lookup in this first version covers KMB/LWB only. Light Rail, MTR Bus, ferries, red minibuses, map tiles, fares, weather and journey planning are not included. MTR arrivals may describe departures at some stations; East Rail departure remarks are shown. Actual service can differ during diversions or disruptions; consult the operator.

## Verify

From the repository root:

```sh
npm test
npm run check
npm run test:transit:live
```

The normal test suite is deterministic. The opt-in live smoke check needs internet access and validates all four official ETA payloads without assuming that arrivals must always be available. Browser validation should cover real API/CORS requests, mobile and desktop layouts, favorites and refresh persistence, no horizontal overflow, offline/error handling and inaccessible storage. Geolocation needs HTTPS or localhost, browser permission and real-device verification; no user's location is required for tests.

Validation on 2026-10-12: 28 deterministic tests and syntax checks passed; all four live API smoke checks passed. Isolated local Chrome completed real four-operator route/stop/favorite flows, reload persistence, reordering, themes, stop-name lookup, and 390px/1280px overflow checks without JavaScript errors. Separate fault checks confirmed failed ETA historical labels, successful retry, offline labels, stable keyboard focus during countdown updates and usable station search when localStorage is unavailable. No actual user location or physical iPhone was used. The stop-catalogue cache addresses redundant successful downloads; fresh API outages or blocked responses still show an honest error and do not silently use another server.
