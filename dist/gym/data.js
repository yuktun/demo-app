const commons = (name) =>
  "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(name);
export const photos = {
  legcurl: {
    file: "leg-curl.jpg",
    title: "LyingLegCurlMachineExercise.JPG",
    author: "GeorgeStepanek (Commons attribution)",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: commons("LyingLegCurlMachineExercise.JPG"),
  },
  lateral: {
    file: "lateral-raise.jpg",
    title: "DumbbellLateralRaise.JPG",
    author: "GeorgeStepanek (Commons attribution)",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: commons("DumbbellLateralRaise.JPG"),
  },
  triceps: {
    file: "triceps-pushdown.jpg",
    title: "CableMachinePushdown.JPG",
    author: "GeorgeStepanek (Commons attribution)",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: commons("CableMachinePushdown.JPG"),
  },
  legpress: {
    file: "leg-press.jpg",
    title: "Leg Press Machine.jpg",
    author: "Paulmcdonald",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: commons("Leg Press Machine.jpg"),
  },
  curl: {
    file: "biceps-curl.jpg",
    title: "Bicep Curl.jpg",
    author: "Hipnotic88",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    source: commons("Bicep Curl.jpg"),
  },
  pulldown: {
    file: "lat-pulldown.jpg",
    title: "Girl doing lat pulldown exercise.jpg",
    author: "Tyler Read / PTPioneer",
    credit: "https://www.ptpioneer.com/",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: commons("Girl doing lat pulldown exercise.jpg"),
  },
};
// Each base prescription remains two sets. Alternatives are deliberate user choices.
const ex = (id, zh, en, muscles, reps, cue, mistake, body = false) => ({
  id,
  zh,
  en,
  muscles,
  reps,
  cue,
  mistake,
  body,
  sets: 2,
  reference: "https://www.acefitness.org/resources/everyone/exercise-library/",
});
export const exercises = [
  ex(
    "legpress",
    "腿推",
    "Leg Press",
    "股四頭肌・臀肌",
    "10–12",
    "背臀貼墊，膝蓋跟腳尖方向；推起呼氣，緩慢回程。",
    "避免鎖膝、膝內扣或腰臀離墊。",
  ),
  ex(
    "chest",
    "坐姿推胸",
    "Chest Press",
    "胸肌・三頭肌",
    "10–12",
    "手柄約胸口高度，肩膀放低；向前推時呼氣。",
    "避免聳肩、彈震或過度拱腰。",
  ),
  ex(
    "row",
    "坐姿划船",
    "Seated Row",
    "背闊肌・中背・二頭肌",
    "10–12",
    "坐穩，胸口打開；手肘向後拉到身側，慢慢放回。",
    "避免前後甩腰或聳肩借力。",
  ),
  ex(
    "legcurl",
    "腿彎舉",
    "Leg Curl",
    "腿後肌",
    "12–15",
    "調整膝關節對準機器轉軸；骨盆穩定，慢慢屈膝。",
    "避免抬臀、彈起或使用過大活動幅度。",
  ),
  ex(
    "lateral",
    "側平舉",
    "Lateral Raise",
    "肩部中束",
    "12–15",
    "手肘微曲，向兩側提至舒適、約肩高，慢慢放下。",
    "避免聳肩、甩動或硬抬過高。",
  ),
  ex(
    "triceps",
    "三頭下壓",
    "Triceps Pushdown",
    "三頭肌",
    "12–15",
    "手肘固定身旁，向下伸直手臂時呼氣。",
    "避免整個身體壓下、手肘前後移動或鎖肘。",
  ),
  ex(
    "sitstand",
    "坐站起身",
    "Sit-to-Stand",
    "股四頭肌・臀肌",
    "10–12",
    "用穩固靠牆椅，雙腳踏穩；身體微向前，站起呼氣，再慢慢坐下。",
    "避免倒落椅面、膝內扣或使用有輪椅子。",
    true,
  ),
  ex(
    "incline",
    "上斜推胸",
    "Incline Chest Press",
    "上胸・前三角肌・三頭肌",
    "10–12",
    "使用上斜推胸機，調好座位；肩背貼墊，向前上推時呼氣。",
    "避免過度拱腰、聳肩或下放到肩痛。",
  ),
  ex(
    "pulldown",
    "高位下拉",
    "Lat Pulldown",
    "背闊肌・二頭肌",
    "10–12",
    "固定大腿，胸口微抬；手肘向下，拉向上胸前。",
    "避免頸後下拉、後仰甩動或拉得過低。",
  ),
  ex(
    "bridge",
    "臀橋",
    "Glute Bridge",
    "臀肌・腿後肌",
    "10–12",
    "仰臥屈膝，腳掌踏地；呼氣抬臀至肩髖膝大致成線。",
    "避免用腰過度頂起或頸部用力。",
    true,
  ),
  ex(
    "reverse",
    "反向蝴蝶機",
    "Reverse Pec Deck",
    "肩部後束・中背",
    "12–15",
    "面向靠墊坐穩，胸貼墊；手肘微曲，兩臂向外後打開。",
    "避免聳肩、甩動或腰部後仰。",
  ),
  ex(
    "curl",
    "二頭彎舉",
    "Biceps Curl",
    "二頭肌",
    "12–15",
    "手肘靠近身旁，掌心向上；屈肘呼氣，慢慢放下。",
    "避免甩腰、手肘前移或快速落重。",
  ),
  ex(
    "wallpush",
    "牆上掌上壓",
    "Wall Push-up",
    "胸肌・三頭肌",
    "10–12",
    "雙手貼穩固牆，身體成直線；屈肘靠近牆，再呼氣推開。",
    "避免塌腰或手掌打滑。",
    true,
  ),
  ex(
    "bandrow",
    "彈力帶划船",
    "Band Row",
    "中背・背闊肌",
    "10–12",
    "檢查彈力帶及固定點，坐穩；手肘貼身向後拉。",
    "避免使用破損帶或不穩固固定點。",
  ),
  ex(
    "standingcurl",
    "扶物屈膝",
    "Supported Standing Leg Curl",
    "腿後肌",
    "12–15",
    "扶穩固定支撐，站直；腳跟慢慢靠近臀部，兩邊分別做。",
    "避免拱腰或失去平衡。",
    true,
  ),
  ex(
    "bandpull",
    "彈力帶下拉",
    "Band Pulldown",
    "背闊肌・二頭肌",
    "10–12",
    "用可靠高位固定點，檢查帶；手肘向下拉，緩慢回程。",
    "避免帶彈向面部或頸後下拉。",
  ),
  ex(
    "bandreverse",
    "彈力帶拉開",
    "Band Pull-apart",
    "後肩・中背",
    "12–15",
    "雙手持輕帶在胸前，肩放低；向兩側拉開。",
    "避免聳肩、拱腰或帶彈回。",
  ),
  ex(
    "supportedstand",
    "扶手坐站",
    "Supported Sit-to-Stand",
    "股四頭肌・臀肌",
    "10–12",
    "用穩固靠牆扶手椅，雙手輕輔助起身，緩慢坐下。",
    "避免拉動不穩固傢俬或倒坐。",
    true,
  ),
  ex(
    "marchbridge",
    "交替抬腳臀橋",
    "Marching Glute Bridge",
    "臀肌・核心",
    "10–12",
    "先做好雙腳臀橋，再小幅交替抬一腳；骨盆保持水平。",
    "避免腰部頂起、骨盆轉動或憋氣。",
    true,
  ),
];
export const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
Object.assign(byId.chest, {
  reference:
    "https://www.acefitness.org/resources/everyone/exercise-library/188/seated-chest-press/",
});
Object.assign(byId.row, {
  reference:
    "https://www.acefitness.org/resources/everyone/exercise-library/168/seated-row/",
});
Object.assign(byId.bridge, {
  reference:
    "https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/",
});
Object.assign(byId.sitstand, {
  reference: "https://www.nhs.uk/live-well/exercise/strength-exercises/",
});
Object.assign(byId.incline, {
  reference: commons("Incline-chest-press-1.png"),
});
export const plans = {
  A: ["legpress", "chest", "row", "legcurl", "lateral", "triceps"],
  B: ["sitstand", "incline", "pulldown", "bridge", "reverse", "curl"],
};
export const alternatives = {
  legpress: [
    ["sitstand", "較容易：自重坐站，減少外加負重；動作模式不同。"],
    ["legpress", "較有挑戰：保持同一動作，回程更慢；不自動加重。"],
  ],
  chest: [
    ["wallpush", "較容易：牆上掌上壓，身體越直越輕鬆。"],
    ["incline", "變化：上斜機偏重上胸；不一定更難，先用輕重量。"],
  ],
  row: [
    ["bandrow", "較容易：選輕彈力帶；阻力曲線不同。"],
    ["row", "較有挑戰：拉到身側短暫停頓，不加重。"],
  ],
  legcurl: [
    ["standingcurl", "較容易：扶物自重屈膝；每邊各做目標次數。"],
    ["legcurl", "較有挑戰：慢速回程，不增加負重。"],
  ],
  lateral: [
    ["lateral", "較容易：減輕啞鈴、縮小無痛幅度；仍記為同一動作。"],
    ["lateral", "較有挑戰：放慢回程，不自動加重。"],
  ],
  triceps: [
    ["triceps", "較容易：降低滑輪重量，保持手肘穩定。"],
    ["triceps", "較有挑戰：伸直時短暫停頓，不鎖肘。"],
  ],
  sitstand: [
    ["supportedstand", "較容易：扶手輔助，使用較高、穩固座椅。"],
    ["legpress", "較有挑戰選項：機器腿推需先學設定；先選可控制輕重量。"],
  ],
  incline: [
    ["wallpush", "較容易：牆上掌上壓；上胸刺激不同。"],
    ["incline", "較有挑戰：慢速回程，不自動加重。"],
  ],
  pulldown: [
    ["bandpull", "較容易：輕帶下拉；先確認固定點可靠。"],
    ["pulldown", "較有挑戰：下拉短暫停頓，維持輕至中重量。"],
  ],
  bridge: [
    ["bridge", "較容易：縮小無痛抬臀幅度，保持雙腳落地。"],
    ["marchbridge", "較有挑戰：交替抬腳，先確認可穩定骨盆。"],
  ],
  reverse: [
    ["bandreverse", "較容易：輕帶拉開；阻力與機器不同。"],
    ["reverse", "較有挑戰：打開時短暫停頓，不加重。"],
  ],
  curl: [
    ["curl", "較容易：減輕重量，坐穩做。"],
    ["curl", "較有挑戰：慢速放下，不甩動、不加重。"],
  ],
};
export function phase(week) {
  return week <= 2
    ? {
        title: "建立節奏",
        strength:
          "每週 2 次全身 A / B，每個動作 2 組，保留 3–4 下餘力（RIR 3–4）。輕至中等、可控制重量，以技術為先。",
        cardio: "帶氧 15–20 分鐘，逐步適應。",
      }
    : week <= 4
      ? {
          title: "穩定累積",
          strength:
            "每週 2–3 次力量訓練，A / B 交替。維持可控制負重及餘力，按恢復調整。",
          cardio: "帶氧 20–30 分鐘，循序漸進。",
        }
      : {
          title: week <= 8 ? "循序前進" : "持續練習",
          strength:
            "只有恢復及醫療情況容許，才每週 3 次；需要時保持 2 次或恢復週。不做極限測試、不力竭，不自動加大重量。",
          cardio: "逐步向每週 150 分鐘中等強度帶氧靠近，按能力分段累積。",
        };
}
