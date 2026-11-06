/**
 * 第 71 屆大庄校慶運動會 - 官方統一報名系統 GAS 後端程式碼
 * （支援「庄情薪傳大隊接力」、「圈力衝刺親子趣味競賽」與「校慶服務志工」自動分流寫入、查詢、刪除與名冊管理）
 * 
 * 擴充功能：LINE Messaging API 智慧推播核心
 * - 報名成功即時推播數位收執單 (Flex Message)
 * - 管理員一鍵推播錄取通知 (Flex Message)
 * - 管理員賽前行前提醒與大會廣播 (Flex Message)
 * 
 * 試算表名稱：71大庄校慶運動會薪傳接力親子競賽熱血志工報名表
 */

// ==========================================
// LINE 官方帳號 Messaging API 設定
// ==========================================
var DEFAULT_LINE_ACCESS_TOKEN = "YOUR_LINE_CHANNEL_ACCESS_TOKEN";

function getLineToken() {
  var prop = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  if (prop && prop.trim().length > 10) {
    return prop.trim();
  }
  return DEFAULT_LINE_ACCESS_TOKEN;
}

function setLineToken(token) {
  if (token && token.trim()) {
    PropertiesService.getScriptProperties().setProperty("LINE_CHANNEL_ACCESS_TOKEN", token.trim());
    return { result: "success", message: "LINE Channel Access Token 已成功儲存至 Script Properties！" };
  }
  return { result: "error", message: "Token 不能為空" };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 鎖定防並發衝突

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureLineColumns(ss);
    
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

    // 0. LINE 專案 Token 管理與推播操作
    if (data.action === "updateLineToken" || data.action === "saveLineToken") {
      var tokenRes = setLineToken(data.token);
      return ContentService.createTextOutput(JSON.stringify(tokenRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "sendAdmissionNotice" || data.action === "sendAdmissionNotices") {
      var admRes = sendAdmissionNotices(ss, data);
      return ContentService.createTextOutput(JSON.stringify(admRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "sendPreGameNotice" || data.action === "sendCustomNotice") {
      var preRes = sendPreGameNotices(ss, data);
      return ContentService.createTextOutput(JSON.stringify(preRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "testLinePush") {
      var testRes = testLinePushToUser(data.testUserId || data.userId);
      return ContentService.createTextOutput(JSON.stringify(testRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 公告管理操作（新增/發布即時公告）
    if (data.action === "addAnnouncement" || data.action === "saveAnnouncement") {
      var annAddRes = addAnnouncementToSheet(ss, data);
      return ContentService.createTextOutput(JSON.stringify(annAddRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 取消報名並移動至「已取消報名」工作表
    if (data.action === "cancel") {
      var cancelRes = cancelAndMoveRegistration(ss, data);
      return ContentService.createTextOutput(JSON.stringify(cancelRes))
        .setMimeType(ContentService.MimeType.JSON);
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

    // 獲取前端 LIFF 傳入之 LINE 識別資訊
    var lineUserId = String(data.lineUserId || "").trim();
    var lineDisplayName = String(data.lineDisplayName || "").trim();
    var lineNoticeStatus = lineUserId ? "連動完成" : "未連動 LINE";

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
          "錄取狀態",
          "LINE_USER_ID",
          "LINE暱稱",
          "通知狀態"
        ]);
        sheetFamily.getRange(1, 1, 1, 13).setBackground("#004f35").setFontColor("#ffffff").setFontWeight("bold");
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

      // LINE 即時推播收執單
      if (lineUserId && lineUserId.startsWith("U")) {
        try {
          var flexFam = createRegistrationReceiptFlex({
            projectName: "圈力衝刺 親子趣味競賽",
            regId: regId,
            name: parentName + " ＆ " + studentName,
            subInfo: studentGrade + " " + studentClass,
            status: familyStatus,
            themeColor: "#004f35"
          });
          var pushFamRes = sendLinePush(lineUserId, flexFam);
          if (pushFamRes.success) {
            lineNoticeStatus = "已推播收執單 (" + Utilities.formatDate(new Date(), "Asia/Taipei", "MM/dd HH:mm") + ")";
          } else {
            lineNoticeStatus = "推播失敗: " + (pushFamRes.error || pushFamRes.code);
          }
        } catch (lFamErr) {
          lineNoticeStatus = "LINE異常: " + lFamErr;
        }
      }

      sheetFamily.appendRow([
        timestamp,
        regId,
        parentName,
        email,
        formatPhoneForSheet(phone),
        studentName,
        studentGrade,
        studentClass,
        combinedTitle,
        familyStatus,
        lineUserId,
        lineDisplayName,
        lineNoticeStatus
      ]);
      var lastRowFam = sheetFamily.getLastRow();
      sheetFamily.getRange(lastRowFam, 5).setNumberFormat('@');

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
          "LINE 連動狀態：" + (lineUserId ? ("已連動 (" + lineDisplayName + ")") : "未連動") + "\n" +
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
            name: "大庄國小71校慶籌備委員會 (學務處體育組)",
            replyTo: adminEmail,
            subject: famSubject,
            body: famEmailBody
          });
        }

        // 寄給管理者
        MailApp.sendEmail({
          to: adminEmail,
          name: "大庄國小71校慶報名系統",
          replyTo: adminEmail,
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
                "LINE 狀態：" + lineNoticeStatus + "\n" +
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
        lineUserId: lineUserId,
        lineNoticeStatus: lineNoticeStatus,
        emailNoticeSent: emailNoticeSent,
        message: "親子趣味競賽報名已成功寫入 Google 試算表！" + (lineUserId ? "（LINE 報名卡片已即時推播）" : "")
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
          "錄取狀態",
          "LINE_USER_ID",
          "LINE暱稱",
          "通知狀態"
        ]);
        sheetVol.getRange(1, 1, 1, 14).setBackground("#fd761a").setFontColor("#ffffff").setFontWeight("bold");
      }

      var volRegId = data.regId || ("DC71-VOL-" + Math.floor(1000 + Math.random() * 9000));
      var isAlumni = data.isAlumni || "否";
      var currentVolRows = Math.max(0, sheetVol.getLastRow() - 1);
      var volStatus = isAlumni.indexOf("是") !== -1 ? "優先錄取 (校友)" : "審核中";
      if (currentVolRows >= 20) {
        volStatus = "候補 (第 " + (currentVolRows - 20 + 1) + " 順位)";
      }

      // LINE 即時推播收執單
      if (lineUserId && lineUserId.startsWith("U")) {
        try {
          var flexVol = createRegistrationReceiptFlex({
            projectName: "校慶熱血服務志工",
            regId: volRegId,
            name: data.studentName || "",
            subInfo: (data.schoolClass || "") + "・" + (data.serviceRoles || "綜合支援組"),
            status: volStatus,
            themeColor: "#fd761a"
          });
          var pushVolRes = sendLinePush(lineUserId, flexVol);
          if (pushVolRes.success) {
            lineNoticeStatus = "已推播收執單 (" + Utilities.formatDate(new Date(), "Asia/Taipei", "MM/dd HH:mm") + ")";
          } else {
            lineNoticeStatus = "推播失敗: " + (pushVolRes.error || pushVolRes.code);
          }
        } catch (lVolErr) {
          lineNoticeStatus = "LINE異常: " + lVolErr;
        }
      }

      sheetVol.appendRow([
        timestamp,
        volRegId,
        data.studentName || "",
        data.schoolClass || "",
        formatPhoneForSheet(data.phoneSelf || data.phone || ""),
        formatPhoneForSheet(data.phoneParent || ""),
        data.parentRel || "",
        data.email || "",
        isAlumni,
        data.serviceRoles || "",
        volStatus,
        lineUserId,
        lineDisplayName,
        lineNoticeStatus
      ]);
      var lastRowVol = sheetVol.getLastRow();
      sheetVol.getRange(lastRowVol, 5).setNumberFormat('@');
      sheetVol.getRange(lastRowVol, 6).setNumberFormat('@');

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        type: "volunteer",
        regId: volRegId,
        status: volStatus,
        currentCount: currentVolRows + 1,
        lineUserId: lineUserId,
        lineNoticeStatus: lineNoticeStatus,
        message: "志工報名已成功寫入 Google 試算表！" + (lineUserId ? "（LINE 報名卡片已即時推播）" : "")
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
        "錄取狀態",
        "LINE_USER_ID",
        "LINE暱稱",
        "通知狀態"
      ]);
      sheetRelay.getRange(1, 1, 1, 13).setBackground("#1d4ed8").setFontColor("#ffffff").setFontWeight("bold");
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

    // LINE 即時推播收執單
    if (lineUserId && lineUserId.startsWith("U")) {
      try {
        var flexRelay = createRegistrationReceiptFlex({
          projectName: "庄情薪傳大隊接力賽",
          regId: relayRegId,
          name: name,
          subInfo: category + "・" + (gender || "選手"),
          status: status,
          themeColor: "#1d4ed8"
        });
        var pushRelayRes = sendLinePush(lineUserId, flexRelay);
        if (pushRelayRes.success) {
          lineNoticeStatus = "已推播收執單 (" + Utilities.formatDate(new Date(), "Asia/Taipei", "MM/dd HH:mm") + ")";
        } else {
          lineNoticeStatus = "推播失敗: " + (pushRelayRes.error || pushRelayRes.code);
        }
      } catch (lRelayErr) {
        lineNoticeStatus = "LINE異常: " + lRelayErr;
      }
    }

    sheetRelay.appendRow([
      timestamp,
      relayRegId,
      category,
      name,
      gender,
      emailRelay,
      birthYear,
      formatPhoneForSheet(phoneRelay),
      gradYear,
      status,
      lineUserId,
      lineDisplayName,
      lineNoticeStatus
    ]);
    var lastRowRelay = sheetRelay.getLastRow();
    sheetRelay.getRange(lastRowRelay, 8).setNumberFormat('@');

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
        "LINE 連動狀態：" + (lineUserId ? ("已連動 (" + lineDisplayName + ")") : "未連動") + "\n" +
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
          name: "大庄國小71校慶籌備委員會 (學務處體育組)",
          replyTo: adminEmail,
          subject: mailSubject,
          body: emailBody
        });
      }

      // 發送給管理者
      MailApp.sendEmail({
        to: adminEmail,
        name: "大庄國小71校慶報名系統",
        replyTo: adminEmail,
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
              "LINE 狀態：" + lineNoticeStatus + "\n" +
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
      lineUserId: lineUserId,
      lineNoticeStatus: lineNoticeStatus,
      emailNoticeSent: emailNoticeSent,
      message: "大隊接力報名已成功寫入 Google 試算表！" + (lineUserId ? "（LINE 報名卡片已即時推播）" : "")
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
  fixExistingPhones(ss);
  ensureLineColumns(ss);

  var params = e ? e.parameter || {} : {};
  var action = params.action || "";

  // 0. 取消報名並移動至「已取消報名」工作表
  if (action === "cancel") {
    var cancelRes = cancelAndMoveRegistration(ss, params);
    return ContentService.createTextOutput(JSON.stringify(cancelRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 0.1 取得大會即時推播公告
  if (action === "getAnnouncements" || action === "announcements") {
    var annRes = getAnnouncementsFromSheet(ss);
    return ContentService.createTextOutput(JSON.stringify(annRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

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
      lineTokenSet: (getLineToken() !== DEFAULT_LINE_ACCESS_TOKEN),
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
    lineTokenSet: (getLineToken() !== DEFAULT_LINE_ACCESS_TOKEN),
    serverTime: new Date()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// LINE 核心推播函式與 Flex 卡片產生器
// ==========================================

function sendLinePush(userId, messages) {
  if (!userId || !userId.startsWith("U")) {
    return { success: false, error: "無效之 LINE User ID" };
  }
  var token = getLineToken();
  if (!token || token === DEFAULT_LINE_ACCESS_TOKEN) {
    return { success: false, error: "尚未設定 LINE_CHANNEL_ACCESS_TOKEN" };
  }

  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    to: userId,
    messages: Array.isArray(messages) ? messages : [messages]
  };

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var resCode = response.getResponseCode();
    var resText = response.getContentText();
    return {
      success: resCode === 200,
      code: resCode,
      response: resText
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// 產生「報名完成收執單」Flex Message
function createRegistrationReceiptFlex(data) {
  var altText = "【大庄71校慶】報名成功收執單 (" + data.projectName + " - " + data.name + ")";
  var bubble = {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": data.themeColor || "#004f35",
      "paddingAll": "18px",
      "contents": [
        {
          "type": "text",
          "text": "第 71 屆大庄國小校慶運動會",
          "color": "#ffffff",
          "size": "xs",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "🎉 報名登記完成收執單",
          "color": "#ffffff",
          "size": "xl",
          "weight": "bold",
          "margin": "sm"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "報名項目", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.projectName || ""), "weight": "bold", "color": "#111111", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "報名編號", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.regId || ""), "weight": "bold", "color": data.themeColor || "#004f35", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "選手姓名", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.name || ""), "weight": "bold", "color": "#111111", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "參賽組別", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.subInfo || ""), "color": "#333333", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "錄取狀態", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.status || "正選"), "weight": "bold", "color": data.status.indexOf("候補") !== -1 ? "#d97706" : "#059669", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "separator",
          "margin": "lg"
        },
        {
          "type": "text",
          "text": "📌 溫馨提醒：本官方帳號已自動鎖定您的報名資料，後續錄取公告與賽前行前提醒將直接在此推播給您！",
          "size": "xs",
          "color": "#777777",
          "wrap": true,
          "margin": "md"
        }
      ]
    }
  };
  return {
    type: "flex",
    altText: altText,
    contents: bubble
  };
}

// 產生「錄取通知書」Flex Message
function createAdmissionFlex(data) {
  var altText = "【大庄71校慶】🏆 恭喜正式錄取通知 (" + data.projectName + " - " + data.name + ")";
  var bubble = {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#0284c7",
      "paddingAll": "18px",
      "contents": [
        {
          "type": "text",
          "text": "第 71 屆大庄國小校慶運動會",
          "color": "#ffffff",
          "size": "xs",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "🏆 正式錄取出賽通知",
          "color": "#ffffff",
          "size": "xl",
          "weight": "bold",
          "margin": "sm"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": "恭喜 " + data.name + " 選手正式錄取！",
          "weight": "bold",
          "size": "md",
          "color": "#0369a1"
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "報名項目", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.projectName || ""), "weight": "bold", "color": "#111111", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "報名編號", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.regId || ""), "weight": "bold", "color": "#0284c7", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "競賽日期", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": "115年12月12日 (六)", "weight": "bold", "color": "#111111", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "檢錄地點", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.location || "本校操場"), "weight": "bold", "color": "#111111", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "檢錄時間", "color": "#666666", "size": "sm", "flex": 3 },
            { "type": "text", "text": String(data.checkinTime || "賽前20分鐘"), "weight": "bold", "color": "#b91c1c", "size": "sm", "flex": 7 }
          ]
        },
        {
          "type": "separator",
          "margin": "lg"
        },
        {
          "type": "text",
          "text": "⚠️ 重要叮嚀：請攜帶健保卡或學生證於檢錄時間準時報到；如臨時不克出席請儘早洽主辦單位，以利候補選手遞補。",
          "size": "xs",
          "color": "#666666",
          "wrap": true,
          "margin": "md"
        }
      ]
    }
  };
  return {
    type: "flex",
    altText: altText,
    contents: bubble
  };
}

// 產生「賽前行前提醒」Flex Message
function createPreGameFlex(data) {
  var altText = "【大庄71校慶】📢 " + (data.noticeTitle || "賽前行前提醒通知");
  var bubble = {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#7c3aed",
      "paddingAll": "18px",
      "contents": [
        {
          "type": "text",
          "text": "第 71 屆大庄國小校慶運動會",
          "color": "#ffffff",
          "size": "xs",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "📢 賽前行前提醒通知",
          "color": "#ffffff",
          "size": "xl",
          "weight": "bold",
          "margin": "sm"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": String(data.noticeTitle || "運動會即將盛大登場！"),
          "weight": "bold",
          "size": "lg",
          "color": "#6d28d9",
          "wrap": true
        },
        {
          "type": "text",
          "text": String(data.noticeContent || "親愛的選手您好，校慶運動會即將展開，請備齊所需裝備並準時到場！"),
          "size": "sm",
          "color": "#333333",
          "wrap": true,
          "margin": "md"
        },
        {
          "type": "separator",
          "margin": "lg"
        },
        {
          "type": "text",
          "text": "👟 穿著叮嚀：請著運動服及抓地力良好之運動球鞋，並自備水壺、毛巾及健保卡。\n🚗 交通提醒：校內不開放停車，請盡量搭乘大眾運輸或提早步行前往。",
          "size": "xs",
          "color": "#666666",
          "wrap": true,
          "margin": "md"
        }
      ]
    }
  };
  return {
    type: "flex",
    altText: altText,
    contents: bubble
  };
}

// 批次推播「錄取通知」
function sendAdmissionNotices(ss, params) {
  var targetCategory = params.category || "all";
  var regId = params.regId || "";
  var token = getLineToken();
  if (!token || token === DEFAULT_LINE_ACCESS_TOKEN) {
    return { result: "error", message: "尚未設定 LINE_CHANNEL_ACCESS_TOKEN，請先至後台或 Script Properties 填入！" };
  }

  var results = { sent: 0, skippedNoLine: 0, failed: 0, details: [] };
  var sheets = [];
  if (targetCategory === "all" || targetCategory === "relay") {
    sheets.push({ name: "大隊接力報名名冊", project: "庄情薪傳大隊接力", idCol: 1, nameCol: 3, statusCol: 9, lineIdCol: 10, lineNameCol: 11, noticeCol: 12, location: "綜合球場", checkinTime: "11:40 ～ 11:50" });
  }
  if (targetCategory === "all" || targetCategory === "family") {
    sheets.push({ name: "親子趣味競賽名冊", project: "圈力衝刺親子趣味競賽", idCol: 1, nameCol: 5, statusCol: 9, lineIdCol: 10, lineNameCol: 11, noticeCol: 12, location: "本校操場中央草皮區", checkinTime: "10:20 ～ 10:30" });
  }
  if (targetCategory === "all" || targetCategory === "volunteer") {
    sheets.push({ name: "校慶服務志工名冊", project: "校慶服務志工", idCol: 1, nameCol: 2, statusCol: 10, lineIdCol: 11, lineNameCol: 12, noticeCol: 13, location: "志工大會服務處", checkinTime: "07:50 ～ 08:00" });
  }

  for (var s = 0; s < sheets.length; s++) {
    var conf = sheets[s];
    var sheet = ss.getSheetByName(conf.name);
    if (!sheet || sheet.getLastRow() <= 1) continue;

    var rows = sheet.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var rowId = String(row[conf.idCol] || "").trim();
      var personName = String(row[conf.nameCol] || "").trim();
      var status = String(row[conf.statusCol] || "").trim();
      var lineUserId = String(row[conf.lineIdCol] || "").trim();

      if (regId && rowId !== regId) continue;
      if (!regId) {
        var isAccepted = (status.indexOf("正選") !== -1 || status.indexOf("錄取") !== -1 || status.indexOf("優先") !== -1) && status.indexOf("候補") === -1;
        if (!isAccepted) continue;
      }

      if (!lineUserId || !lineUserId.startsWith("U")) {
        results.skippedNoLine++;
        continue;
      }

      var flex = createAdmissionFlex({
        projectName: conf.project,
        regId: rowId,
        name: personName,
        status: status,
        location: conf.location,
        checkinTime: conf.checkinTime
      });

      var pushRes = sendLinePush(lineUserId, flex);
      if (pushRes.success) {
        results.sent++;
        var updateTime = Utilities.formatDate(new Date(), "Asia/Taipei", "MM/dd HH:mm");
        sheet.getRange(r + 1, conf.noticeCol + 1).setValue("已推播錄取通知 (" + updateTime + ")");
        results.details.push({ id: rowId, name: personName, status: "sent" });
      } else {
        results.failed++;
        results.details.push({ id: rowId, name: personName, status: "failed", error: pushRes.error });
      }
    }
  }

  return {
    result: "success",
    sentCount: results.sent,
    skippedCount: results.skippedNoLine,
    failedCount: results.failed,
    message: "錄取通知推播完成！成功發送 " + results.sent + " 則，略過未連動 LINE 者 " + results.skippedNoLine + " 名。"
  };
}

// 批次推播「賽前行前通知」
function sendPreGameNotices(ss, params) {
  var targetCategory = params.category || "all";
  var title = params.noticeTitle || "第 71 屆大庄校慶運動會賽前行前提醒";
  var content = params.noticeContent || "校慶運動會即將展開，敬請各位選手提早到場進行熱身，並穿著抓地力良好之運動鞋！";
  var token = getLineToken();
  if (!token || token === DEFAULT_LINE_ACCESS_TOKEN) {
    return { result: "error", message: "尚未設定 LINE_CHANNEL_ACCESS_TOKEN" };
  }

  var results = { sent: 0, skippedNoLine: 0, failed: 0 };
  var sheets = [];
  if (targetCategory === "all" || targetCategory === "relay") {
    sheets.push({ name: "大隊接力報名名冊", lineIdCol: 10, noticeCol: 12 });
  }
  if (targetCategory === "all" || targetCategory === "family") {
    sheets.push({ name: "親子趣味競賽名冊", lineIdCol: 10, noticeCol: 12 });
  }
  if (targetCategory === "all" || targetCategory === "volunteer") {
    sheets.push({ name: "校慶服務志工名冊", lineIdCol: 11, noticeCol: 13 });
  }

  for (var s = 0; s < sheets.length; s++) {
    var conf = sheets[s];
    var sheet = ss.getSheetByName(conf.name);
    if (!sheet || sheet.getLastRow() <= 1) continue;

    var rows = sheet.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var lineUserId = String(row[conf.lineIdCol] || "").trim();

      if (!lineUserId || !lineUserId.startsWith("U")) {
        results.skippedNoLine++;
        continue;
      }

      var flex = createPreGameFlex({
        noticeTitle: title,
        noticeContent: content
      });

      var pushRes = sendLinePush(lineUserId, flex);
      if (pushRes.success) {
        results.sent++;
        var updateTime = Utilities.formatDate(new Date(), "Asia/Taipei", "MM/dd HH:mm");
        sheet.getRange(r + 1, conf.noticeCol + 1).setValue("已推播賽前通知 (" + updateTime + ")");
      } else {
        results.failed++;
      }
    }
  }

  return {
    result: "success",
    sentCount: results.sent,
    skippedCount: results.skippedNoLine,
    failedCount: results.failed,
    message: "賽前通知推播完成！成功發送 " + results.sent + " 則，略過未連動 LINE 者 " + results.skippedNoLine + " 名。"
  };
}

// 測試推播給管理員
function testLinePushToUser(userId) {
  if (!userId || !userId.startsWith("U")) {
    return { result: "error", message: "請輸入有效的 LINE User ID（以 U 開頭之 33 碼字串）" };
  }
  var testFlex = {
    "type": "flex",
    "altText": "【大庄71校慶】連線測試成功！",
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#059669",
        "contents": [
          { "type": "text", "text": "✅ LINE 機器人連線成功", "color": "#ffffff", "weight": "bold", "size": "lg" }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": "恭喜！您的大庄校慶 LINE Messaging API 已成功串接！", "wrap": true, "size": "sm" },
          { "type": "text", "text": "測試時間：" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss"), "size": "xs", "color": "#888888", "margin": "md" }
        ]
      }
    }
  };
  var pushRes = sendLinePush(userId, testFlex);
  if (pushRes.success) {
    return { result: "success", message: "測試訊息已成功推播至指定裝置！" };
  } else {
    return { result: "error", message: "推播失敗：" + (pushRes.error || pushRes.response) };
  }
}

// 自動維護工作表 LINE 欄位
function ensureLineColumns(ss) {
  try {
    // 1. 親子趣味競賽名冊
    var sFamily = ss.getSheetByName("親子趣味競賽名冊");
    if (sFamily) {
      if (sFamily.getLastRow() === 0) {
        sFamily.appendRow(["報名時間", "報名編號", "家長姓名", "電郵信箱", "聯絡電話", "學生姓名", "學生年級", "學生班級", "全名組合", "錄取狀態", "LINE_USER_ID", "LINE暱稱", "通知狀態"]);
        sFamily.getRange(1, 1, 1, 13).setBackground("#004f35").setFontColor("#ffffff").setFontWeight("bold");
      } else {
        var hf = sFamily.getRange(1, 1, 1, Math.max(13, sFamily.getLastColumn())).getValues()[0];
        if (hf.indexOf("LINE_USER_ID") === -1) {
          sFamily.getRange(1, 11).setValue("LINE_USER_ID");
          sFamily.getRange(1, 12).setValue("LINE暱稱");
          sFamily.getRange(1, 13).setValue("通知狀態");
          sFamily.getRange(1, 11, 1, 3).setBackground("#004f35").setFontColor("#ffffff").setFontWeight("bold");
        }
      }
    }

    // 2. 校慶服務志工名冊
    var sVol = ss.getSheetByName("校慶服務志工名冊");
    if (sVol) {
      if (sVol.getLastRow() === 0) {
        sVol.appendRow(["報名時間", "報名編號", "學生姓名", "現就讀學校班級", "學生手機", "家長手機", "家長姓名與關係", "Email", "是否為校友", "希望服務組別", "錄取狀態", "LINE_USER_ID", "LINE暱稱", "通知狀態"]);
        sVol.getRange(1, 1, 1, 14).setBackground("#fd761a").setFontColor("#ffffff").setFontWeight("bold");
      } else {
        var hv = sVol.getRange(1, 1, 1, Math.max(14, sVol.getLastColumn())).getValues()[0];
        if (hv.indexOf("LINE_USER_ID") === -1) {
          sVol.getRange(1, 12).setValue("LINE_USER_ID");
          sVol.getRange(1, 13).setValue("LINE暱稱");
          sVol.getRange(1, 14).setValue("通知狀態");
          sVol.getRange(1, 12, 1, 3).setBackground("#fd761a").setFontColor("#ffffff").setFontWeight("bold");
        }
      }
    }

    // 3. 大隊接力報名名冊
    var sRelay = ss.getSheetByName("大隊接力報名名冊");
    if (sRelay) {
      if (sRelay.getLastRow() === 0) {
        sRelay.appendRow(["報名時間", "報名編號", "參賽組別", "姓名", "性別", "Email", "出生年次 (民國)", "行動電話", "校友畢業年度", "錄取狀態", "LINE_USER_ID", "LINE暱稱", "通知狀態"]);
        sRelay.getRange(1, 1, 1, 13).setBackground("#1d4ed8").setFontColor("#ffffff").setFontWeight("bold");
      } else {
        var hr = sRelay.getRange(1, 1, 1, Math.max(13, sRelay.getLastColumn())).getValues()[0];
        if (hr.indexOf("LINE_USER_ID") === -1) {
          sRelay.getRange(1, 11).setValue("LINE_USER_ID");
          sRelay.getRange(1, 12).setValue("LINE暱稱");
          sRelay.getRange(1, 13).setValue("通知狀態");
          sRelay.getRange(1, 11, 1, 3).setBackground("#1d4ed8").setFontColor("#ffffff").setFontWeight("bold");
        }
      }
    }
  } catch(e) {
    Logger.log("ensureLineColumns err: " + e);
  }
}

// 輔助函式：取消報名並將選手資料移動至「已取消報名」工作表
function cancelAndMoveRegistration(ss, data) {
  var regId = String(data.regId || data.id || "").trim();
  var inputPhone = String(data.phone || "").trim().replace(/\D/g, "");
  var inputName = String(data.name || "").trim().toLowerCase();
  var cancelReason = String(data.cancelReason || "選手/家長自主線上取消").trim();
  var cancelTimestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");

  if (!regId && !inputPhone) {
    return { result: "error", message: "請提供報名編號或登記電話以辦理取消" };
  }

  var sheetCancel = ss.getSheetByName("已取消報名");
  if (!sheetCancel) {
    sheetCancel = ss.insertSheet("已取消報名");
  }
  if (sheetCancel.getLastRow() === 0) {
    sheetCancel.appendRow([
      "取消時間",
      "原報名項目",
      "報名編號",
      "選手/代表姓名",
      "聯絡電話",
      "電子信箱",
      "原所屬單位/班級/組別",
      "額外資訊/家長資訊",
      "原報名時間",
      "取消方式/原因",
      "狀態備註"
    ]);
    sheetCancel.getRange(1, 1, 1, 11).setBackground("#475569").setFontColor("#ffffff").setFontWeight("bold");
  }

  var targetSheets = [
    { name: "大隊接力報名名冊", project: "薪傳大隊接力", phoneCol: 7, idCol: 1, nameCol: 3 },
    { name: "親子趣味競賽名冊", project: "圈力衝刺親子趣味競賽", phoneCol: 4, idCol: 1, nameCol: 2 },
    { name: "校慶服務志工名冊", project: "校慶服務志工", phoneCol: 4, idCol: 1, nameCol: 2 }
  ];

  var moved = false;
  var movedRecord = null;
  var fromSheetName = "";

  for (var s = 0; s < targetSheets.length; s++) {
    var conf = targetSheets[s];
    var sheet = ss.getSheetByName(conf.name);
    if (!sheet || sheet.getLastRow() <= 1) continue;

    var rows = sheet.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var rowId = String(row[conf.idCol] || "").trim();
      var rowPhone = String(row[conf.phoneCol] || "").trim().replace(/\D/g, "");
      var rowName = String(row[conf.nameCol] || "").trim().toLowerCase();

      var isMatched = false;
      if (regId && rowId && rowId.toLowerCase() === regId.toLowerCase()) {
        isMatched = true;
      } else if (inputPhone && rowPhone) {
        if (inputPhone === rowPhone || (inputPhone.length >= 8 && rowPhone.endsWith(inputPhone.slice(-8)))) {
          if (!inputName || rowName.includes(inputName) || inputName.includes(rowName)) {
            isMatched = true;
          }
        }
      }

      if (isMatched) {
        fromSheetName = conf.name;
        var originalId = String(row[conf.idCol] || "");
        var originalRegTime = formatDateVal(row[0]);
        var personName = String(row[conf.nameCol] || "");
        var phoneVal = cleanPhoneVal(row[conf.phoneCol]);
        var emailVal = "";
        var unitInfo = "";
        var extraInfo = "";

        if (conf.name === "大隊接力報名名冊") {
          unitInfo = String(row[2] || "");
          emailVal = String(row[5] || "");
          extraInfo = "出生年次：" + String(row[6] || "") + "，校友年次：" + String(row[8] || "");
        } else if (conf.name === "親子趣味競賽名冊") {
          unitInfo = String(row[6] || "") + String(row[7] || "");
          emailVal = String(row[3] || "");
          extraInfo = "學生姓名：" + String(row[5] || "") + "，全名組合：" + String(row[8] || "");
        } else if (conf.name === "校慶服務志工名冊") {
          unitInfo = String(row[3] || "");
          emailVal = String(row[7] || "");
          extraInfo = "家長電話：" + cleanPhoneVal(row[5]) + "，組別：" + String(row[9] || "");
        }

        sheetCancel.appendRow([
          cancelTimestamp,
          conf.project,
          originalId,
          personName,
          formatPhoneForSheet(phoneVal),
          emailVal,
          unitInfo,
          extraInfo,
          originalRegTime,
          cancelReason,
          "名額已釋出"
        ]);
        var cancelLastRow = sheetCancel.getLastRow();
        sheetCancel.getRange(cancelLastRow, 5).setNumberFormat('@');

        sheet.deleteRow(r + 1);

        moved = true;
        movedRecord = {
          regId: originalId,
          name: personName,
          project: conf.project,
          fromSheet: fromSheetName,
          cancelTime: cancelTimestamp
        };

        try {
          var adminEmail = "stud03@ttps.hc.edu.tw";
          var noticeBody = "大庄國小 71 週年校慶運動會 - 選手/家長自主取消報名通知：\n\n"
            + "■ 取消項目：" + conf.project + "\n"
            + "■ 報名編號：" + originalId + "\n"
            + "■ 選手/代表：" + personName + "\n"
            + "■ 聯絡電話：" + phoneVal + "\n"
            + "■ 取消時間：" + cancelTimestamp + "\n"
            + "■ 備註說明：此筆紀錄已自動由「" + fromSheetName + "」移至「已取消報名」工作表，原席次名額已即時釋出。\n\n"
            + "71校慶大會資訊系統敬上";

          MailApp.sendEmail({
            to: adminEmail,
            subject: "【71校慶運動會】選手自主取消報名通知（" + conf.project + " - " + personName + "）",
            body: noticeBody,
            name: "大庄71校慶報名系統"
          });
        } catch(mailErr) {
          Logger.log("Cancel notice mail err: " + mailErr);
        }

        break;
      }
    }
    if (moved) break;
  }

  return {
    result: moved ? "success" : "not_found",
    moved: moved,
    record: movedRecord,
    movedTo: "已取消報名",
    message: moved ? ("已成功將編號 " + (movedRecord.regId) + " 資料移至【已取消報名】工作表，原名額已正式釋出！") : "在現有名冊中查無符合之報名紀錄"
  };
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
        phone: cleanPhoneVal(r[7]),
        gradYear: String(r[8]),
        status: String(r[9]),
        lineUserId: String(r[10] || ""),
        lineDisplayName: String(r[11] || ""),
        lineStatus: String(r[12] || "")
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
        phone: cleanPhoneVal(f[4]),
        studentName: String(f[5]),
        studentGrade: String(f[6]),
        studentClass: String(f[7]),
        combinedTitle: String(f[8]),
        status: String(f[9]),
        lineUserId: String(f[10] || ""),
        lineDisplayName: String(f[11] || ""),
        lineStatus: String(f[12] || "")
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
        phoneSelf: cleanPhoneVal(v[4]),
        phoneParent: cleanPhoneVal(v[5]),
        parentRel: String(v[6]),
        email: String(v[7]),
        isAlumni: String(v[8]),
        serviceRoles: String(v[9]),
        status: String(v[10]),
        lineUserId: String(v[11] || ""),
        lineDisplayName: String(v[12] || ""),
        lineStatus: String(v[13] || "")
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

// 輔助函式：確保電話號碼寫入 Google 試算表時保留開頭 0
function formatPhoneForSheet(val) {
  if (val === null || val === undefined) return "";
  var str = String(val).trim();
  if (!str) return "";
  if (/^9\d{8}$/.test(str)) {
    str = "0" + str;
  }
  if (str.charAt(0) !== "'") {
    return "'" + str;
  }
  return str;
}

// 輔助函式：從試算表讀取電話號碼時，移除多餘單引號並補齊開頭 0
function cleanPhoneVal(val) {
  if (val === null || val === undefined) return "";
  var str = String(val).trim();
  if (str.charAt(0) === "'") {
    str = str.substring(1).trim();
  }
  if (/^9\d{8}$/.test(str)) {
    str = "0" + str;
  }
  return str;
}

// 輔助函式：自動修復 Google 試算表中既有遺失開頭 0 的電話欄位，並將格式設為純文字
function fixExistingPhones(ss) {
  try {
    var sFamily = ss.getSheetByName("親子趣味競賽名冊");
    if (sFamily && sFamily.getLastRow() > 1) {
      var numRows = sFamily.getLastRow() - 1;
      var range = sFamily.getRange(2, 5, numRows, 1);
      range.setNumberFormat('@');
      var vals = range.getValues();
      var changed = false;
      for (var i = 0; i < vals.length; i++) {
        var p = String(vals[i][0]).trim();
        if (/^9\d{8}$/.test(p)) {
          vals[i][0] = "'" + "0" + p;
          changed = true;
        } else if (p && p.charAt(0) !== "'") {
          vals[i][0] = "'" + p;
          changed = true;
        }
      }
      if (changed) range.setValues(vals);
    }

    var sRelay = ss.getSheetByName("大隊接力報名名冊");
    if (sRelay && sRelay.getLastRow() > 1) {
      var numRowsR = sRelay.getLastRow() - 1;
      var rangeR = sRelay.getRange(2, 8, numRowsR, 1);
      rangeR.setNumberFormat('@');
      var valsR = rangeR.getValues();
      var changedR = false;
      for (var j = 0; j < valsR.length; j++) {
        var pR = String(valsR[j][0]).trim();
        if (/^9\d{8}$/.test(pR)) {
          valsR[j][0] = "'" + "0" + pR;
          changedR = true;
        } else if (pR && pR.charAt(0) !== "'") {
          valsR[j][0] = "'" + pR;
          changedR = true;
        }
      }
      if (changedR) rangeR.setValues(valsR);
    }

    var sVol = ss.getSheetByName("校慶服務志工名冊");
    if (sVol && sVol.getLastRow() > 1) {
      var numRowsV = sVol.getLastRow() - 1;
      var rangeV = sVol.getRange(2, 5, numRowsV, 2);
      rangeV.setNumberFormat('@');
      var valsV = rangeV.getValues();
      var changedV = false;
      for (var k = 0; k < valsV.length; k++) {
        for (var c = 0; c < 2; c++) {
          var pV = String(valsV[k][c]).trim();
          if (/^9\d{8}$/.test(pV)) {
            valsV[k][c] = "'" + "0" + pV;
            changedV = true;
          } else if (pV && pV.charAt(0) !== "'") {
            valsV[k][c] = "'" + pV;
            changedV = true;
          }
        }
      }
      if (changedV) rangeV.setValues(valsV);
    }
  } catch (err) {
    Logger.log("fixExistingPhones error: " + err);
  }
}

// 測試寄信授權
function testSendEmail() {
  var target = "stud03@ttps.hc.edu.tw";
  MailApp.sendEmail({
    to: target,
    name: "大庄國小71校慶籌備委員會 (學務處體育組)",
    replyTo: target,
    subject: "【測試信件】71校慶運動會報名系統 - 寄信功能授權成功",
    body: "恭喜您！這封信代表您的 Google 帳號已成功授權 Apps Script 呼叫 MailApp.sendEmail 寄信功能。\n\n" +
          "往後只要有選手在網站上完成接力賽或親子賽報名，系統就會自動寄發確認信給報名者並抄送至此信箱！"
  });
  Logger.log("測試信件已成功發送至: " + target);
}

// 一次性觸發 Google 授權外部網路請求權限 (UrlFetchApp - LINE Messaging API)
function authorizeUrlFetch() {
  Logger.log("檢查外部連線權限...");
  var res = UrlFetchApp.fetch("https://api.line.me", { muteHttpExceptions: true });
  Logger.log("UrlFetchApp 權限已獲取成功！HTTP 狀態碼：" + res.getResponseCode());
  return "授權成功！";
}

// ==========================================
// 大會即時推播與通告 (雲端試算表連線核心)
// ==========================================

function getAnnouncementsFromSheet(ss) {
  try {
    var sheet = ss.getSheetByName("大會公告");
    if (!sheet) {
      sheet = ss.insertSheet("大會公告");
      sheet.appendRow(["發布時間", "分類標籤", "公告內容", "顯示狀態"]);
      sheet.getRange(1, 1, 1, 4).setBackground("#004f35").setFontColor("#ffffff").setFontWeight("bold");
      
      // 寫入預設公告示範
      var nowStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm");
      sheet.appendRow([nowStr, "【緊急通知】", "薪傳大隊接力男女混合組僅剩最後 3 組名額，額滿系統將自動轉為候補名冊！", "顯示"]);
      sheet.appendRow([nowStr, "【志工培訓】", "第一梯次裁判檢錄組志工行前說明會，將於 12/5 (五) 12:30 於活動中心二樓召開。", "顯示"]);
      sheet.appendRow([nowStr, "【好康抽獎】", "線上應援牆累計元氣達標，校慶當日將於大會服務台抽出 100 份校慶 71 週年紀念保溫杯！", "顯示"]);
    }

    var rows = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < rows.length; i++) {
      var time = String(rows[i][0] || "").trim();
      var tag = String(rows[i][1] || "").trim();
      var content = String(rows[i][2] || "").trim();
      var status = String(rows[i][3] || "顯示").trim();

      if (status !== "隱藏" && (tag || content)) {
        list.push({
          id: i,
          time: time,
          tag: tag || "【大會通告】",
          content: content,
          status: status
        });
      }
    }

    // 倒序排列（最新發布在最上方）
    list.reverse();

    return {
      status: "success",
      count: list.length,
      announcements: list,
      serverTime: Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss")
    };
  } catch (err) {
    return {
      status: "error",
      message: err.toString(),
      announcements: []
    };
  }
}

function addAnnouncementToSheet(ss, data) {
  try {
    var sheet = ss.getSheetByName("大會公告");
    if (!sheet) {
      getAnnouncementsFromSheet(ss); // 初始化表頭
      sheet = ss.getSheetByName("大會公告");
    }

    var time = data.time || Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm");
    var tag = data.tag || "【大會公告】";
    var content = data.content || "";
    var status = data.status || "顯示";

    if (!content.trim()) {
      return { status: "error", message: "公告內容不得為空" };
    }

    sheet.appendRow([time, tag, content, status]);
    return { status: "success", message: "公告已成功發布並寫入試算表！" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  }
}
