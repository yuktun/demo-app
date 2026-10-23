# Gym Tracker 驗收紀錄

日期：2026-10-23。使用全新、合成測試資料；沒有使用個人紀錄。測試截圖輸出到 repository 外的 `gym-qa/`，不將量度或訓練備份加入公開 repository。

## 自動邏輯測試

`node --test dist/gym/tests/core.test.mjs`：10 項通過。

- 逐項斷言 A / B 全部 12 個基本動作名稱、2 組及 10–12 / 12–15 次處方；第 1–2、3–4、5–8 週頻率、餘力及帶氧進程。
- 只有完整力量訓練改變 A / B；草稿、部分及恢復日不改變輪替。
- 未完成阻止完整結束；完成日採結束當刻本地日期；重複結束不新增紀錄。
- 最後負重按實際替代動作及已完成組計算，原動作不受混用。
- 週一至週日、週數、無效日期、跨夏令時間；另用子程序的 Asia/Hong_Kong、America/New_York、Pacific/Honolulu 時區斷言本地日期。
- 2 / 3 天及恢復週、自訂日安排、週界線。
- 90 / 120 秒時間戳、暫停、繼續、重設及長時間經過。
- 空白、歷史、量度及草稿 JSON 往返；輸出白名單；拒絕無效版本、日期、數值、動作、重複 ID、過大檔案等。
- 每個基本及替代動作的本機媒體檔案存在。

## 實際 Chromium 瀏覽器自動化

`node dist/gym/tests/browser.mjs`，Playwright 驅動本機 Google Chrome 155.0.8059.40，headless，觸控 / 手機視窗模擬，Asia/Hong_Kong 時區。需容許 localhost HTTP 測試伺服器和瀏覽器互通；產品沒有此依賴。

- 空白首次使用、四分頁、鍵盤 skip link 及焦點；身體欄位起始空白。
- 圖鑑 12 個動作、搜尋、放大及授權；所有基本動作圖片逐張解碼，沒有壞圖。
- 空白組數不能勾完成；kg、實際次數、勾選保存，reload 後由草稿繼續。
- 120 秒啟動、經過 30 秒、暫停、繼續、reload、時間經過歸零、重設；90 秒按鈕。
- 替代前確認、清空當前組數、依實際動作顯示上次負重；自重可留空 kg；略過動作。
- 明確完整 / 部分結束、雙重點擊不重複、恢復日同日去重及不改力量輪替。
- 2 / 3 天 / 恢復模式；移動預覽不寫入，確認後原日恢復、新日訓練。
- 身體紀錄、腰圍/負重/週次/體重/體脂圖表及歷史。
- JSON 下載和匯入往返、先預覽再確認、取消保留舊資料、無效及過大檔案保留舊資料、HTML 字串不執行。
- 匯出不包含其他模組 localStorage；清除只刪 Gym 鍵。
- 模擬 QuotaExceededError、SecurityError、損毀儲存及雙分頁變更；顯示可見錯誤，損毀內容不覆寫。
- 320、390、430、768、1280 px 四頁沒有水平溢出；320 px 訓練畫面沒有水平溢出。
- Gym 流程沒有外部網路請求或 JavaScript pageerror。
- 現有 `/dist/` reader、transit、english、adventure、practice 入口 HTTP 200 smoke test。

## 現有 repository 回歸檢查

- `npm test`：原有 121 項通過。
- `npm run check`：原有模組語法檢查通過。
- `node --check dist/gym/app.js`、`core.js`、`data.js`：通過。
- 最終差異只新增 `dist/gym/`，沒有改動其他模組或依賴檔。

## 人工檢視及實際限制

已檢視手機 screenshot 的首頁及訓練卡版面；已人工檢視所有六張採用照片，對應器械/動作並逐張查核來源及授權。排除一張名稱為 chest press 但器械不夠確定的候選圖。另六個基本動作仍缺合適核實照片，明確使用原創簡化圖，詳見 SOURCES.md。

上述是桌面 Chrome 執行的手機視窗自動化。時鐘快轉、背景經過時間、儲存錯誤及不受信任匯入是模擬條件。沒有實體 iPhone / Safari、WebKit、VoiceOver、真實健身負重、長時間鎖屏或 OS 強制關閉測試。沒有宣稱通知或背景程序持續運行；計時只以時間戳恢復顯示。

部署以 GitHub Pages legacy main / root 發佈。提交後須核對遠端 main SHA、Pages build commit/status，並對正式 `/demo-app/dist/gym/` 執行線上 smoke test，結果在交付訊息回報。
