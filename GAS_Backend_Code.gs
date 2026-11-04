/**
 * 第 71 屆大庄校慶運動會 - 官方統一報名系統 GAS 後端程式碼
 * （支援「庄情薪傳大隊接力」與「圈力衝刺親子趣味競賽」雙工作表自動分流寫入）
 * 
 * 【使用說明】：
 * 1. 在 Google 雲端硬碟建立一個新的「Google 試算表」，命名為「71校慶運動會_報名總資料庫」。
 * 2. 點擊頂部選單「擴充功能」 -> 「Apps Script」。
 * 3. 將本檔案全部內容複製並貼上到 Apps Script 編輯器中（覆蓋預設的 Code.gs）。
 * 4. 點選右上角「部署」 -> 「新增部署作業」：
 *    - 種類選擇：「網頁應用程式 (Web App)」
 *    - 說明：71校慶運動會統一報名接收端
 *    - 執行身分：我 (您的 Google 帳號)
 *    - 誰可以存取：任何人 (Anyone)  <--- 務必選擇「任何人」！
 * 5. 點擊「部署」，完成權限授權，複製產生的「網頁應用程式網址 (Web App URL)」。
 * 6. 在網站中貼上該網址即可全自動同步寫入試算表！
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 鎖定防並發衝突

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }

    var formType = data.type || (data.parentName ? "family" : "relay");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");

    // ==========================================
    // 分流 1：親子趣味競賽（圈力衝刺）
    // ==========================================
    if (formType === "family" || formType === "family-games") {
      var sheetFamily = ss.getSheetByName("親子趣味競賽名冊");
      if (!sheetFamily) {
        sheetFamily = ss.insertSheet("親子趣味競賽名冊");
      }
      
      // 若是全新工作表，初始化表頭
      if (sheetFamily.getLastRow() === 0) {
        sheetFamily.appendRow([
          "報名時間",
          "報名編號",
          "家長姓名",
          "電郵信箱",
          "聯絡電話",
          "學生姓名",
          "學生年級",
          "學生班級",
          "全名組合",
          "錄取狀態"
        ]);
        sheetFamily.getRange(1, 1, 1, 10).setBackground("#004f35").setFontColor("#ffffff").setFontWeight("bold");
      }

      var regId = data.regId || ("DC71-FAM-" + Math.floor(1000 + Math.random() * 9000));
      var parentName = data.parentName || data.name || "";
      var email = data.email || "";
      var phone = data.phone || "";
      var studentName = data.studentName || data.childName || "";
      var studentGrade = data.studentGrade || "";
      var studentClass = data.studentClass || "";
      var combinedTitle = studentGrade + studentClass + " " + studentName + " ＆ " + parentName + " (家長)";

      // 計算目前總報名數，名額上限：正選 20 組、外加候補 2 組 (總計 22 組)
      var totalFamilyRows = Math.max(0, sheetFamily.getLastRow() - 1);
      var familyStatus = "";
      if (totalFamilyRows < 20) {
        familyStatus = "正選 (第 " + (totalFamilyRows + 1) + " 組)";
      } else if (totalFamilyRows === 20) {
        familyStatus = "候補 1 (第 1 順位候補)";
      } else if (totalFamilyRows === 21) {
        familyStatus = "候補 2 (第 2 順位候補)";
      } else {
        familyStatus = "額滿未錄取 (已超額截止)";
      }

      sheetFamily.appendRow([
        timestamp,
        regId,
        parentName,
        email,
        phone,
        studentName,
        studentGrade,
        studentClass,
        combinedTitle,
        familyStatus
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        type: "family",
        regId: regId,
        status: familyStatus,
        currentCount: totalFamilyRows + 1,
        message: "親子趣味競賽報名已成功寫入 Google 試算表！"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 分流 2：校慶熱血服務志工
    // ==========================================
    if (formType === "volunteer" || formType === "volunteers") {
      var sheetVol = ss.getSheetByName("校慶服務志工名冊");
      if (!sheetVol) {
        sheetVol = ss.insertSheet("校慶服務志工名冊");
      }

      if (sheetVol.getLastRow() === 0) {
        sheetVol.appendRow([
          "報名時間",
          "報名編號",
          "學生姓名",
          "現就讀學校班級",
          "學生手機",
          "家長手機",
          "家長姓名與關係",
          "Email",
          "是否為校友",
          "希望服務組別",
          "錄取狀態"
        ]);
        sheetVol.getRange(1, 1, 1, 11).setBackground("#fd761a").setFontColor("#ffffff").setFontWeight("bold");
      }

      var volRegId = data.regId || ("DC71-VOL-" + Math.floor(1000 + Math.random() * 9000));
      var isAlumni = data.isAlumni || "否";
      var currentVolRows = Math.max(0, sheetVol.getLastRow() - 1);
      var volStatus = isAlumni.indexOf("是") !== -1 ? "優先錄取 (校友)" : "審核中";
      if (currentVolRows >= 20) {
        volStatus = "候補 (第 " + (currentVolRows - 20 + 1) + " 順位)";
      }

      sheetVol.appendRow([
        timestamp,
        volRegId,
        data.studentName || "",
        data.schoolClass || "",
        data.phoneSelf || data.phone || "",
        data.phoneParent || "",
        data.parentRel || "",
        data.email || "",
        isAlumni,
        data.serviceRoles || "",
        volStatus
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        type: "volunteer",
        regId: volRegId,
        status: volStatus,
        currentCount: currentVolRows + 1,
        message: "志工報名已成功寫入 Google 試算表！"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 分流 3：庄情薪傳大隊接力賽
    // ==========================================
    var sheetRelay = ss.getSheetByName("大隊接力報名名冊");
    if (!sheetRelay) {
      sheetRelay = ss.insertSheet("大隊接力報名名冊");
    }

    if (sheetRelay.getLastRow() === 0) {
      sheetRelay.appendRow([
        "報名時間",
        "報名編號",
        "參賽組別",
        "姓名",
        "性別",
        "Email",
        "出生年次 (民國)",
        "行動電話",
        "校友畢業年度",
        "錄取狀態"
      ]);
      sheetRelay.getRange(1, 1, 1, 10).setBackground("#1d4ed8").setFontColor("#ffffff").setFontWeight("bold");
    }

    var relayRegId = data.regId || ("DC71-RELAY-" + Math.floor(1000 + Math.random() * 9000));
    var category = data.category || "校友組";
    var name = data.name || "";
    var gender = data.gender || "";
    var emailRelay = data.email || "";
    var birthYear = data.birthYear || "";
    var phoneRelay = data.phone || "";
    var gradYear = data.gradYear || "0";

    // 計算各組目前報名人數
    var allRows = sheetRelay.getDataRange().getValues();
    var currentGroupCount = 0;
    for (var i = 1; i < allRows.length; i++) {
      if (allRows[i][2] === category) {
        currentGroupCount++;
      }
    }

    var status = "正選";
    var maxQuota = 8;
    if (category.indexOf("校友") !== -1) {
      maxQuota = 24;
    }
    if (currentGroupCount >= maxQuota) {
      status = "候補 (第 " + (currentGroupCount - maxQuota + 1) + " 順位)";
    }

    sheetRelay.appendRow([
      timestamp,
      relayRegId,
      category,
      name,
      gender,
      emailRelay,
      birthYear,
      phoneRelay,
      gradYear,
      status
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      type: "relay",
      regId: relayRegId,
      status: status,
      currentCount: currentGroupCount + 1,
      message: "大隊接力報名已成功寫入 Google 試算表！"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetFamily = ss.getSheetByName("親子趣味競賽名冊");
  var sheetRelay = ss.getSheetByName("大隊接力報名名冊");
  var sheetVol = ss.getSheetByName("校慶服務志工名冊");
  
  var familyCount = sheetFamily ? Math.max(0, sheetFamily.getLastRow() - 1) : 0;
  var relayCount = sheetRelay ? Math.max(0, sheetRelay.getLastRow() - 1) : 0;
  var volunteerCount = sheetVol ? Math.max(0, sheetVol.getLastRow() - 1) : 0;
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    familyCount: familyCount,
    relayCount: relayCount,
    volunteerCount: volunteerCount,
    serverTime: new Date()
  })).setMimeType(ContentService.MimeType.JSON);
}
