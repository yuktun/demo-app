# 搭下一班 · Hong Kong transit ETA

A Traditional Chinese mobile transport board with a locally vendored Leaflet 1.9.4 map. Serve the existing `dist/` directory and open `transit/`. Existing reader files are unchanged. GitHub Pages is already configured to serve `main` at the repository root, so the hosted path is `/demo-app/dist/transit/`.

## Features

- KMB/LWB and Citybus route/terminus search; exact direction, service variant and boarding-stop selection.
- Green minibus lookup by official region (HKI/KLN/NT) and route number, with direction/variant selection.
- All ten MTR Next Train lines; station selection and per-train destination/platform display.
- Up to 24 local favorites; reorder, change stop, remove, manual refresh and 30/60/120-second foreground refresh.
- KMB/LWB stop-name or stop-ID lookup; optional nearby search with local straight-line distance. Geolocation is requested only after an explicit button click. Coordinates are neither saved nor transmitted.
- Light/dark themes, Hong Kong timezone, source timestamps, request timeout, error/offline/stale handling, and an unsaved-storage notice.
- Bus/minibus route maps from official ordered stops and coordinates. Open a favorite's `地圖`, or a route-search result's map action. Choose a marker or list row for exact-stop ETA; switch to the officially published reverse direction without changing the KMB service variant. Saved boarding stops, selected stops and explicitly requested location have distinct labels/colors. Marker keyboard activation and an accessible dialog/list are supported.
- Verified joint-operated bus stops combine both operators' ETA feeds, label each forecast by operator, sort chronologically and show separate feed timestamps and partial-feed errors. Existing favorites and map stop selections use the same resolver automatically.

Favorites and preferences use distinct transit localStorage keys and do not read the reader's data. Parsed route caches and previous arrivals exist only in memory. The public KMB stop catalogue is also cached in sessionStorage for up to 24 hours, to avoid redownloading the same large list after a tab reload; its source date is shown, and the settings cache-clear button removes it. Static catalogue requests respect the operator's HTTP cache headers. ETA requests use `no-store` and are never saved in the stop catalogue. There is no account, backend or API key. Leaflet 1.9.4 and its license/assets are vendored under `vendor/leaflet/`; the map code is loaded only when requested.

## Data

- [KMB/LWB dataset and API documents](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb): route, stop, route-stop, stop-ETA and ETA APIs at `data.etabus.gov.hk/v1/transport/kmb`. ETA data updates approximately once a minute; static data daily.
- [Citybus official route API](https://rt.data.gov.hk/v2/transport/citybus/route/CTB): route, route-stop, individual stop and ETA APIs at `rt.data.gov.hk/v2/transport/citybus`. Direction and stop sequence are filtered before displaying results.
- [Green minibus official API](https://data.etagmb.gov.hk): region/route discovery, route-stop and exact route-stop ETA. The `enabled` field is respected; `Scheduled`/`未開出` remarks are explicitly labeled as timetable forecasts.
- [MTR dataset](https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data), [v1.7 dictionary](https://opendata.mtr.com.hk/doc/Next_Train_DataDictionary_v1.7.pdf), [v1.7 API specification](https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf). `stations.json` contains station codes/names from the [official station CSV](https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv), retrieved 2026-10-12. Arrival data comes from Next Train, not this static catalog.

`官方 ETA` means an operator-provided forecast. These APIs do not consistently distinguish vehicle-position forecasts from schedule estimates, so the app does not advertise all results as GPS-live. Official schedule remarks are preserved and labeled. It never computes arrivals from headways or supplies example arrivals. Times without a valid source timestamp, more than three minutes old, or implausibly in the future are treated as stale; failed refreshes retain old values only with explicit historical labels and no live countdown. Missing forecasts do not imply that service has stopped.

## Scope and reference

The public [reference app](https://remarkable-souffle-8a5074.netlify.app) was inspected read-only in isolated local Chrome at 390px width. It has a narrow mobile layout, sticky header, bottom home/nearby/settings tabs, weather/clock, local saved routes/stops/MTR directions, route and stop search, nearby radius/name fallback, theme toggle, refresh interval and a route-detail/map view. This app implements the useful route-to-boarding-stop-to-favorites flow with original UI and code. Reference code, embedded stop banks and assets are not copied.

Nearby lookup covers KMB/LWB only. Light Rail, MTR Bus, ferries, red minibuses, fares, weather and journey planning are not included. MTR maps are not included because no station-coordinate integration has been added. MTR arrivals may describe departures at some stations; East Rail departure remarks are shown. Actual service can differ during diversions or disruptions; consult the operator.

## Maps and privacy

KMB/Citybus coordinates come from official stop data; GMB uses the official stop API's `coordinates.wgs84`. Only markers are drawn: no road-following route geometry is asserted from these points. Missing coordinates retain the stop in the ordered list and preserve ETA selection. Map/library/tile failures show explicit notices; closing or changing directions invalidates old asynchronous results. A map fit control returns to all valid route stop points. Reverse routes lacking the same official variant remain unavailable instead of silently choosing another service.

Basemap tiles use the standard HTTPS OpenStreetMap tile endpoint with visible attribution, normal browser caching and a valid origin referrer, following the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). There is no tile proxy, bulk download, prefetch, offline map package or no-cache tile request. The code uses the [pinned Leaflet 1.9.4 map API](https://github.com/Leaflet/Leaflet/blob/v1.9.4/src/map/Map.js) and includes its [license](https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE). At larger traffic levels the tile provider may need replacement; service is best effort.

The location button requests browser permission only on explicit activation. The point exists only as a temporary marker/accuracy circle and is removed when the dialog closes or the route changes. It is never saved to favorites or API requests. As with any basemap, displaying an area sends that area's tile requests to the provider; the UI states this before location use. QA uses mocked coordinates and tile images and never the user's location.

## Joint operators

`joint-routes.json` is a compact extract of the Transport Department's [full public bus registry](https://static.data.gov.hk/td/routes-fares-geojson/JSON_BUS.json), documented in the [GeoJSON dataset](https://data.gov.hk/en-data/dataset/hk-td-tis_23-routes-fares-geojson). It retains only the KMB+CTB and LWB+CTB route roster, directed variants and shared stop names/coordinates, with revision cutoff 2026-09-30 and retrieval date 2026-10-13. It currently identifies 91 joint route numbers; that does not promise that every stop or variant can be paired. No ETA, screenshot, personal favorite or user location is included in this registry.

The resolver first requires a registered joint route and matching *directed* termini from the current operator route catalogues. It then binds each selected operator stop to one uniquely ordered shared TD station using official name aliases and coordinates (within 80 metres of the shared reference and each other). Optimal monotone sequence correspondence distinguishes repeated stop occurrences; ambiguous mappings are refused. It does not use nearest-stop matching or require an arbitrary whole-route match percentage. Official coordinate disagreements or changed sequences produce a visible single-feed warning instead of borrowing another stop's arrivals. KMB numeric service types other than `1` remain single-feed because Citybus's public ETA interface has no equivalent variant discriminator; their original service selection is preserved.

For the reproducible public 680 case, KMB outbound stop `15FF958BE6921BAA`, sequence 4 (MA952), matches Citybus **inbound** `001950`, sequence 4, via TD shared station 6175. Both companies' direction codes cannot be assumed equal. The counterpart names and per-feed source times are displayed. Up to three records from each feed are retained, combined chronologically without deduplicating equal timestamps across different buses/operators. Empty cycle placeholders with no valid ETA are messages, not invented arrivals. Partial failures show the surviving feed and identify the failed operator; when both fail the existing historical/error state is retained.

The [Citybus v2.01 data dictionary](https://www.citybus.com.hk/datagovhk/bus_eta_data_dictionary.pdf) describes operator, direction, sequence, stop and remarks fields. API remarks explicitly indicating scheduled service are labelled timetable forecasts. Blank remarks do not establish GPS-live status, so they remain `官方 ETA` rather than being inferred from the time value. Updating the official static registry is necessary when joint-route metadata changes.

## Verify

From the repository root:

```sh
npm test
npm run check
npm run test:transit:live
```

The normal test suite is deterministic. The opt-in live smoke check needs internet access and validates all four official ETA payloads without assuming that arrivals must always be available. Browser validation should cover real API/CORS requests, mobile and desktop layouts, favorites and refresh persistence, no horizontal overflow, offline/error handling and inaccessible storage. Geolocation needs HTTPS or localhost, browser permission and real-device verification; no user's location is required for tests.

Validation on 2026-10-12: 28 deterministic tests and syntax checks passed; all four live API smoke checks passed. Isolated local Chrome completed real four-operator route/stop/favorite flows, reload persistence, reordering, themes, stop-name lookup, and 390px/1280px overflow checks without JavaScript errors. Separate fault checks confirmed failed ETA historical labels, successful retry, offline labels, stable keyboard focus during countdown updates and usable station search when localStorage is unavailable. No actual user location or physical iPhone was used. The stop-catalogue cache addresses redundant successful downloads; fresh API outages or blocked responses still show an honest error and do not silently use another server.

Map addition validation on 2026-10-12: the supplied `IMG_7244.png` was viewed as a visual reference, without publishing it or using personal favorites as app defaults. The suite now has 32 passing tests, including missing/malformed official coordinates, loop-stop identity, sequence order and exact service/direction matching. Browser regressions passed with real KMB/Citybus/GMB route/coordinate/ETA data, marker/list keyboard selection, boarding-stop distinction, direction changes, fit bounds, repeated open/close, simulated missing coordinates, offline selection, mocked explicit geolocation, and mobile/desktop overflow checks. Baseline four-operator ETA and error/retry/storage tests also passed. Tile images were intercepted with test fixtures during pan/zoom regressions to avoid bulk or headless rendering against the public tile service. Actual iPhone and actual user geolocation were not tested.

Joint-operator validation on 2026-10-13: unit regressions cover both directions of 680, 101, 102 and 182 (including different per-operator direction conventions), non-joint 1/1A, existing favorites, special-service isolation, repeated/ambiguous stop occurrences, operator/stop/sequence filtering, equal-time records, cycle placeholders, independent feed failures and successful retry. Public official-response fixtures are historical snapshots for deterministic tests, never app default arrivals. Live exact-stop requests for 680 succeeded for KMB O/Citybus I at MA952 and KMB I/Citybus O at the reverse terminal; the test does not assume both providers must always supply a forecast. The app remains explicit when one provider has no valid ETA.

The final suite has 56 passing tests, with syntax and whitespace checks passing. Isolated local Chrome verified automatic joint feeds for an unchanged existing favorite, individual operator labels and short-working destinations, independent failure/recovery, source times, map-selected MA952 and its reverse terminal, reload persistence, and 390px/1280px layouts without JavaScript errors. Captured official responses and mocked map tiles were used for repeatable joint browser checks; separate live requests confirmed both exact 680 direction pairs. The existing four-operator browser flows also passed with current official responses, accepting an explicit unavailable state when a provider supplies no forecast. No personal favorite or physical iPhone was used.
