# English practice

Independent static app. Serve `dist/` over HTTP and open `/english/`. Relative assets support a nested base path. No build or packages are required.

Ten original fictional lessons cover workplace updates, risks, requests, disagreement, priorities, deadlines, delegation, follow-up, feedback and conversation. Five-minute sessions use one question and a 30-second speaking prompt; ten-minute sessions use two questions and a 60-second prompt. Both practice styles are user choices, not proficiency assessments.

Browser localStorage contains answers, preferences, unfinished sessions, completed sessions and review items. The app uses only `english-practice-v1`. Limits: 10 unfinished sessions, 100 recent completions, 2,000 characters per answer and a 1 MB JSON backup. JSON import validates before explicit replacement; export includes private answers. Clearing browser data can erase progress. No accounts, backend, analytics, microphone, recordings or uploads.

Audio uses browser-labelled local English voices only. Without a suitable voice, read the dialogue. Operating-system voice availability and quality vary. Playback stops when hidden; background playback is not promised. Free-text practice uses model comparison and self-review, with no semantic, grammar or pronunciation grading. Multiple-choice feedback uses fixed answer keys.

Run `npm test` and `npm run check` from the repository root. `node tests/english-browser.mjs` performs local Chromium checks when Playwright is installed; `PLAYWRIGHT_MODULE` can specify an existing Playwright module entry point, `ENGLISH_BROWSER_PATH` an installed browser executable, and `ENGLISH_QA_DIR` a screenshot output folder outside the repository.
