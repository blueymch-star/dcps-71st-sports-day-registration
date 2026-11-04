/**
 * 第 71 屆大庄校慶運動會 - 官方統一報名系統 GAS 後端程式碼
 * （支援「庄情薪傳大隊接力」、「圈力衝刺親子趣味競賽」與「校慶服務志工」自動分流寫入、查詢、刪除與名冊管理）
 * 
 * 試算表名稱：71大庄校慶運動會薪傳接力親子競賽熱血志工報名表
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

    // 刪除操作
    if (data.action === "delete") {
      var delRes = deleteRegistrationById(ss, data.regId || data.id);
      return ContentService.createTextOutput(JSON.stringify(delRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 清除所有資料操作
    if (data.action === "clearAll" || data.action === "clearTest") {
      var clearRes = clearAllTestRegistrations(ss);
      return ContentService.createTextOutput(JSON.stringify(clearRes))
        .setMimeType(ContentService.MimeType.JSON);
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
      var parentName = (data.parentName || data.name || "").trim();
      var email = (data.email || "").trim();
      var phone = (data.phone || "").trim();
      var studentName = (data.studentName || data.childName || "").trim();
      var studentGrade = data.studentGrade || "";
      var studentClass = data.studentClass || "";
      var combinedTitle = studentGrade + studentClass + " " + studentName + " ＆ " + parentName + " (家長)";

      // 1. 重複報名審查機制 (學生姓名或家長姓名相同檢查)
      var allFamRows = sheetFamily.getDataRange().getValues();
      for (var f = 1; f < allFamRows.length; f++) {
        var existingParent = String(allFamRows[f][2] || "").trim();
        var existingStudent = String(allFamRows[f][5] || "").trim();

        if (studentName && existingStudent && existingStudent.toLowerCase() === studentName.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "duplicate",
            type: "family",
            duplicateField: "student",
            name: studentName,
            existingId: String(allFamRows[f][1] || ""),
            message: "學生姓名「" + studentName + "」已重複報名！"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        if (parentName && existingParent && existingParent.toLowerCase() === parentName.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "duplicate",
            type: "family",
            duplicateField: "parent",
            name: parentName,
            existingId: String(allFamRows[f][1] || ""),
            message: "家長姓名「" + parentName + "」已重複報名！"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // 2. 額滿停止報名檢查 (上限：正選 20 組、外加候補 2 組，總計 22 組)
      var totalFamilyRows = Math.max(0, sheetFamily.getLastRow() - 1);
      if (totalFamilyRows >= 22) {
        return ContentService.createTextOutput(JSON.stringify({
          result: "closed",
          type: "family",
          message: "報名截止\n若有其它問題請洽活動承辦人員"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var familyStatus = "";
      if (totalFamilyRows < 20) {
        familyStatus = "正選 (第 " + (totalFamilyRows + 1) + " 組)";
      } else if (totalFamilyRows === 20) {
        familyStatus = "候補 1 (第 1 順位候補)";
      } else if (totalFamilyRows === 21) {
        familyStatus = "候補 2 (第 2 順位候補)";
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

      // 3. 自動發 Email 通知：報名者及寄給管理者 (stud03@ttps.hc.edu.tw)
      var emailNoticeSent = false;
      try {
        var adminEmail = "stud03@ttps.hc.edu.tw";
        var famSubject = "【大庄國小 71 週年校慶】圈力衝刺親子趣味競賽 - 報名確認通知 (" + studentName + " ＆ " + parentName + " / " + regId + ")";
        var rulesText = 
          "1. 報名經錄取後，比賽前會發下分組通知，請務必如期參加。\n" +
          "2. 報名的親子請在比賽前充分熱身，以利身體能在活動中舒展，避免運動傷害。\n" +
          "3. 報名完畢後，將校慶前1 週，將編排的組別及注意事項通知貴家長。";

        var famEmailBody = 
          "親愛的家長 " + parentName + " 您好：\n\n" +
          "感謝您與貴子弟報名參加【新竹市大庄國小 71 週年校慶運動會 - 圈力衝刺親子趣味競賽】！\n" +
          "大會已成功登錄您的報名資料：\n\n" +
          "========================================\n" +
          "【報名資料確認】\n" +
          "報名編號：" + regId + "\n" +
          "家長姓名：" + parentName + "\n" +
          "學生姓名：" + studentName + " (" + studentGrade + " " + studentClass + ")\n" +
          "聯絡電話：" + phone + "\n" +
          "錄取狀態：" + familyStatus + "\n" +
          "活動時間：115年12月12日 (六) 10:40 ～ 10:50\n" +
          "活動地點：本校操場中央草皮區\n" +
          "登記時間：" + timestamp + "\n" +
          "========================================\n\n" +
          "【親子趣味競賽重要須知】\n" +
          rulesText + "\n\n" +
          "若有其它問題請洽活動承辦人員 (大庄國小學務處體育組 03-5384035 分機 607 / Email: " + adminEmail + ")\n\n" +
          "新竹市大庄國小 71 週年校慶運動會籌備委員會 敬啟";

        // 寄給報名者
        if (email && email.indexOf("@") !== -1) {
          MailApp.sendEmail({
            to: email,
            subject: famSubject,
            body: famEmailBody
          });
        }

        // 寄給管理者
        MailApp.sendEmail({
          to: adminEmail,
          subject: "[管理者副本通知] 親子趣味賽新報名：" + studentName + " ＆ " + parentName + " (" + regId + ")",
          body: "【大庄國小 71 週年校慶 - 親子趣味競賽新報名通知】\n\n" +
                "有新組別完成線上登記，摘要如下：\n" +
                "----------------------------------------\n" +
                "報名編號：" + regId + "\n" +
                "家長姓名：" + parentName + "\n" +
                "學生姓名：" + studentName + " (" + studentGrade + " " + studentClass + ")\n" +
                "聯絡電話：" + phone + "\n" +
                "電子郵件：" + email + "\n" +
                "錄取狀態：" + familyStatus + "\n" +
                "登記時間：" + timestamp + "\n" +
                "----------------------------------------\n\n" +
                "系統已自動寄發 3 點參賽須知信件至該家長信箱。\n" +
                "若有其它問題請洽活動承辦人員。"
        });

        emailNoticeSent = true;
      } catch (famMailErr) {
        Logger.log("親子賽發送 Email 失敗: " + famMailErr);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        type: "family",
        regId: regId,
        status: familyStatus,
        currentCount: totalFamilyRows + 1,
        emailNoticeSent: emailNoticeSent,
        message: "親子趣味競賽報名已成功寫入 Google 試算表，並已發送 Email 通知！"
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
    var name = (data.name || "").trim();
    var gender = data.gender || "";
    var emailRelay = (data.email || "").trim();
    var birthYear = data.birthYear || "";
    var phoneRelay = (data.phone || "").trim();
    var gradYear = data.gradYear || "0";

    // 1. 重複報名審查機制：名字相同阻擋報名
    var allRows = sheetRelay.getDataRange().getValues();
    for (var i = 1; i < allRows.length; i++) {
      var rowName = String(allRows[i][3] || "").trim();
      if (rowName && rowName.toLowerCase() === name.toLowerCase()) {
        return ContentService.createTextOutput(JSON.stringify({
          result: "duplicate",
          type: "relay",
          name: name,
          existingId: String(allRows[i][1] || ""),
          message: "選手姓名「" + name + "」已重複報名！"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2. 計算各組目前報名人數與錄取/候補判定
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

    // 3. 自動發 Email 通知：報名者及寄給管理者 (stud03@ttps.hc.edu.tw)
    var emailNoticeSent = false;
    try {
      var adminEmail = "stud03@ttps.hc.edu.tw";
      var mailSubject = "【大庄國小 71 週年校慶】庄情薪傳大隊接力賽 - 報名確認通知 (" + name + " / " + relayRegId + ")";
      var rulesText = 
        "1.報名經錄取後，比賽前1週在本報名網站公告錄取名單，請務必如期參加，如臨時缺席將造成活動無法順利進行，故請審慎考慮後再報名。\n" +
        "2.報名的校友及家長請在比賽前充分熱身，以利身體能在活動中舒展，避免運動傷害。\n" +
        "3.報名完畢後，將校慶前1週，將編排的組別及注意事項Email通知選手。\n" +
        "4.心臟功能不佳、氣喘或身體和不適者，請勿報名參加，請自負自身安全責任。\n" +
        "5.校慶當日請著運動鞋及方便運動衣褲。";

      var emailBody = 
        "親愛的 " + name + " 選手 您好：\n\n" +
        "感謝您報名參加【新竹市大庄國小 71 週年校慶運動會 - 庄情薪傳大隊接力賽】！\n" +
        "您的報名已完成登記，資料如下：\n\n" +
        "========================================\n" +
        "【報名資料確認】\n" +
        "報名編號：" + relayRegId + "\n" +
        "選手姓名：" + name + "\n" +
        "參賽組別：" + category + "\n" +
        "選手性別：" + gender + "\n" +
        "出生年次：" + birthYear + "\n" +
        "行動電話：" + phoneRelay + "\n" +
        "校友畢業年度：" + (gradYear === "0" ? "非校友 (填0)" : "民國 " + gradYear + " 年") + "\n" +
        "錄取狀態：" + status + "\n" +
        "登記時間：" + timestamp + "\n" +
        "========================================\n\n" +
        "【大隊接力重要須知】\n" +
        rulesText + "\n\n" +
        "大會競賽時間：2026 年 12 月 12 日 (六)\n" +
        "檢錄集合時間：11:40 ～ 11:50 於綜合球場集合檢錄\n" +
        "若有其它問題請洽活動承辦人員 (大庄國小學務處體育組 03-5384035 分機 607 / Email: " + adminEmail + ")\n\n" +
        "新竹市大庄國小 71 週年校慶運動會籌備委員會 敬啟";

      // 發送給報名者
      if (emailRelay && emailRelay.indexOf("@") !== -1) {
        MailApp.sendEmail({
          to: emailRelay,
          subject: mailSubject,
          body: emailBody
        });
      }

      // 發送給管理者
      MailApp.sendEmail({
        to: adminEmail,
        subject: "[管理者副本通知] 接力賽新報名：" + name + " (" + category + " / " + relayRegId + ")",
        body: "【大庄國小 71 週年校慶 - 接力賽線上報名即時通知】\n\n" +
              "有新選手完成線上登記，摘要如下：\n" +
              "----------------------------------------\n" +
              "報名編號：" + relayRegId + "\n" +
              "選手姓名：" + name + "\n" +
              "參賽組別：" + category + "\n" +
              "選手性別：" + gender + "\n" +
              "行動電話：" + phoneRelay + "\n" +
              "電子郵件：" + emailRelay + "\n" +
              "錄取狀態：" + status + "\n" +
              "登記時間：" + timestamp + "\n" +
              "----------------------------------------\n\n" +
              "系統已同步寄發 5 點參賽須知信件給選手。\n" +
              "若有其它問題請洽活動承辦人員。"
      });

      emailNoticeSent = true;
    } catch (eMailErr) {
      Logger.log("自動發送 Email 失敗: " + eMailErr);
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      type: "relay",
      regId: relayRegId,
      status: status,
      currentCount: currentGroupCount + 1,
      emailNoticeSent: emailNoticeSent,
      message: "大隊接力報名已成功寫入 Google 試算表，並已發送 Email 通知！"
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
  var params = e ? e.parameter || {} : {};
  var action = params.action || "";

  // 1. 刪除指定編號
  if (action === "delete") {
    var regId = params.regId || params.id;
    var delRes = deleteRegistrationById(ss, regId);
    return ContentService.createTextOutput(JSON.stringify(delRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 清除所有測試名單
  if (action === "clearAll" || action === "clearTest") {
    var clearRes = clearAllTestRegistrations(ss);
    return ContentService.createTextOutput(JSON.stringify(clearRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3. 取得所有名冊
  if (action === "getAll" || action === "list") {
    var allData = getAllRegistrations(ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      data: allData,
      serverTime: new Date()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. 預設回傳人數統計
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

// 輔助函式：根據報名編號刪除試算表資料列
function deleteRegistrationById(ss, regId) {
  if (!regId) return { result: "error", message: "未提供報名編號" };
  var targetSheets = ["大隊接力報名名冊", "親子趣味競賽名冊", "校慶服務志工名冊"];
  var deleted = false;
  var foundSheet = "";

  for (var s = 0; s < targetSheets.length; s++) {
    var sheet = ss.getSheetByName(targetSheets[s]);
    if (!sheet || sheet.getLastRow() <= 1) continue;
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var rowId = String(data[r][1] || data[r][0] || "").trim();
      if (rowId === String(regId).trim()) {
        sheet.deleteRow(r + 1);
        deleted = true;
        foundSheet = targetSheets[s];
        break;
      }
    }
    if (deleted) break;
  }

  return {
    result: deleted ? "success" : "not_found",
    deleted: deleted,
    regId: regId,
    sheet: foundSheet,
    message: deleted ? ("已成功從「" + foundSheet + "」刪除編號 " + regId) : ("找不到此編號 " + regId)
  };
}

// 輔助函式：清除所有工作表的測試資料（保留表頭）
function clearAllTestRegistrations(ss) {
  var targetSheets = ["大隊接力報名名冊", "親子趣味競賽名冊", "校慶服務志工名冊"];
  var clearedCount = 0;
  for (var s = 0; s < targetSheets.length; s++) {
    var sheet = ss.getSheetByName(targetSheets[s]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      clearedCount++;
    }
  }
  return {
    result: "success",
    clearedSheets: clearedCount,
    message: "Google 試算表內所有名冊資料已清空完成（表頭格式已完整保留）。"
  };
}

// 輔助函式：讀取所有工作表報名名冊
function getAllRegistrations(ss) {
  var result = {
    relay: [],
    family: [],
    volunteer: []
  };

  // 1. 接力賽
  var sRelay = ss.getSheetByName("大隊接力報名名冊");
  if (sRelay && sRelay.getLastRow() > 1) {
    var rowsRelay = sRelay.getDataRange().getValues();
    for (var i = 1; i < rowsRelay.length; i++) {
      var r = rowsRelay[i];
      result.relay.push({
        timestamp: formatDateVal(r[0]),
        id: String(r[1]),
        category: String(r[2]),
        name: String(r[3]),
        gender: String(r[4]),
        email: String(r[5]),
        birthYear: String(r[6]),
        phone: String(r[7]),
        gradYear: String(r[8]),
        status: String(r[9])
      });
    }
  }

  // 2. 親子賽
  var sFamily = ss.getSheetByName("親子趣味競賽名冊");
  if (sFamily && sFamily.getLastRow() > 1) {
    var rowsFamily = sFamily.getDataRange().getValues();
    for (var j = 1; j < rowsFamily.length; j++) {
      var f = rowsFamily[j];
      result.family.push({
        timestamp: formatDateVal(f[0]),
        id: String(f[1]),
        parentName: String(f[2]),
        email: String(f[3]),
        phone: String(f[4]),
        studentName: String(f[5]),
        studentGrade: String(f[6]),
        studentClass: String(f[7]),
        combinedTitle: String(f[8]),
        status: String(f[9])
      });
    }
  }

  // 3. 志工
  var sVol = ss.getSheetByName("校慶服務志工名冊");
  if (sVol && sVol.getLastRow() > 1) {
    var rowsVol = sVol.getDataRange().getValues();
    for (var k = 1; k < rowsVol.length; k++) {
      var v = rowsVol[k];
      result.volunteer.push({
        timestamp: formatDateVal(v[0]),
        id: String(v[1]),
        studentName: String(v[2]),
        schoolClass: String(v[3]),
        phoneSelf: String(v[4]),
        phoneParent: String(v[5]),
        parentRel: String(v[6]),
        email: String(v[7]),
        isAlumni: String(v[8]),
        serviceRoles: String(v[9]),
        status: String(v[10])
      });
    }
  }

  return result;
}

function formatDateVal(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
  }
  return String(val);
}
