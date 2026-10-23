import { exercises, byId, plans, photos, alternatives, phase } from "./data.js";
import {
  KEY,
  emptyState,
  validateState,
  parseBackup,
  exportBackup,
  localDate,
  validDate,
  addDays,
  monday,
  weekNumber,
  nextType,
  weekCount,
  suggestion,
  strengthHistory,
  lastLoad,
  makeDraft,
  completedSets,
  fullSession,
  finish,
  timerAction,
  timerRemaining,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  main = $("#main"),
  modal = $("#modal");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let state = emptyState(),
  tab = "today",
  workout = false,
  planWeek = monday(),
  pendingImport = null,
  locked = false,
  dirty = false;
const notify = (s) => {
  $("#notice").textContent = s;
};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = validateState(JSON.parse(raw));
} catch {
  locked = true;
  notify(
    "無法讀取本機紀錄。原有內容已保留；可先匯出原始備份，再於「我的進度」匯入有效備份。",
  );
}
function save(next = state) {
  if (locked) {
    notify("資料保護中，暫停寫入。請先備份及重新載入，或匯入有效備份。");
    return false;
  }
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    dirty = false;
    notify("");
    return true;
  } catch {
    dirty = true;
    notify(
      "無法儲存到此瀏覽器（儲存權限或空間不足）。目前只保留在此頁記憶體；請立即匯出備份，關頁或重新載入會遺失未儲存變更。",
    );
    return false;
  }
}
addEventListener("storage", (e) => {
  if (e.key === KEY) {
    locked = true;
    notify(
      "另一個分頁已更改健身資料。為避免覆蓋，暫停寫入；請先匯出此頁備份，再重新載入。",
    );
  }
});
addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function show(content) {
  $("#modal-content").innerHTML = content;
  if (!modal.open) modal.showModal();
}
$("#modal-close").onclick = () => {
  modal.close();
  pendingImport = null;
};
modal.addEventListener("cancel", () => {
  pendingImport = null;
});
function safety() {
  show(
    `<div class="safety"><p class="eyebrow">TRAIN WITH CARE</p><h2>先安全，再進步。</h2><ul><li>開始阻力訓練前，請由醫護人員確認適合的強度。由可控制的輕至中等重量開始；用力時呼氣，不憋氣。</li><li>嚴重睡眠不足、頭暈或乏力：暫停負重，選恢復日；如不舒服，連步行也先停下。</li><li>胸痛、突然無力或麻痺、說話或視力改變：立即停止並尋求緊急醫療協助（香港：999）。</li><li>不要用單一次血壓數字判斷可以進行高強度運動。不做極限測試、不做到力竭；保留餘力。</li><li>逐步減脂，同時保留或建立肌肉；以腰圍、力量及長期趨勢觀察，不設固定低體重目標。</li></ul><p class="muted">一般安全資訊，不能代替個別醫療意見。</p><div class="linklist"><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noopener noreferrer">WHO：身體活動</a><a href="https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/getting-active-to-control-high-blood-pressure" target="_blank" rel="noopener noreferrer">American Heart Association：呼吸與運動</a><a href="https://www.heart.org/en/about-us/heart-attack-and-stroke-symptoms" target="_blank" rel="noopener noreferrer">American Heart Association：緊急警號</a></div><small>資料核對：2026-10-23</small></div>`,
  );
}
$("#safety-open").onclick = safety;
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      workout = false;
      render(true);
    }),
);
function render(focus = false) {
  document.querySelectorAll("nav button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  });
  if (workout && state.draft) renderWorkout();
  else
    ({
      today: renderToday,
      plan: renderPlan,
      library: renderLibrary,
      progress: renderProgress,
    })[tab]();
  if (focus) {
    main.focus();
    scrollTo(0, 0);
  }
}
const button = (label, attrs = "", style = "") =>
  `<button ${attrs} class="${style}">${label}</button>`;
function renderToday() {
  const today = localDate(),
    week = weekNumber(state.startDate),
    p = phase(week),
    s = suggestion(state),
    last = [...state.history].sort((a, b) => b.finishedAt - a.finishedAt)[0],
    count = weekCount(state),
    recent = state.body.slice().sort((a, b) => a.date.localeCompare(b.date));
  main.innerHTML = `<p class="eyebrow">SMALL STEPS. STRONGER YOU.</p><h1>練好每一下。<br>慢慢變強。</h1><p class="muted">按今日狀態出發，休息也是計劃一部分。</p><section class="card hero"><div class="row between"><span class="pill">第 ${week} 週 · ${p.title}</span><span class="muted">${today}</span></div><p>今日建議</p><div class="big">${s === "Recovery" || s === "Rest" ? "恢復" : `GYM ${s}`}<small>${s === "Recovery" || s === "Rest" ? " DAY" : " / 全身訓練"}</small></div><p class="muted">${s === "Recovery" || s === "Rest" ? "放慢步伐。按舒適程度休息或輕鬆步行。" : "6 個動作 · 每個 2 組 · 保留餘力"}</p>${button(state.draft ? "繼續未完成訓練 →" : s === "Recovery" || s === "Rest" ? "記錄恢復日 →" : "開始今日訓練 →", 'id="start"', "primary wide")}<div class="row" style="margin-top:12px">${button("選擇 A / B", 'id="choose"', "quiet")}${button("今日改為恢復日", 'id="recover"', "quiet")}</div></section><div class="stats"><div class="stat"><strong>${count}</strong><span>本週完成力量訓練</span></div><div class="stat"><strong>${last ? esc(last.type) : "—"}</strong><span>${last ? esc(last.date) : "尚未有訓練紀錄"}${last?.status === "partial" ? " · 部分完成" : ""}</span></div><div class="stat"><strong>${recent.length ? recent.length : "—"}</strong><span>身體量度紀錄</span></div></div><section class="card"><p class="eyebrow">YOUR PACE</p><h2>這一階段，先做好基礎</h2><p>${p.strength}</p><p class="muted">${p.cardio}</p><div class="divider"></div><p>熱身 5–8 分鐘 → 力量訓練 → 可選舒適步行 10–20 分鐘 → 慢行冷卻 5 分鐘。</p><small>不自動加重。先穩定動作，保留約 3–4 下餘力；疲倦時可以延期。</small></section><section class="card"><h2>最近進展</h2>${
    recent.length
      ? chart(
          recent
            .filter((b) => b.waist !== null)
            .map((b) => ({ date: b.date, value: b.waist })),
          "腰圍",
          "cm",
        )
      : '<p class="empty">第一筆紀錄，由你開始。沒有預設身體數據。</p>'
  }${button("查看我的進度", 'id="to-progress"', "quiet wide")}</section><p class="muted"><small>所有紀錄只存在這個瀏覽器，沒有帳戶或自動跨裝置同步。清除網站資料可能令紀錄遺失，請定期匯出備份。</small></p>`;
  $("#start").onclick = () =>
    state.draft
      ? resume()
      : s === "Recovery" || s === "Rest"
        ? recovery()
        : start(s);
  $("#choose").onclick = choose;
  $("#recover").onclick = () => {
    state.schedule[today] = "Recovery";
    save();
    render();
  };
  $("#to-progress").onclick = () => {
    tab = "progress";
    render(true);
  };
}
function choose() {
  show(
    `<h2>選擇今次訓練</h2><p>上次完整完成的力量訓練後，建議 <strong>GYM ${nextType(state)}</strong>。草稿、部分紀錄及恢復日不影響輪替。</p>${button("GYM A", 'data-start="A"', "primary wide")}${button("GYM B", 'data-start="B"', "wide")}<p class="muted">${state.draft ? "有未完成草稿，請先繼續、儲存部分訓練或放棄。" : "先熱身，按恢復及醫護建議調整。"}</p>`,
  );
  document.querySelectorAll("[data-start]").forEach(
    (b) =>
      (b.onclick = () => {
        modal.close();
        state.draft ? resume() : start(b.dataset.start);
      }),
  );
}
function start(type) {
  if (locked) {
    save();
    return;
  }
  if (!state.startDate) state.startDate = localDate();
  state.draft = makeDraft(state, type);
  save();
  resume();
}
function resume() {
  workout = true;
  tab = "today";
  render(true);
}
function recovery() {
  show(
    `<h2>今日，留一點空間給恢復。</h2><p>睡眠不足、夜班後或感到疲倦，可休息或按舒適程度輕鬆步行；不舒服就先停下。</p><label>舒適步行分鐘（可填 0）<input id="recovery-min" type="number" min="0" max="300" value="0" inputmode="numeric"></label>${button("儲存今日恢復日", 'id="recovery-save"', "primary wide")}<p class="muted">不計入力量訓練次數，不改變 A / B 輪替。${state.draft ? "現有力量草稿會保留。" : ""}</p>`,
  );
  $("#recovery-save").onclick = () => {
    const minutes = Number($("#recovery-min").value);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 300)
      return notify("請輸入 0–300 分鐘。");
    const date = localDate();
    if (state.history.some((h) => h.date === date && h.type === "Recovery")) {
      modal.close();
      notify("今日已記錄恢復日。");
      return;
    }
    if (locked) return save();
    state.history.push({
      id: crypto.randomUUID(),
      type: "Recovery",
      status: "complete",
      date,
      finishedAt: Date.now(),
      minutes,
    });
    state.schedule[date] = "Recovery";
    save();
    modal.close();
    render();
  };
}
function media(e) {
  const p = photos[e.id];
  return `<button class="exercise-media" data-view="${e.id}" aria-label="放大${esc(e.zh)}圖片"><img src="./assets/${p ? p.file : e.id + ".svg"}" alt="${esc(e.zh)}${p ? "真實器械照片" : "原創簡化姿勢示意，並非照片"}" loading="lazy"><span class="caption">${p ? "真實照片 · 點按放大" : "尚缺已核實授權照片 · 原創姿勢示意（點按放大）"}</span></button>`;
}
function bindMedia() {
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => (b.onclick = () => viewImage(b.dataset.view)));
  document.querySelectorAll(".exercise-media img").forEach(
    (im) =>
      (im.onerror = () => {
        im.hidden = true;
        im.parentElement.querySelector(".caption").textContent =
          "圖片未能載入 · 點按查看動作說明及來源";
      }),
  );
}
function viewImage(id) {
  const e = byId[id],
    p = photos[id];
  show(
    `<h2>${e.zh} · ${e.en}</h2><img src="./assets/${p ? p.file : id + ".svg"}" alt="${e.zh}${p ? "照片" : "原創簡化示意"}"><p>${e.cue}</p><p class="muted">留意：${e.mistake}</p>${p ? `<p><a href="${p.source}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a> — <a href="${p.credit || p.source}" target="_blank" rel="noopener noreferrer">${p.author}</a> · <a href="${p.licenseUrl}" target="_blank" rel="noopener noreferrer">${p.license}</a></p><small>原檔或僅縮小及重新壓縮；逐檔修改見來源清單，沒有改變動作內容。照片為器械或動作辨識參考，機型及姿勢需由教練現場確認。</small>` : `<p>尚未取得合適、已核實授權的真實照片。這是本專案原創簡化姿勢示意，不能代替現場教學。</p><a href="${e.reference}" target="_blank" rel="noopener noreferrer">動作參考來源（部分為一般圖庫入口）：${e.en}</a>`}`,
  );
  $("#modal-content img").onerror = (e) => {
    e.target.hidden = true;
  };
}
function renderWorkout() {
  const d = state.draft;
  main.innerHTML = `<div class="row between"><p class="eyebrow">IN SESSION · GYM ${d.type}</p>${button("儲存並返回", 'id="leave"', "quiet")}</div><h1>專注這一組。</h1><p class="muted">熱身 5–8 分鐘。每組保留 3–4 下餘力，用力呼氣，不憋氣。</p><div class="timer" aria-label="組間休息計時器"><div class="row between"><span>組間休息</span><output id="timer-value" aria-live="off"></output><span id="timer-status" class="muted"></span></div><div class="row">${button("90 秒", 'data-timer="90"')}${button("120 秒", 'data-timer="120"')}${button("暫停", 'id="timer-pause"')}${button("重設", 'id="timer-reset"')}</div></div><p id="workout-count" class="muted"></p>${d.exercises.map((entry, i) => exerciseCard(entry, i)).join("")}<section class="card"><h2>今日的努力，記錄下來。</h2><p>可選舒適步行 10–20 分鐘，最後慢行冷卻 5 分鐘。未完成所有組數，可儲存為「部分完成」。</p>${button("結束訓練", 'id="finish"', "primary wide")}${button("放棄這份草稿", 'id="discard"', "quiet wide danger")}</section>`;
  bindMedia();
  $("#leave").onclick = () => {
    workout = false;
    render(true);
  };
  document.querySelectorAll("[data-timer]").forEach(
    (b) =>
      (b.onclick = () => {
        state.timer = timerAction(
          state.timer,
          "start",
          Date.now(),
          Number(b.dataset.timer),
        );
        save();
        updateTimer();
      }),
  );
  $("#timer-pause").onclick = () => {
    state.timer = timerAction(
      state.timer,
      state.timer.end === null ? "resume" : "pause",
    );
    save();
    updateTimer();
  };
  $("#timer-reset").onclick = () => {
    state.timer = timerAction(state.timer, "reset");
    save();
    updateTimer();
  };
  document.querySelectorAll("[data-set]").forEach((input) =>
    input.addEventListener("input", () => {
      const [i, j, field] = input.dataset.set.split(":"),
        entry = state.draft.exercises[i],
        set = entry.sets[j];
      if (locked) {
        save();
        return;
      }
      if (field === "done") {
        if (
          input.checked &&
          Array.from(
            input.closest(".set").querySelectorAll("input[type=number]"),
          ).some((el) => !el.validity.valid)
        ) {
          input.checked = false;
          notify("請先修正這組的數字。");
          return;
        }
        if (
          input.checked &&
          (set.reps === null ||
            set.reps <= 0 ||
            (!byId[entry.actualId].body && set.kg === null))
        ) {
          input.checked = false;
          notify("請先填寫實際次數及負重；自重動作可留空 kg。");
          return;
        }
        set.done = input.checked;
      } else {
        const n = input.value === "" ? null : Number(input.value);
        if (
          n !== null &&
          (!Number.isFinite(n) ||
            n < 0 ||
            n > (field === "kg" ? 2000 : 500) ||
            (field === "reps" && !Number.isInteger(n)))
        ) {
          input.setCustomValidity("請輸入有效範圍內的數字。");
          input.reportValidity();
          return;
        }
        input.setCustomValidity("");
        set[field] = n;
        if (
          set.done &&
          (set.reps === null ||
            set.reps === 0 ||
            (!byId[entry.actualId].body && set.kg === null))
        ) {
          set.done = false;
          const checkbox = main.querySelector(`[data-set="${i}:${j}:done"]`);
          checkbox.checked = false;
        }
      }
      save();
      updateCount();
    }),
  );
  document.querySelectorAll("[data-skip]").forEach(
    (b) =>
      (b.onclick = () => {
        if (locked) return save();
        const entry = state.draft.exercises[Number(b.dataset.skip)];
        entry.skipped = !entry.skipped;
        save();
        const y = scrollY;
        renderWorkout();
        scrollTo(0, y);
      }),
  );
  document
    .querySelectorAll("[data-sub]")
    .forEach((b) => (b.onclick = () => substitute(Number(b.dataset.sub))));
  $("#finish").onclick = finishDialog;
  $("#discard").onclick = () => {
    show(
      `<h2>放棄這份草稿？</h2><p>這份未完成紀錄將被移除，過往訓練會保留。</p>${button("確認放棄草稿", 'id="confirm-discard"', "danger wide")}`,
    );
    $("#confirm-discard").onclick = () => {
      if (locked) return save();
      state.draft = null;
      state.timer = timerAction(state.timer, "reset");
      save();
      modal.close();
      workout = false;
      render(true);
    };
  };
  updateCount();
  updateTimer();
}
function exerciseCard(entry, i) {
  const e = byId[entry.actualId],
    last = lastLoad(state, e.id);
  return `<section class="card exercise ${entry.skipped ? "skipped" : ""}"><div class="row between"><span class="pill">${String(i + 1).padStart(2, "0")} / 06</span><span class="muted">2 組 × ${byId[entry.baseId].reps} 下</span></div><h2>${e.zh}<span>${e.en}</span></h2>${entry.actualId !== entry.baseId ? `<small>原動作：${byId[entry.baseId].en} · 自選替代</small>` : ""}${entry.variation ? `<p class="muted">${esc(entry.variation)}</p>` : ""}${media(e)}<p class="eyebrow">${e.muscles}</p><p>${e.cue}</p><p class="muted"><small>常見錯誤：${e.mistake}</small></p><p><small>上次此動作負重：${last === null ? "尚無紀錄" : last + " kg"}。${e.body ? "自重動作 kg 可留空。" : "填寫機器或啞鈴標示 kg；同一方式記錄。"}</small></p>${entry.skipped ? '<p class="pill">今次略過（保留已輸入數值）</p>' : entry.sets.map((s, j) => `<div class="set"><span class="n">${j + 1}</span><label>負重 kg<input aria-label="${e.en} 第 ${j + 1} 組 kg" data-set="${i}:${j}:kg" type="number" min="0" max="2000" step="any" inputmode="decimal" value="${s.kg ?? ""}" placeholder="${last ?? "—"}"></label><label>實際次數<input aria-label="${e.en} 第 ${j + 1} 組次數" data-set="${i}:${j}:reps" type="number" min="0" max="500" step="1" inputmode="numeric" value="${s.reps ?? ""}" placeholder="${byId[entry.baseId].reps}"></label><label class="check"><span>完成</span><input aria-label="${e.en} 第 ${j + 1} 組完成" data-set="${i}:${j}:done" type="checkbox" ${s.done ? "checked" : ""}></label></div>`).join("")}<div class="row">${button(entry.skipped ? "恢復此動作" : "略過此動作", `data-skip="${i}"`, "quiet")}${button("替代 / 難度選項", `data-sub="${i}"`, "quiet")}</div></section>`;
}
function updateCount() {
  if ($("#workout-count") && state.draft)
    $("#workout-count").textContent =
      `已完成 ${completedSets(state.draft)} 組 · 請按「結束訓練」正式儲存`;
}
function updateTimer() {
  if (!$("#timer-value")) return;
  const n = timerRemaining(state.timer);
  $("#timer-value").textContent =
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  $("#timer-status").textContent =
    n === 0 ? "休息時間到" : state.timer.end === null ? "已暫停" : "計時中";
  $("#timer-pause").textContent = state.timer.end === null ? "繼續" : "暫停";
}
setInterval(updateTimer, 250);
document.addEventListener("visibilitychange", updateTimer);
function substitute(index) {
  const entry = state.draft.exercises[index],
    options = [[entry.baseId, "回到原計劃動作"], ...alternatives[entry.baseId]];
  show(
    `<h2>選擇適合今日的版本</h2><p>原計劃保持不變。更換會清除這個動作今次已填的兩組；最後使用負重按實際動作分開記錄。替代動作未必有相同訓練效果。</p>${options.map(([id, note], i) => `<div class="selection"><strong>${byId[id].zh} · ${byId[id].en}</strong><p>${note}</p>${button("選用此版本", `data-alt="${i}"`)}</div>`).join("")}`,
  );
  document.querySelectorAll("[data-alt]").forEach(
    (b) =>
      (b.onclick = () => {
        const [id, note] = options[Number(b.dataset.alt)];
        show(
          `<h2>確認更換為 ${byId[id].zh}？</h2><p>${note}</p><p>此動作今次已填組數將清空。保留原計劃目標 2 × ${byId[entry.baseId].reps}；如超出能力，減少或略過。</p>${button("確認更換", 'id="confirm-sub"', "primary wide")}`,
        );
        $("#confirm-sub").onclick = () => {
          if (locked) return save();
          entry.actualId = id;
          entry.variation = note === "回到原計劃動作" ? "" : note;
          entry.skipped = false;
          entry.sets = [0, 1].map(() => ({
            kg: null,
            reps: null,
            done: false,
          }));
          save();
          modal.close();
          const y = scrollY;
          renderWorkout();
          scrollTo(0, y);
        };
      }),
  );
}
function finishDialog() {
  const n = completedSets(state.draft),
    full = fullSession(state.draft);
  show(
    `<h2>${full ? "完成這次訓練？" : "儲存部分訓練？"}</h2><p>已完成 ${n} 組。完成日期會使用現在的本地日期 ${localDate()}。</p><p>${full ? "會計入本週訓練，下一次 A / B 交替。略過的動作會標示。" : "部分紀錄會保留實際組數及負重，但不計完整訓練及不改變 A / B 輪替。亦可關閉此視窗繼續做。"}</p>${button(full ? "確認完成訓練" : "確認儲存部分訓練", `id="confirm-finish" ${n ? "" : "disabled"}`, "primary wide")}`,
  );
  $("#confirm-finish").onclick = () => {
    if (locked) return save();
    try {
      state = finish(state, !full);
      state.timer = timerAction(state.timer, "reset");
      save();
      modal.close();
      workout = false;
      render(true);
    } catch (e) {
      notify(e.message);
    }
  };
}
function renderPlan() {
  const week = weekNumber(state.startDate),
    p = phase(week),
    mode = state.modes[planWeek] || "2";
  main.innerHTML = `<p class="eyebrow">MAKE ROOM FOR YOURSELF</p><h1>一週，由你安排。</h1><p class="muted">不綁死星期幾。按睡眠、夜班及恢復，把訓練移到合適的一天。</p><section class="card"><label>計劃起始日<input id="plan-start" type="date" value="${state.startDate}"></label><p class="muted">第 ${week} 週 · ${p.title}</p><p>${p.strength}</p><p>${p.cardio}</p><details><summary>查看完整 8 週路線</summary>${[
    1, 3, 5,
  ]
    .map((w, i) => {
      const q = phase(w);
      return `<h3>第 ${["1–2", "3–4", "5–8"][i]} 週</h3><p>${q.strength}</p><p class="muted">${q.cardio}</p>`;
    })
    .join(
      "",
    )}</details></section><section class="card"><div class="row between">${button("← 上週", 'id="prev-week"', "quiet")}<strong>${planWeek} 起</strong>${button("下週 →", 'id="next-week"', "quiet")}</div><label style="margin-top:16px">這週的節奏<select id="week-mode"><option value="2" ${mode === "2" ? "selected" : ""}>2 天力量訓練</option><option value="3" ${mode === "3" ? "selected" : ""}>3 天力量訓練（按恢復及醫護建議）</option><option value="recovery" ${mode === "recovery" ? "selected" : ""}>恢復週</option></select></label><p class="muted"><small>模式只設定週目標，不強制分配日子。首兩週以 2 天為基礎；第 3–4 週才按狀態考慮 3 天。手動安排優先；可隨時選恢復日。</small></p>${Array.from(
    { length: 7 },
    (_, i) => {
      const date = addDays(planWeek, i),
        value = state.schedule[date] || "",
        logged = state.history.filter((h) => h.date === date);
      return `<div class="day ${date === localDate() ? "today" : ""}"><div>${["一", "二", "三", "四", "五", "六", "日"][i]}<small>${date.slice(5)}</small></div><label><span class="muted">${logged.length ? logged.map((h) => `${h.type}${h.status === "partial" ? "（部分）" : ""}`).join(" · ") : "安排"}</span><select data-day="${date}" aria-label="${date}安排">${[
        ["", "彈性 / 未安排"],
        ["A", "GYM A"],
        ["B", "GYM B"],
        ["Recovery", "恢復日"],
        ["Rest", "休息"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${value === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select></label>${button("移", `data-move="${date}" aria-label="移動 ${date} 的訓練"`, "quiet")}</div>`;
    },
  ).join(
    "",
  )}<p class="muted"><small>延期會將原日改為恢復日，並將所選訓練移到新日期；已有安排時會先請你確認。</small></p></section>`;
  $("#plan-start").onchange = (e) => {
    if (e.target.value && !validDate(e.target.value))
      return notify("日期無效。");
    state.startDate = e.target.value;
    save();
    renderPlan();
  };
  $("#week-mode").onchange = (e) => {
    state.modes[planWeek] = e.target.value;
    save();
  };
  $("#prev-week").onclick = () => {
    planWeek = addDays(planWeek, -7);
    renderPlan();
  };
  $("#next-week").onclick = () => {
    planWeek = addDays(planWeek, 7);
    renderPlan();
  };
  document.querySelectorAll("[data-day]").forEach(
    (el) =>
      (el.onchange = () => {
        if (el.value) state.schedule[el.dataset.day] = el.value;
        else delete state.schedule[el.dataset.day];
        save();
      }),
  );
  document
    .querySelectorAll("[data-move]")
    .forEach((b) => (b.onclick = () => moveDay(b.dataset.move)));
}
function moveDay(from) {
  show(
    `<h2>移動 / 延期訓練</h2><p>原日 ${from} 會改為恢復日。過往紀錄不會改動。</p><label>訓練<select id="move-type"><option value="A">GYM A</option><option value="B">GYM B</option></select></label><label>新日期<input type="date" id="move-date" value="${addDays(from, 1)}"></label>${button("預覽移動", 'id="move-preview"', "primary wide")}`,
  );
  $("#move-type").value = ["A", "B"].includes(state.schedule[from])
    ? state.schedule[from]
    : nextType(state);
  $("#move-preview").onclick = () => {
    const to = $("#move-date").value,
      type = $("#move-type").value;
    if (!validDate(to) || to === from) return notify("請選擇另一個有效日期。");
    show(
      `<h2>確認移動</h2><p>${from} → 恢復日<br>${to} → GYM ${type}</p>${state.schedule[to] ? "<p>新日期已有安排，確認後將取代該安排。</p>" : ""}${button("確認移動", 'id="move-confirm"', "primary wide")}`,
    );
    $("#move-confirm").onclick = () => {
      if (locked) return save();
      state.schedule[from] = "Recovery";
      state.schedule[to] = type;
      save();
      modal.close();
      renderPlan();
    };
  };
}
function renderLibrary() {
  main.innerHTML = `<p class="eyebrow">MOVE WITH CONFIDENCE</p><h1>認識動作，<br>練得更穩。</h1><p class="muted">原計劃 12 個動作。照片與姿勢示意分開標示；先請教練確認機器設定。</p><label>搜尋動作<input id="exercise-search" type="search" placeholder="中文、English 或肌群"></label><div id="library-list" class="grid" style="margin-top:20px"></div><section class="card"><h2>圖片與授權</h2><p>照片均經原始描述頁核對授權。沒有合適照片的動作，使用明確標示的原創簡化示意及參考入口。</p><a href="./SOURCES.md" target="_blank" rel="noopener">完整來源、授權、修改及照片缺口清單</a></section>`;
  const list = () => {
    const q = $("#exercise-search").value.trim().toLowerCase();
    $("#library-list").innerHTML =
      exercises
        .filter((e) => Object.values(plans).flat().includes(e.id))
        .filter((e) => (e.zh + e.en + e.muscles).toLowerCase().includes(q))
        .map(
          (e) =>
            `<section class="card exercise"><span class="pill">GYM ${plans.A.includes(e.id) ? "A" : "B"} · 2 × ${e.reps}</span><h2>${e.zh}<span>${e.en}</span></h2>${media(e)}<p class="eyebrow">${e.muscles}</p><p>${e.cue}</p><p class="muted"><small>避免：${e.mistake}</small></p><details><summary>替代及難度選項</summary>${alternatives[e.id].map(([id, note]) => `<p><strong>${byId[id].en}</strong> — ${note}</p>`).join("")}</details></section>`,
        )
        .join("") || '<p class="empty">未找到符合的動作。</p>';
    bindMedia();
  };
  $("#exercise-search").oninput = list;
  list();
}
function chart(points, title, unit) {
  points = points
    .slice()
    .sort(
      (a, b) => a.date.localeCompare(b.date) || (a.order ?? 0) - (b.order ?? 0),
    )
    .slice(-20);
  if (!points.length)
    return `<h3>${title}</h3><p class="empty">未有紀錄。由第一筆開始。</p>`;
  const vals = points.map((p) => p.value),
    min = Math.min(...vals),
    max = Math.max(...vals),
    span = max - min || 1;
  const coords = points.map((p, i) => [
    30 + (points.length === 1 ? 140 : (i * 280) / (points.length - 1)),
    105 - ((p.value - min) * 70) / span,
  ]);
  return `<h3>${title} <small>${unit}</small></h3><svg class="chart" viewBox="0 0 340 140" role="img" aria-label="${esc(title)}最近 ${points.length} 筆紀錄，${min} 至 ${max} ${unit}"><path d="M30 112H320" stroke="#34465b"/><polyline class="line" points="${coords.map((c) => c.join(",")).join(" ")}"/>${coords.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#80efd0"><title>${points[i].date}: ${points[i].value} ${unit}</title></circle>`).join("")}<text x="30" y="132">${points[0].date.slice(5)}</text><text x="270" y="132">${points.at(-1).date.slice(5)}</text><text x="30" y="20">${max} ${unit}</text></svg><p class="muted"><small>最近：${points.at(-1).value} ${unit} · ${points.at(-1).date}</small></p><details><summary>查看圖表數值</summary>${points.map((p) => `<p>${p.date} · ${p.value} ${unit}</p>`).join("")}</details>`;
}
function renderProgress() {
  const body = state.body.slice().sort((a, b) => a.date.localeCompare(b.date)),
    history = state.history.slice().sort((a, b) => b.finishedAt - a.finishedAt),
    weeks = Array.from({ length: 8 }, (_, i) => addDays(monday(), (i - 7) * 7));
  main.innerHTML = `<p class="eyebrow">PROGRESS, AT YOUR PACE</p><h1>看見累積，<br>不急於比較。</h1><p class="muted">以腰圍、力量及長期趨勢為重。短期體重變化不能直接判斷脂肪或肌肉增減。</p><section class="card"><h2>新增身體量度</h2><form id="body-form"><label>量度日期<input type="date" id="body-date" value="${localDate()}" required></label><div class="formgrid"><label>體重 kg（選填）<input id="body-weight" type="number" min="20" max="500" step="0.1" inputmode="decimal"></label><label>腰圍 cm（選填）<input id="body-waist" type="number" min="20" max="300" step="0.1" inputmode="decimal"></label><label>體脂估算 %（選填）<input id="body-fat" type="number" min="1" max="75" step="0.1" inputmode="decimal"></label></div><p class="muted"><small>體脂僅為智能磅估算，會受水分等因素影響；盡量在相近條件量度。至少填一項。同日紀錄會先確認再取代。</small></p>${button("儲存量度", 'type="submit"', "primary wide")}</form></section><div class="grid"><section class="card">${chart(
    body
      .filter((b) => b.waist !== null)
      .map((b) => ({ date: b.date, value: b.waist })),
    "腰圍趨勢",
    "cm",
  )}</section><section class="card"><label>力量趨勢動作<select id="load-exercise">${exercises.map((e) => `<option value="${e.id}">${e.zh} · ${e.en}</option>`).join("")}</select></label><div id="load-chart"></div><small>按實際動作顯示已完成組的最高負重；器械、幅度及次數不同，不宜直接比較。</small></section><section class="card">${chart(
    weeks.map((date) => ({ date, value: weekCount(state, date) })),
    "每週完整力量訓練",
    "次",
  )}</section><section class="card">${chart(
    body
      .filter((b) => b.weight !== null)
      .map((b) => ({ date: b.date, value: b.weight })),
    "體重趨勢",
    "kg",
  )}${chart(
    body
      .filter((b) => b.fat !== null)
      .map((b) => ({ date: b.date, value: b.fat })),
    "體脂估算",
    "%",
  )}</section></div><section class="card history"><h2>訓練紀錄</h2>${history.length ? history.map((h) => `<details><summary>${h.date} · ${h.type === "Recovery" ? "恢復日" : "GYM " + h.type} <span class="muted">${h.type === "Recovery" ? h.minutes + " 分鐘步行" : h.status === "partial" ? "部分完成" : completedSets(h) + " 組"}</span></summary>${h.type === "Recovery" ? "<p>休息或舒適步行，不影響 A / B 輪替。</p>" : `<ul>${h.exercises.map((e) => `<li>${byId[e.actualId].en}${e.actualId !== e.baseId ? "（替代 " + byId[e.baseId].en + "）" : ""} ${e.skipped ? "· 略過" : e.sets.map((s, i) => `<p>第 ${i + 1} 組：${s.kg ?? "自重 / 未填"}${s.kg === null ? "" : " kg"} × ${s.reps ?? "—"} 下 ${s.done ? "✓" : "未完成"}</p>`).join("")}</li>`).join("")}</ul>`}</details>`).join("") : '<p class="empty">還未有訓練紀錄，今天可以是第一步。</p>'}</section><section class="card history"><h2>量度紀錄</h2>${
    body.length
      ? body
          .slice()
          .reverse()
          .map(
            (b) =>
              `<details><summary>${b.date}</summary><p>體重 ${b.weight ?? "—"} kg · 腰圍 ${b.waist ?? "—"} cm · 體脂估算 ${b.fat ?? "—"} %</p>${button("刪除此日量度", `data-delete-body="${b.date}"`, "quiet danger")}</details>`,
          )
          .join("")
      : '<p class="empty">數據由你自行輸入，沒有預設值。</p>'
  }</section><section class="card backup"><h2>我的資料，只在這裡。</h2><p>沒有登入、分析追蹤或健康資料傳送；沒有自動跨裝置同步。清除網站資料、更換裝置或私人瀏覽可能令紀錄遺失。</p><p>定期下載備份，再到另一裝置匯入。備份含你輸入的健身及量度資料，請自行妥善保管。</p>${button("匯出 Gym JSON 備份", 'id="export"', "primary wide")}<label style="margin-top:18px">匯入 JSON 備份（上限 5 MB）<input id="import" type="file" accept="application/json,.json"></label><p class="muted"><small>先驗證及預覽，確認後才取代所有 Gym 資料。其他模組資料不會包含於匯出或被更改。</small></p>${button("刪除所有 Gym 資料", 'id="clear"', "danger quiet wide")}</section>`;
  const load = () => {
    const id = $("#load-exercise").value,
      points = history
        .filter((h) => h.type !== "Recovery")
        .map((h) => {
          const values = h.exercises
            .filter((e) => e.actualId === id && !e.skipped)
            .flatMap((e) =>
              e.sets.filter((s) => s.done && s.kg !== null).map((s) => s.kg),
            );
          return values.length
            ? { date: h.date, value: Math.max(...values), order: h.finishedAt }
            : null;
        })
        .filter(Boolean);
    $("#load-chart").innerHTML = chart(points, "實際負重", "kg");
  };
  $("#load-exercise").onchange = load;
  load();
  $("#body-form").onsubmit = (e) => {
    e.preventDefault();
    if (locked) return save();
    const b = {
      date: $("#body-date").value,
      ...Object.fromEntries(
        ["weight", "waist", "fat"].map((k) => [
          k,
          $("#body-" + k).value === "" ? null : Number($("#body-" + k).value),
        ]),
      ),
    };
    try {
      validateState({ ...state, body: [b] });
    } catch {
      return notify("請填寫有效量度，至少一項。");
    }
    const commit = () => {
      state.body = state.body.filter((x) => x.date !== b.date);
      state.body.push(b);
      save();
      modal.close();
      renderProgress();
    };
    if (state.body.some((x) => x.date === b.date)) {
      show(
        `<h2>取代 ${b.date} 的量度？</h2><p>新填量度將取代這天原有的所有量度欄位，包括留空的欄位。</p>${button("確認取代量度", 'id="replace-body"', "primary wide")}`,
      );
      $("#replace-body").onclick = commit;
    } else commit();
  };
  document.querySelectorAll("[data-delete-body]").forEach(
    (b) =>
      (b.onclick = () => {
        show(
          `<h2>刪除此日量度？</h2><p>${b.dataset.deleteBody}</p>${button("確認刪除量度", 'id="delete-body-confirm"', "danger wide")}`,
        );
        $("#delete-body-confirm").onclick = () => {
          if (locked) return save();
          state.body = state.body.filter(
            (x) => x.date !== b.dataset.deleteBody,
          );
          save();
          modal.close();
          renderProgress();
        };
      }),
  );
  $("#export").onclick = () => {
    try {
      download(exportBackup(state), "giant-gym-backup.json");
    } catch {
      notify("無法建立備份，請保留此頁並檢查紀錄。");
    }
  };
  if (locked) {
    const rawButton = document.createElement("button");
    rawButton.textContent = "下載原始儲存內容（供復原）";
    rawButton.className = "wide";
    rawButton.onclick = () => {
      try {
        download(localStorage.getItem(KEY) || "", "giant-gym-raw-recovery.txt");
      } catch {
        notify("瀏覽器拒絕讀取儲存內容。");
      }
    };
    $(".backup").append(rawButton);
  }
  $("#import").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5000000)
      return notify("檔案太大，請選擇 5 MB 以內的 Gym JSON 備份。");
    try {
      pendingImport = parseBackup(await file.text());
      show(
        `<h2>匯入預覽</h2><p>${pendingImport.history.length} 筆訓練 · ${pendingImport.body.length} 筆量度 · ${pendingImport.draft ? "1 份未完成草稿" : "沒有草稿"}</p><p>將取代此瀏覽器目前的 ${state.history.length} 筆訓練及 ${state.body.length} 筆量度。建議先關閉此視窗並匯出現有資料。</p>${button("確認取代所有 Gym 資料", 'id="confirm-import"', "primary wide")}`,
      );
      $("#confirm-import").onclick = () => {
        if (!pendingImport) return;
        const next = pendingImport;
        pendingImport = null;
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
          state = next;
          locked = false;
          dirty = false;
          modal.close();
          renderProgress();
          notify("Gym 備份已匯入。");
        } catch {
          notify("匯入失敗：無法寫入本機儲存；現有紀錄沒有變更。");
        }
      };
    } catch {
      pendingImport = null;
      notify("匯入失敗：檔案格式無效或版本不相容；現有紀錄沒有變更。");
    }
  };
  $("#clear").onclick = () => {
    show(
      `<h2>刪除所有 Gym 資料？</h2><p>包括訓練、量度、草稿及安排。這個動作無法還原，建議先下載備份。</p>${button("確認刪除所有 Gym 資料", 'id="confirm-clear"', "danger wide")}`,
    );
    $("#confirm-clear").onclick = () => {
      try {
        localStorage.removeItem(KEY);
        state = emptyState();
        locked = false;
        dirty = false;
        modal.close();
        notify("Gym 資料已刪除。");
        renderProgress();
      } catch {
        notify("瀏覽器拒絕刪除儲存資料，紀錄沒有移除。");
      }
    };
  };
}
function download(content, name) {
  const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
render();
