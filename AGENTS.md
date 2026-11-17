# 夢疑 MOE

動手前先讀 `開發規則.md`（唯一的規則來源）。重點：
- 回覆用正體中文、白話、先講結論；不要對使用者講檔名和函式名。
- 新功能用 `js/core.js` 的 `Hook.on`／`Interact.add`／`SettingsRows.add`，不要再包裝全域函式。
- 改完跑 `http://localhost:埠號/?dev=1` 的 `await MOE_DEV.smoke()`，全過才發布。
- 不要讀 `js/artwork.js`（7.8MB），不要改美術工作階段的檔案。
