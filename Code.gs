/**
 * ============================================================================
 *  EXPENSE LOGGER WEB APP  →  FINANCE REPORT TRACKING 2026
 *  Ghi chi tiêu từ iPhone → sheet T{m}/{yyyy}, vùng BẢNG 1 (cột C:H)
 *  Author: built for Minh | ES6+ | Apps Script V8
 * ============================================================================
 */

/* ===================== CONFIG — SỬA Ở ĐÂY ===================== */
const CONFIG = {
  // --- Nguồn dữ liệu ---
  SPREADSHEET_ID: '1Mf0231HsMwlM4AmdYvCognguByILo2UkQEz_MXOLDBg',
  LIST_SHEET: 'LIST',
  LIST_START_ROW: 3,       // hàng 2 là tiêu đề (HŨ | DANH MỤC) → data từ hàng 3
  LIST_COL_HU: 2,          // LIST!B — HŨ (hiển thị là "Loại chi phí")
  LIST_COL_ITEM: 3,        // LIST!C — DANH MỤC (KHOẢN MỤC)
  LIST_COL_HU_MASTER: 7,   // LIST!G — danh sách HŨ gốc (để sắp thứ tự)

  // --- Vùng BẢNG 1 trên sheet tháng ---
  TX_HEADER_ROW: 3,
  TX_START_ROW: 4,
  COL_NOTE: 3,             // C — GHI CHÚ
  COL_DATE: 4,             // D — NGÀY
  COL_AMOUNT: 5,           // E — CHI PHÍ
  COL_HU: 6,               // F — HŨ
  COL_ITEM: 7,             // G — KHOẢN MỤC
  COL_MONEY: 8,            // H — LOẠI TIỀN
  TX_WIDTH: 6,             // C..H = 6 cột
  SCAN_PADDING: 60,        // số dòng quét thêm dưới getLastRow() để bắt dòng lẻ

  // --- Quy tắc nghiệp vụ ---
  MONEY_TYPES: ['TIỀN MẶT', 'TÍN DỤNG'],

  COMPARE_MONTHS: 6,       // số tháng hiện trên biểu đồ so sánh

  /* Hạn mức chi tiêu. Lưu ở Script Properties, KHÔNG thêm cột vào sheet —
     khối giao dịch là C:H và từ cột K là bảng phụ có công thức.
     Cấu trúc: { "default": 15000000, "T12/2026": 25000000 }
     Có khoá riêng theo tháng thì dùng, không thì lấy "default" — tháng Tết
     hay tháng có đám cưới thì hạn mức khác hẳn tháng thường. */
  BUDGET_KEY: 'BUDGET_V1',

  /* --- NHÃN TỰ ĐỘNG THEO KHOẢN MỤC ---
     Khoản mục nào BẢN CHẤT đã thuộc một nhãn thì tự gắn, khỏi phải chọn tay.
     Chỉ dùng cho khoản mục đúng 100%: "Dating expenses" thì lần nào cũng là
     hẹn hò. KHÔNG khai ở đây những khoản mục nhập nhằng như CAFE hay VÉ XE —
     không phải ly cà phê nào cũng là đi hẹn, gắn cứng sẽ làm sai thống kê.
     Mấy khoản mục nhập nhằng đó để cơ chế HỌC THEO THÓI QUEN lo (xem
     suggestTagFor trong Index.html): app nhìn lịch sử bạn từng gắn nhãn gì
     cho khoản mục đó rồi tự bật sẵn chip. */
  TAG_RULES: [
    { tag: 'henho', match: ['dating', 'hen ho', 'hẹn hò'] }
  ],

  /* --- PHÍM TẮT KHOẢN MỤC ---
     Chạm một phát là điền sẵn Loại chi phí + Khoản mục, khỏi mở 2 ô chọn.
     'match' là từ khoá dò trong sheet LIST, KHÔNG phải tên khoản mục cố định:
     tên thật trong LIST có thể là "TIỀN XĂNG", "XĂNG XE" hay "CĂT TÓC" (thiếu
     dấu) — dò theo từ khoá đã bỏ dấu thì khớp được hết. Phím tắt nào không
     tìm thấy khoản mục tương ứng thì tự ẩn, không hiện nút chết.
     Thêm phím tắt: thêm một dòng vào đây, app tự hiện. */
  SHORTCUTS: [
    { key:'sang',   label:'Ăn sáng',   emoji:'🥖', match:['an sang','diem tam'] },
    { key:'trua',   label:'Ăn trưa',   emoji:'🍚', match:['an trua','com trua'] },
    { key:'toi',    label:'Ăn tối',    emoji:'🍜', match:['an toi','com toi'] },
    { key:'xang',   label:'Đổ xăng',   emoji:'⛽', match:['xang'] },
    { key:'toc',    label:'Cắt tóc',   emoji:'💈', match:['cat toc','toc'] },
    { key:'dienthoai', label:'Điện thoại', emoji:'📱', match:['dien thoai'] }
  ],

  /* Công tắc cho phép SỬA giao dịch đã ghi. Mặc định TẮT: sửa dữ liệu nguy
     hiểm hơn ghi mới, một cú chạm nhầm trong tab Lịch sử có thể đổi số tiền
     mà không ai để ý. Phải bật có chủ đích mới sửa được. */
  EDIT_ON_KEY: 'EDIT_ON_V1',

  /* --- NHÃN (tag) ---
     Chiều phân loại THỨ HAI, cắt NGANG qua HŨ → KHOẢN MỤC.
     Vì sao cần: "Hẹn hò" là một hoạt động, không phải một loại chi phí. Một
     buổi hẹn gồm cà phê + vé xem phim + vé xe — ba khoản mục khác nhau. Gắn
     nhãn vào KHOẢN MỤC thì sai, vì không phải ly cà phê nào cũng là đi hẹn;
     nhãn phải gắn vào TỪNG GIAO DỊCH.

     Cách lưu: nhãn nằm ngay trong ô GHI CHÚ dưới dạng #thẻ.
     Cố ý KHÔNG thêm cột mới vào sheet — khối giao dịch là C:H, còn từ cột K
     trở đi là các bảng phụ có công thức; thêm cột là rủi ro làm lệch chúng.
     Cách này đổi lại còn 3 cái lợi: gắn nhãn được cho giao dịch CŨ bằng cách
     sửa ghi chú ngay trên sheet, một giao dịch mang được NHIỀU nhãn, và nhãn
     nhìn thấy được khi mở sheet chứ không ẩn trong app.

     'keys' là từ khoá gõ trong GHI CHÚ để app tự gắn nhãn: gõ "an toi henho"
     là chip Hẹn hò tự sáng, khỏi chạm. Khớp theo TỪ TRỌN VẸN và bỏ dấu, nên
     "cv" không dính vào "dich vu", và gõ "Hẹn Hò" hay "hen ho" đều ăn.

     Thêm/bớt nhãn: sửa danh sách này. 'tag' phải viết liền, không dấu.
     Trên giao diện mỗi giao dịch chỉ CHỌN ĐƯỢC MỘT nhãn. Nhưng phần lưu trữ
     và thống kê vẫn xử lý được nhiều nhãn — vì ghi chú sửa tay trên sheet có
     thể mang 2 thẻ, và để sau này mở lại chế độ chọn nhiều không phải viết
     lại từ đầu. */
  TAGS: [
    { tag: 'henho',      label: 'Hẹn hò',      emoji: '💕',
      keys: ['henho', 'hen ho'] },
    { tag: 'dongnghiep', label: 'Đồng nghiệp', emoji: '💼',
      keys: ['cv', 'congviec', 'cong viec', 'dongnghiep', 'dong nghiep'] },
    { tag: 'giadinh',    label: 'Gia đình',    emoji: '🏠',
      keys: ['family', 'giadinh', 'gia dinh'] },
    { tag: 'canhan',     label: 'Cá nhân',     emoji: '🙋',
      keys: ['canhan', 'ca nhan'] }
  ],
  SHEET_PATTERN: /^T(\d{1,2})\/(\d{4})$/,   // nhận diện sheet tháng
  AUTO_CREATE_SHEET: false,
  TEMPLATE_SHEET: 'T11/2026',
  MAX_AMOUNT: 1000000000,
  MAX_NOTE_LEN: 200,
  DATE_BACK_DAYS: 400,
  DATE_FWD_DAYS: 7,

  // --- Định dạng ---
  DATE_FORMAT: 'mm/dd/yyyy',
  AMOUNT_FORMAT: '#,##0 "₫"',
  TIMEZONE: 'Asia/Ho_Chi_Minh',

  // --- Bảo mật & hiệu năng ---
  APP_PIN: '250892',
  API_TOKEN: 'mk7Qz2Rv9LpX4aT8nE3wY6bHs0dJ',

  /* Chống dò PIN. Sai quá PIN_MAX_FAIL lần thì khoá PIN_LOCK_SEC giây.
     Bị khoá nhầm thì chạy tay hàm unlockPin() trong editor. */
  PIN_MAX_FAIL: 5,
  PIN_LOCK_SEC: 900,        // 15 phút
  PIN_FAIL_KEY: 'PINFAIL_V1',
  CACHE_TTL_SEC: 180,      // danh mục (sheet LIST) — hiếm khi đổi
  /* 10 phút, không phải 2 phút nữa: đi kèm trigger warmCache() chạy mỗi 5
     phút nên cache luôn còn hạn khi bạn mở app. Để 2 phút thì trigger phải
     chạy mỗi phút — tốn 36 trong 90 phút hạn mức chạy script mỗi ngày.
     Dữ liệu cũ tối đa 10 phút CHỈ xảy ra khi bạn sửa thẳng trên Google Sheet;
     ghi/sửa/xóa qua app thì cache bị xóa ngay lập tức. */
  BOOT_TTL_SEC: 600,
  TX_CACHE_TTL_SEC: 300,   // bảng giao dịch của tháng, tự xóa mỗi khi ghi/xóa
  YEAR_CACHE_TTL_SEC: 900, // tổng hợp năm cache 15 phút, tự xóa khi ghi/xóa
  LOCK_TIMEOUT_MS: 20000,
  IDEMPOTENCY_TTL_SEC: 21600,

  // --- Đọc email ngân hàng (Gmail của chính tài khoản chạy script) ---
  GMAIL: {
    /* Công tắc CỨNG của lập trình viên: false là tắt hẳn tính năng, app không
       hiện thẻ email nữa. Còn công tắc người dùng bật/tắt trong app nằm ở
       Script Properties (ON_KEY) — xem mailEnabled_(). */
    ENABLED: true,
    ON_KEY: 'MAIL_ON_V1',     // công tắc người dùng; mặc định bật
    // Lọc thư. Thêm nguồn khác bằng OR, ví dụ:
    // 'newer_than:30d (from:vietcombank.com.vn OR from:techcombank.com.vn)'
    /* Thư Shopee phải LỌC THEO TIÊU ĐỀ, không lọc theo người gửi không thôi:
       mail.shopee.vn gửi hàng chục thư quảng cáo mỗi tuần, kéo hết về thì mỗi
       lượt quét tốn thêm vài chục giây mà chẳng bóc được gì. */
    QUERY: 'newer_than:14d ((from:vietcombank.com.vn OR from:cake.vn)'
         + ' OR (from:shopee.vn subject:"giao hàng thành công"))',
    MAX_THREADS: 35,          // trần số luồng thư mỗi lần quét (2 bank + Shopee)
    MAX_ITEMS: 20,            // trần số giao dịch trả về app
    SCAN_TTL_SEC: 300,        // cache kết quả quét, mở lại app không quét lại
    DONE_KEY: 'MAIL_DONE_V1', // nơi lưu các số lệnh đã xử lý
    DONE_KEEP: 400,           // giữ bao nhiêu số lệnh gần nhất
    SEEN_KEY: 'MAIL_SEEN_V1', // thư đã đọc rồi: id Gmail → số lệnh (null nếu
                              // không phải biên lai). Nhờ bảng này mà các lần
                              // quét sau bỏ qua được getPlainBody — vốn là
                              // thao tác tốn thời gian nhất.
    SEEN_KEEP: 600,

    /* Bảng tra NGƯỢC: "sheet|ngày|số tiền" → số lệnh của biên lai đã ghi.
       Dùng khi bạn XOÁ một giao dịch khỏi lịch sử: nhờ bảng này mà biết biên
       lai nào cần trả lại hàng chờ, để quét lần sau nó hiện lại.
       Không lưu số lệnh thẳng vào sheet được — khối giao dịch chỉ có 6 cột
       C:H và từ cột K trở đi là bảng phụ có công thức. */
    ROWKEY_KEY: 'MAIL_ROWKEY_V1',
    ROWKEY_KEEP: 400,

    /* Khoản mục cho đơn Shopee. Dò theo TỪ KHOÁ trong sheet LIST chứ không
       ghi cứng tên: tên thật có thể là "SHOPEE SPaylater", "TIỀN SHOPEE" hay
       "SPAYLATER" — ghi cứng sai một chữ là nút bấm vào báo lỗi khoản mục. */
    SHOPEE_ITEM_MATCH: ['spaylater', 'shopee'],

    /* Quẹt thẻ / QR tại cửa hàng thì "Nội dung chuyển tiền" chỉ là dãy số
       vô nghĩa, thông tin thật nằm ở TÊN NGƯỜI HƯỞNG. Bảng này map tên
       đơn vị bán hàng sang khoản mục trong sheet LIST.
       Thêm nơi bạn hay chi vào đây để app đoán chính xác hơn. */
    MERCHANTS: [
      { k: ['WINCOMMERCE','WINMART','VINMART','BACH HOA XANH','KINGFOOD',
            'COOPMART','CO.OPMART','MINISTOP','CIRCLE K','7 ELEVEN','GS25',
            'SATRA','EMART','LOTTE MART','MEGA MARKET'], item: 'TIỀN TẠP HÓA' },
      { k: ['GRAB','BE GROUP','BEGROUP','XANH SM','GOJEK','TAXI','MAI LINH',
            'VINASUN'], item: 'VÉ XE' },
      { k: ['HIGHLANDS','PHUC LONG','STARBUCKS','THE COFFEE','KATINAT',
            'TRUNG NGUYEN','CAFE','COFFEE'], item: 'CAFE' },
      { k: ['SHOPEE','SPAYLATER'], item: 'TIỀN SHOPEE' },
      { k: ['PHARMACITY','LONG CHAU','AN KHANG','NHA THUOC'], item: 'THUỐC MEN' },
      { k: ['CGV','LOTTE CINEMA','GALAXY','BHD STAR'], item: 'XEM PHIM' },
      { k: ['VIETTEL','MOBIFONE','VINAPHONE','VNPT'], item: 'TIỀN ĐIỆN THOẠI' },
      { k: ['PETROLIMEX','PVOIL','XANG DAU'], item: 'TIỀN XĂNG' }
    ]
  },

  // --- SeaTalk (tùy chọn) ---
  ENABLE_SEATALK: false,
  SEATALK_WEBHOOK_URL: '',
  SEATALK_DAILY_THRESHOLD: 500000
};
/* ============================================================== */


/* ======================= WEB APP ENTRY ======================== */

/**
 * Dùng createHtmlOutputFromFile (KHÔNG phải createTemplateFromFile):
 * bản template sẽ quét và CHẠY mọi đoạn <? ... ?> trong file HTML, biến nào
 * chưa gán vào template sẽ văng "... is not defined".
 *
 * addMetaTag() chèn meta vào TRANG BAO NGOÀI (iframe cha). Thiếu viewport ở đây
 * thì iPhone render như desktop 980px rồi thu nhỏ → chữ rất bé.
 * Apps Script CHỈ cho phép: viewport, apple-mobile-web-app-capable,
 * mobile-web-app-capable, google-site-verification.
 * ALLOWALL để trang vỏ (GitHub Pages) nhúng được vào iframe và che banner Google.
 */
function doGet(e) {
  try {
    /* ===== CỔNG API (dành cho bản chạy thẳng trên GitHub Pages) =====
       Có tham số ?api=... thì trả JSON thay vì trả trang HTML.
       Đặt TRƯỚC phần trả HTML nên bản app hiện tại không bị ảnh hưởng gì:
       không có tham số api thì mọi thứ chạy y như cũ. */
    if (e && e.parameter && e.parameter.api) {
      return apiRoute_(e);
    }

    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Ghi Chi Tiêu')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .addMetaTag('apple-mobile-web-app-capable', 'yes')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    Logger.log('doGet ERROR: ' + err.stack);
    return HtmlService.createHtmlOutput('<h3>Lỗi khởi tạo app: ' + err.message + '</h3>');
  }
}

/** Endpoint cho iOS Shortcuts / Siri */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_({ ok: false, message: 'Thiếu body JSON' });
    }
    const body = JSON.parse(e.postData.contents);

    /* Body có trường "api" → đi qua bộ định tuyến chung (app GitHub Pages).
       Không có → giữ nguyên đường cũ: coi cả body là một giao dịch cần ghi,
       để Shortcut trên iPhone đã cấu hình từ trước vẫn chạy. */
    if (body && body.api) return apiRoute_(e, body);

    if (String(body.token || '') !== CONFIG.API_TOKEN) {
      return jsonOut_({ ok: false, message: 'Token không hợp lệ' });
    }
    body.pin = CONFIG.APP_PIN;
    return jsonOut_(addExpense(body));
  } catch (err) {
    Logger.log('doPost ERROR: ' + err.stack);
    return jsonOut_({ ok: false, message: 'Lỗi server: ' + err.message });
  }
}

/**
 * Bộ định tuyến API cho lời gọi từ tên miền khác (GitHub Pages).
 *
 * Hai kiểu trả về, vì chưa chắc kiểu nào qua được hàng rào CORS của trình
 * duyệt — phải thử thật trên iPhone mới biết:
 *   • có ?callback=tên  → trả JSONP (bọc trong lời gọi hàm). JSONP đi bằng
 *     thẻ <script> nên KHÔNG bị CORS chặn, nhưng chỉ dùng được cho GET.
 *   • không có callback → trả JSON thuần, cần máy chủ cho phép CORS.
 *
 * Xác thực: token để lọc lời gọi vu vơ, còn PIN mới là cổng thật — mọi hàm
 * đọc/ghi vẫn tự gọi assertPin_ như trước.
 */
/* Mọi hàm app được phép gọi qua API. Khai TƯỜNG MINH thành bảng thay vì
   gọi động theo tên: gọi động nghĩa là ai biết link cũng chạy được MỌI hàm
   trong script, kể cả resetMailDone hay authorizeGmail. */
const API_ACTIONS = {
  getBootstrap:      getBootstrap,
  getTransactions:   getTransactions,
  getYearSummary:    getYearSummary,
  getCompare:        getCompare,
  addExpense:        addExpense,
  addExpenseBatch:   addExpenseBatch,
  updateExpense:     updateExpense,
  deleteExpense:     deleteExpense,
  scanBankEmails:    scanBankEmails,
  getMailDetail:     getMailDetail,
  markMailDone:      markMailDone,
  undoMailSkip:      undoMailSkip,
  restoreSkippedMail: restoreSkippedMail,
  purgeSkippedMail:  purgeSkippedMail,
  setMailEnabled:    setMailEnabled,
  setEditEnabled:    setEditEnabled,
  setBudget:         setBudget
};

/**
 * Bộ định tuyến API cho lời gọi từ tên miền khác (GitHub Pages).
 *
 * Đã đo thật trên iPhone: fetch GET, JSONP và POST text/plain đều qua được
 * hàng rào CORS. App dùng GET để đọc và POST để ghi; JSONP chỉ còn là đường
 * lui nếu một ngày nào đó Google siết CORS.
 *
 * Xác thực hai lớp: token lọc lời gọi vu vơ, còn PIN mới là cổng thật — mọi
 * hàm trong API_ACTIONS đều tự gọi assertPin_ như khi chạy trong iframe.
 */
function apiRoute_(e, bodyObj) {
  const src = bodyObj || (e && e.parameter) || {};
  const cb = String((e && e.parameter && e.parameter.callback) || '').trim();
  let res;

  try {
    const action = String(src.api || '').trim();

    if (action === 'ping') {
      // Phép thử kết nối: KHÔNG cần token, KHÔNG đụng vào Sheet
      res = { ok: true, pong: true, at: new Date().toISOString(),
              tz: CONFIG.TIMEZONE };
    } else if (String(src.token || '') !== CONFIG.API_TOKEN) {
      res = { ok: false, message: 'Token không hợp lệ' };
    } else if (!Object.prototype.hasOwnProperty.call(API_ACTIONS, action)) {
      res = { ok: false, message: 'Không rõ action: ' + action };
    } else {
      let payload = src.payload || {};
      if (typeof payload === 'string') payload = JSON.parse(payload || '{}');
      res = API_ACTIONS[action](payload);
    }
  } catch (err) {
    Logger.log('apiRoute_ ERROR: ' + err.stack);
    res = { ok: false, message: err.message };
  }

  const body = JSON.stringify(res);
  if (cb && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ========================= PUBLIC API ========================= */

/**
 * Nạp dữ liệu khởi động (nhẹ): danh mục, danh sách sheet, tổng ngày/tháng.
 * Không trả giao dịch — tab Lịch sử/Thống kê gọi getTransactions riêng.
 */
function getBootstrap(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);

    /* Cache cả gói mở app. Gộp ngày vào khóa để tổng "hôm nay" không
       bị giữ lại qua nửa đêm. Cache bị xóa ngay khi ghi hoặc xóa giao dịch
       nên không bao giờ hiện số cũ. */
    const cache = CacheService.getScriptCache();
    const wanted = String((payload && payload.sheetName) || '').trim();
    const bootKey = 'BOOT_' + (wanted || 'AUTO') + '_' + fmtDateKey_(new Date());
    const cached = cache.get(bootKey);
    if (cached) return stamp_(JSON.parse(cached), _t0, true);

    const ss = getSS_();
    const today = new Date();
    const list = readList_();

    const sheets = listMonthSheets_(ss);
    const activeName = pickActiveSheet_(sheets, payload, today);
    const sheet = activeName ? ss.getSheetByName(activeName) : null;

    const sum = sheet ? sumSheet_(sheet, today) : { today: 0, month: 0, count: 0 };

    const out = {
      ok: true,
      hu: list.hu,
      items: list.items,
      moneyTypes: CONFIG.MONEY_TYPES,
      tags: CONFIG.TAGS,
      shortcuts: resolveShortcuts_(list),
      tagRules: resolveTagRules_(list),
      mailOn: mailEnabled_(),
      editOn: editEnabled_(),
      budget: budgetFor_(activeName),
      sheets: sheets.map(s => s.name),
      years: listYears_(sheets),
      activeSheet: activeName,
      sheetExists: !!sheet,
      todayISO: fmtDateKey_(today),
      defaultDate: defaultDateForSheet_(activeName, today),
      daysLeft: daysLeftInMonth_(activeName, today),
      todayTotal: sum.today,
      monthTotal: sum.month,
      txCount: sum.count
    };
    cache.put(bootKey, JSON.stringify(out), CONFIG.BOOT_TTL_SEC);
    return stamp_(out, _t0, false);
  } catch (err) {
    Logger.log('getBootstrap ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Toàn bộ giao dịch của 1 sheet — dùng cho tab Lịch sử và Thống kê (tháng).
 * Trả mới nhất trước. Client tự lọc/nhóm nên chỉ cần gọi 1 lần.
 */
function getTransactions(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);

    /* Trước đây hàm này KHÔNG có cache nào cả, trong khi nó bị gọi lại mỗi lần
       chuyển sang tab Lịch sử hoặc Thống kê, và nó là hàm đọc nhiều ô nhất
       (cả bảng giao dịch của tháng). Đây là lỗ hổng rõ nhất còn lại.
       Cache theo sheet, tự xóa khi ghi/xóa nên không bao giờ hiện số cũ. */
    const cache = CacheService.getScriptCache();
    const wanted = String((payload && payload.sheetName) || '').trim();
    const txKey = 'TX_' + (wanted || 'AUTO');
    const hit = cache.get(txKey);
    if (hit) return stamp_(JSON.parse(hit), _t0, true);

    const ss = getSS_();
    const today = new Date();
    const sheets = listMonthSheets_(ss);
    const activeName = pickActiveSheet_(sheets, payload, today);
    const sheet = activeName ? ss.getSheetByName(activeName) : null;
    if (!sheet) return stamp_({ ok: true, sheetName: activeName, rows: [], daysInMonth: 0 }, _t0, false);

    const p = parseSheetName_(activeName);
    const out = {
      ok: true,
      sheetName: activeName,
      daysInMonth: p ? new Date(p.year, p.month, 0).getDate() : 0,
      rows: readTransactions_(sheet).rows.reverse()
    };

    /* Gói giao dịch có thể vượt 100KB (trần mỗi khóa cache) khi tháng nhiều
       dòng. Vượt thì bỏ qua cache chứ KHÔNG để put ném lỗi làm hỏng cả lời gọi. */
    try {
      const json = JSON.stringify(out);
      if (json.length < 95000) {
        cache.put(txKey, json, CONFIG.TX_CACHE_TTL_SEC);
        if (activeName && activeName !== wanted) {
          cache.put('TX_' + activeName, json, CONFIG.TX_CACHE_TTL_SEC);
        }
      }
    } catch (e) { Logger.log('TX cache bỏ qua: ' + e.message); }

    return stamp_(out, _t0, false);
  } catch (err) {
    Logger.log('getTransactions ERROR: ' + err.stack);
    return { ok: false, message: err.message, rows: [] };
  }
}

/**
 * Tổng hợp CẢ NĂM: quét mọi sheet tháng thuộc năm đó, gộp theo tháng /
 * loại chi phí / khoản mục. Nặng (tới 12 sheet) nên cache 15 phút;
 * cache tự xóa mỗi khi ghi hoặc xóa giao dịch trong năm.
 */
function getYearSummary(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);
    const ss = getSS_();
    const sheets = listMonthSheets_(ss);
    const years = listYears_(sheets);
    if (!years.length) {
      return { ok: true, year: 0, years: [], months: [], hu: [], items: [],
               tags: [], untagged: 0, total: 0, count: 0, activeMonths: 0 };
    }

    let year = Number((payload && payload.year) || 0);
    if (years.indexOf(year) < 0) {
      const thisYear = new Date().getFullYear();
      year = (years.indexOf(thisYear) >= 0) ? thisYear : years[years.length - 1];
    }

    const cache = CacheService.getScriptCache();
    const key = 'YEAR_' + year;
    const hit = cache.get(key);
    if (hit) {
      const cached = JSON.parse(hit);
      cached.years = years;   // danh sách năm luôn lấy mới, rẻ
      return stamp_(cached, _t0, true);
    }

    const monthMap = {}, huMap = {}, itemMap = {}, tagMap = {};
    let total = 0, count = 0, untagged = 0;

    sheets.filter(s => s.year === year).forEach(s => {
      const sh = ss.getSheetByName(s.name);
      if (!sh) return;
      readTransactions_(sh).rows.forEach(r => {
        total += r.amount; count++;

        if (!monthMap[s.month]) monthMap[s.month] = { month: s.month, total: 0, count: 0 };
        monthMap[s.month].total += r.amount;
        monthMap[s.month].count++;

        const hk = normKey_(r.hu) || '—';
        if (!huMap[hk]) huMap[hk] = { name: r.hu.trim(), total: 0, n: 0 };
        huMap[hk].total += r.amount; huMap[hk].n++;

        const ik = normKey_(r.item) || '—';
        if (!itemMap[ik]) itemMap[ik] = { name: r.item.trim(), hu: r.hu, total: 0, n: 0 };
        itemMap[ik].total += r.amount; itemMap[ik].n++;

        /* Nhãn: một giao dịch có thể mang nhiều nhãn nên tổng các nhãn CÓ THỂ
           lớn hơn tổng chi. Đó là bản chất của phân loại cắt ngang, không
           phải lỗi — phần trăm vì vậy tính trên tổng chi, và app nói rõ điều
           này ở dòng chú thích. */
        const tags = extractTags_(r.note);
        if (!tags.length) untagged += r.amount;
        tags.forEach(t => {
          if (!tagMap[t]) tagMap[t] = { tag: t, total: 0, n: 0 };
          tagMap[t].total += r.amount; tagMap[t].n++;
        });
      });
    });

    // 12 tháng đầy đủ, tháng không có dữ liệu = 0 (để biểu đồ cột không bị hụt)
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const row = monthMap[m] || { month: m, total: 0, count: 0 };
      row.name = 'T' + m;
      row.sheet = 'T' + m + '/' + year;
      row.exists = sheets.some(s => s.year === year && s.month === m);
      months.push(row);
    }

    const out = {
      ok: true,
      year: year,
      years: years,
      months: months,
      hu: Object.keys(huMap).map(k => huMap[k]).sort((a, b) => b.total - a.total),
      items: Object.keys(itemMap).map(k => itemMap[k])
               .sort((a, b) => b.total - a.total).slice(0, 12),
      tags: Object.keys(tagMap).map(k => tagMap[k]).sort((a, b) => b.total - a.total),
      untagged: untagged,
      total: total,
      count: count,
      activeMonths: months.filter(m => m.total > 0).length
    };
    cache.put(key, JSON.stringify(out), CONFIG.YEAR_CACHE_TTL_SEC);
    return out;
  } catch (err) {
    Logger.log('getYearSummary ERROR: ' + err.stack);
    return { ok: false, message: err.message, months: [], hu: [], items: [] };
  }
}

/**
 * Ghi 1 giao dịch. Idempotent theo clientId.
 * TỐI ƯU: tính luôn tổng ngày/tháng từ chính lần quét đã có, trả về cho client
 * → client không cần gọi lại getBootstrap sau mỗi lần ghi (tiết kiệm ~2s).
 */
function addExpense(payload) {
  const _t0 = Date.now();
  const lock = LockService.getScriptLock();
  try {
    assertPin_(payload && payload.pin);
    const ss = getSS_();

    // Sheet đích: ưu tiên sheet người dùng chọn, nếu không thì suy từ ngày
    const picked = String((payload && payload.sheetName) || '').trim();
    const explicit = picked && CONFIG.SHEET_PATTERN.test(picked)
                     && !!ss.getSheetByName(picked);

    const tx = validateTx_(payload, explicit ? picked : null);

    const cache = CacheService.getScriptCache();
    const idemKey = 'TX_' + tx.clientId;
    const cached = cache.get(idemKey);
    if (cached) return stamp_(JSON.parse(cached), _t0, true);

    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
      throw new Error('Hệ thống đang bận, vui lòng thử lại sau vài giây.');
    }

    const sheetName = explicit ? picked : buildSheetName_(tx.date);
    const sheet = resolveMonthSheet_(ss, sheetName);

    // 1 lần quét duy nhất: vừa tìm dòng trống, vừa cộng tổng
    const snap = readTransactions_(sheet);
    const row = snap.lastRow + 1;
    ensureRows_(sheet, row);

    // Ghi 1 lần cho cả 6 cột thay vì setValue từng ô
    sheet.getRange(row, CONFIG.COL_NOTE, 1, CONFIG.TX_WIDTH).setValues([[
      tx.note, tx.date, tx.amount, tx.hu, tx.item, tx.moneyType
    ]]);
    sheet.getRange(row, CONFIG.COL_DATE).setNumberFormat(CONFIG.DATE_FORMAT);
    sheet.getRange(row, CONFIG.COL_AMOUNT).setNumberFormat(CONFIG.AMOUNT_FORMAT);
    // Không flush() ở đây — Apps Script tự ghi khi kết thúc, tiết kiệm ~0.5-1s

    invalidateCaches_(cache, sheetName, tx.date.getFullYear());

    // Tổng mới = tổng cũ (từ snap) + giao dịch vừa ghi
    const todayKey = fmtDateKey_(new Date());
    const txKey = fmtDateKey_(tx.date);
    let todayTotal = 0, monthTotal = 0;
    snap.rows.forEach(r => {
      monthTotal += r.amount;
      if (r.dateKey === todayKey) todayTotal += r.amount;
    });
    monthTotal += tx.amount;
    if (txKey === todayKey) todayTotal += tx.amount;

    const result = {
      ok: true,
      row: row,
      sheetName: sheetName,
      clientId: tx.clientId,
      todayTotal: todayTotal,
      monthTotal: monthTotal,
      txCount: snap.rows.length + 1,
      // Dòng vừa ghi, đúng format client đang dùng → chèn thẳng vào danh sách
      tx: {
        row: row,
        note: tx.note,
        dateKey: txKey,
        dateLabel: Utilities.formatDate(tx.date, CONFIG.TIMEZONE, 'dd/MM'),
        weekday: weekdayVi_(tx.date),
        amount: tx.amount,
        hu: tx.hu,
        item: tx.item,
        moneyType: tx.moneyType
      },
      message: 'Đã ghi ' + formatVnd_(tx.amount) + ' — ' + tx.item.trim()
    };
    cache.put(idemKey, JSON.stringify(result), CONFIG.IDEMPOTENCY_TTL_SEC);

    /* Giao dịch đến từ biên lai email → đánh dấu đã xử lý NGAY TẠI ĐÂY.
       Trước đây app phải gọi markMailDone thành một lời gọi riêng, tốn thêm
       trọn một vòng mạng (~1,3 giây) cho mỗi lần ghi. */
    const orderId = String((payload && payload.orderId) || '').trim();
    if (orderId) {
      try {
        markMailDone_({ sheetName: sheetName, dateKey: txKey, amount: tx.amount },
                      orderId);
        result.mailDone = true;
      } catch (e) { Logger.log('markMailDone_ trong addExpense: ' + e.message); }
    }

    maybeNotifySeaTalk_(tx, todayTotal);
    return stamp_(result, _t0, false);

  } catch (err) {
    Logger.log('addExpense ERROR: ' + err.stack + ' | payload=' + JSON.stringify(payload));
    return { ok: false, message: err.message, clientId: payload && payload.clientId };
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Đồng bộ hàng đợi offline */
function addExpenseBatch(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);
    const list = (payload.items || []);
    if (!list.length) return { ok: true, results: [] };
    if (list.length > 50) throw new Error('Tối đa 50 giao dịch mỗi lần đồng bộ.');

    const results = list.map(item => {
      item.pin = payload.pin;
      return addExpense(item);
    });
    return { ok: true, results: results };
  } catch (err) {
    Logger.log('addExpenseBatch ERROR: ' + err.stack);
    return { ok: false, message: err.message, results: [] };
  }
}

/**
 * Xóa 1 giao dịch: KHÔNG dùng deleteRow (sẽ kéo lệch các bảng cột K→BK).
 * Thay vào đó dồn block C:H lên 1 dòng rồi clear dòng cuối.
 */
/**
 * Sửa một giao dịch đã ghi.
 * payload: { pin, sheetName, row, expectAmount, amount, date, hu, item,
 *            moneyType, note }
 *
 * Ba điều phải giữ đúng:
 *  1. CHỈ ghi đè 6 cột C:H của đúng dòng đó. Không chèn, không xoá, không dịch
 *     dòng — từ cột K trở đi là các bảng phụ có công thức.
 *  2. Phải xác thực dòng trước khi ghi. Client có thể đang cầm dữ liệu cũ (vừa
 *     xoá một dòng khác làm mọi dòng sau dồn lên 1), ghi mù sẽ sửa NHẦM giao
 *     dịch khác. Dùng chính cách bảo vệ của deleteExpense: so số tiền cũ.
 *  3. Ngày sửa phải vẫn thuộc đúng tháng của sheet. Đổi sang tháng khác thì
 *     không phải "sửa" nữa mà là chuyển sheet — chặn lại và nói rõ, vì làm
 *     chui sẽ khiến giao dịch nằm sai sheet mà không ai biết.
 */
function updateExpense(payload) {
  const _t0 = Date.now();
  const lock = LockService.getScriptLock();
  try {
    assertPin_(payload && payload.pin);

    /* Kiểm tra công tắc NGAY TẠI ĐÂY, không chỉ ở giao diện. Ẩn nút bấm mà
       máy chủ vẫn nhận lệnh thì đó không phải là khoá — ai gọi thẳng hàm này
       vẫn sửa được. Khoá thật phải nằm ở nơi thực hiện. */
    if (!editEnabled_()) {
      throw new Error('Tính năng sửa đang tắt. Bật công tắc ở tab Lịch sử trước.');
    }

    const sheetName = String((payload && payload.sheetName) || '').trim();
    if (!CONFIG.SHEET_PATTERN.test(sheetName)) throw new Error('Sheet không hợp lệ.');

    // Khoá ngày vào đúng tháng của sheet — validateTx_ tự báo lỗi nếu lệch
    const tx = validateTx_(payload, sheetName);

    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) throw new Error('Hệ thống đang bận.');

    const sheet = getSS_().getSheetByName(sheetName);
    if (!sheet) throw new Error('Không tìm thấy sheet ' + sheetName);

    const row = Number(payload.row);
    const snap = readTransactions_(sheet);
    if (!row || row < CONFIG.TX_START_ROW || row > snap.lastRow) {
      throw new Error('Dòng không hợp lệ hoặc đã bị thay đổi. Hãy tải lại app.');
    }

    const target = snap.rows.filter(r => r.row === row)[0];
    if (!target) throw new Error('Không tìm thấy giao dịch. Hãy tải lại app.');
    const expect = Number(payload.expectAmount);
    if (expect && Math.round(target.amount) !== Math.round(expect)) {
      throw new Error('Giao dịch đã thay đổi so với lúc hiển thị. Hãy tải lại app.');
    }

    // Ghi đè đúng 6 cột của đúng 1 dòng
    sheet.getRange(row, CONFIG.COL_NOTE, 1, CONFIG.TX_WIDTH).setValues([[
      tx.note, tx.date, tx.amount, tx.hu, tx.item, tx.moneyType
    ]]);
    sheet.getRange(row, CONFIG.COL_DATE).setNumberFormat(CONFIG.DATE_FORMAT);
    sheet.getRange(row, CONFIG.COL_AMOUNT).setNumberFormat(CONFIG.AMOUNT_FORMAT);
    SpreadsheetApp.flush();

    const ps = parseSheetName_(sheetName);
    invalidateCaches_(CacheService.getScriptCache(), sheetName, ps ? ps.year : 0);

    // Tổng mới = tổng cũ, thay dòng cũ bằng dòng mới
    const todayKey = fmtDateKey_(new Date());
    const newKey = fmtDateKey_(tx.date);
    let todayTotal = 0, monthTotal = 0;
    snap.rows.forEach(r => {
      const amt = (r.row === row) ? tx.amount : r.amount;
      const key = (r.row === row) ? newKey : r.dateKey;
      monthTotal += amt;
      if (key === todayKey) todayTotal += amt;
    });

    return stamp_({
      ok: true,
      todayTotal: todayTotal,
      monthTotal: monthTotal,
      txCount: snap.rows.length,
      tx: {
        row: row,
        note: tx.note,
        dateKey: newKey,
        dateLabel: Utilities.formatDate(tx.date, CONFIG.TIMEZONE, 'dd/MM'),
        weekday: weekdayVi_(tx.date),
        amount: tx.amount,
        hu: tx.hu,
        item: tx.item,
        moneyType: tx.moneyType
      },
      message: 'Đã sửa thành ' + formatVnd_(tx.amount) + ' — ' + tx.item.trim()
    }, _t0, false);
  } catch (err) {
    Logger.log('updateExpense ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function deleteExpense(payload) {
  const _t0 = Date.now();
  const lock = LockService.getScriptLock();
  try {
    assertPin_(payload && payload.pin);
    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) throw new Error('Hệ thống đang bận.');

    const sheet = getSS_().getSheetByName(payload.sheetName);
    if (!sheet) throw new Error('Không tìm thấy sheet ' + payload.sheetName);

    const row = Number(payload.row);
    const snap = readTransactions_(sheet);
    if (!row || row < CONFIG.TX_START_ROW || row > snap.lastRow) {
      throw new Error('Dòng không hợp lệ hoặc đã bị thay đổi. Hãy tải lại app.');
    }

    // Xác thực trước khi xóa — tránh xóa nhầm khi dữ liệu đã dịch chuyển
    const target = snap.rows.filter(r => r.row === row)[0];
    if (!target || Math.round(target.amount) !== Math.round(Number(payload.amount))) {
      throw new Error('Dữ liệu đã thay đổi so với lúc hiển thị. Hãy tải lại app.');
    }

    const tailCount = snap.lastRow - row;
    if (tailCount > 0) {
      const block = sheet.getRange(row + 1, CONFIG.COL_NOTE, tailCount, CONFIG.TX_WIDTH).getValues();
      sheet.getRange(row, CONFIG.COL_NOTE, tailCount, CONFIG.TX_WIDTH).setValues(block);
    }
    sheet.getRange(snap.lastRow, CONFIG.COL_NOTE, 1, CONFIG.TX_WIDTH).clearContent();
    SpreadsheetApp.flush();   // cần flush: client sẽ tải lại danh sách ngay sau đó

    const ps = parseSheetName_(payload.sheetName);
    invalidateCaches_(CacheService.getScriptCache(), payload.sheetName,
                      ps ? ps.year : 0);

    // Tính lại tổng sau khi xóa (dùng snap cũ, trừ đi dòng vừa xóa)
    const todayKey = fmtDateKey_(new Date());
    let todayTotal = 0, monthTotal = 0;
    snap.rows.forEach(r => {
      if (r.row === row) return;
      monthTotal += r.amount;
      if (r.dateKey === todayKey) todayTotal += r.amount;
    });

    /* Nếu giao dịch này vốn đến từ một biên lai email, trả biên lai đó về
       hàng chờ. Trước đây xoá xong là mất luôn cả hai đường: dòng trong sheet
       bị xoá, mà biên lai thì vẫn mang nhãn "đã ghi" nên không bao giờ hiện
       lại — muốn nhập lại phải tự gõ tay từ đầu. */
    const released = releaseMailForRow_(payload.sheetName, target.dateKey, target.amount);

    return stamp_({
      ok: true,
      todayTotal: todayTotal,
      monthTotal: monthTotal,
      txCount: snap.rows.length - 1,
      released: released,
      message: 'Đã xóa giao dịch ' + formatVnd_(target.amount)
               + (released ? ' — biên lai email đã trả về hàng chờ' : '')
    }, _t0, false);
  } catch (err) {
    Logger.log('deleteExpense ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/**
 * Làm mới danh mục. Giao diện đã bỏ nút gọi hàm này; giữ lại để chạy tay
 * từ trình chỉnh sửa Apps Script khi vừa sửa sheet LIST và muốn cập nhật ngay.
 */
function refreshCatalog(payload) {
  try {
    assertPin_(payload && payload.pin);
    CacheService.getScriptCache().remove('CATALOG_V2');
    return getBootstrap(payload);
  } catch (err) {
    Logger.log('refreshCatalog ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}


/* ====================== SHEET HELPERS ========================= */

function getSS_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Cổng PIN + khoá chống dò.
 *
 * Vì sao giờ mới bắt buộc: khi app chạy trong iframe Apps Script, muốn thử PIN
 * phải đi qua google.script.run. Khi app chuyển sang GitHub Pages thì token
 * API nằm sẵn trong mã nguồn trang web, ai xem cũng thấy — lúc đó PIN 6 số là
 * hàng rào DUY NHẤT, mà 6 số thì vét cạn được. Nên phải đếm số lần sai.
 *
 * Đếm trong CacheService chứ không phải Properties: cache tự hết hạn đúng
 * bằng thời gian khoá, khỏi cần dọn; và ghi cache nhanh hơn Properties nhiều
 * lần — đây là đường đi của MỌI lời gọi nên không được làm nó chậm.
 */
function assertPin_(pin) {
  if (CONFIG.APP_PIN === '') return;

  /* Chặn NGAY khi đang bị khoá — kiểm tra trước cả việc so PIN. Nếu so
     trước rồi mới chặn thì kẻ dò vẫn biết được PIN nào đúng. */
  if (pinLocked_()) {
    throw new Error('Đang tạm khoá do nhập sai nhiều lần. Thử lại sau ít phút.');
  }

  const ok = String(pin || '') === String(CONFIG.APP_PIN);
  if (ok) return;

  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(CONFIG.PIN_FAIL_KEY) || 0) + 1;
  cache.put(CONFIG.PIN_FAIL_KEY, String(n), CONFIG.PIN_LOCK_SEC);

  if (n >= CONFIG.PIN_MAX_FAIL) {
    throw new Error('Nhập sai PIN ' + n + ' lần. Thử lại sau '
      + Math.round(CONFIG.PIN_LOCK_SEC / 60) + ' phút.');
  }
  throw new Error('PIN không đúng. Còn '
    + (CONFIG.PIN_MAX_FAIL - n) + ' lần thử.');
}

/** Đang bị khoá vì nhập sai quá nhiều lần? */
function pinLocked_() {
  try {
    return Number(CacheService.getScriptCache().get(CONFIG.PIN_FAIL_KEY) || 0)
           >= CONFIG.PIN_MAX_FAIL;
  } catch (e) { return false; }
}

/** CHẠY TAY để mở khoá ngay nếu chính bạn bị khoá nhầm */
function unlockPin() {
  CacheService.getScriptCache().remove(CONFIG.PIN_FAIL_KEY);
  Logger.log('Đã xoá bộ đếm nhập sai PIN.');
}

/** Chọn sheet hoạt động: ưu tiên người dùng chọn → tháng hiện tại → gần nhất */
function pickActiveSheet_(sheets, payload, today) {
  const wanted = String((payload && payload.sheetName) || '').trim();
  const todayName = buildSheetName_(today);
  if (wanted && sheets.some(s => s.name === wanted)) return wanted;
  if (sheets.some(s => s.name === todayName)) return todayName;
  return sheets.length ? sheets[sheets.length - 1].name : '';
}

/** Tên sheet theo pattern T{tháng không zero}/{năm} — khớp T4/2026, T11/2026 */
function buildSheetName_(d) {
  return 'T' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

/** Liệt kê mọi sheet tháng, sắp xếp theo năm rồi tháng tăng dần */
function listMonthSheets_(ss) {
  const out = [];
  ss.getSheets().forEach(sh => {
    const m = sh.getName().match(CONFIG.SHEET_PATTERN);
    if (!m) return;
    const month = Number(m[1]), year = Number(m[2]);
    if (month < 1 || month > 12) return;
    out.push({ name: sh.getName(), month: month, year: year });
  });
  out.sort((a, b) => (a.year - b.year) || (a.month - b.month));
  return out;
}

/** Các năm có dữ liệu, tăng dần */
function listYears_(sheets) {
  const seen = {}, out = [];
  sheets.forEach(s => { if (!seen[s.year]) { seen[s.year] = true; out.push(s.year); } });
  out.sort((a, b) => a - b);
  return out;
}

function parseSheetName_(name) {
  const m = String(name || '').match(CONFIG.SHEET_PATTERN);
  if (!m) return null;
  return { month: Number(m[1]), year: Number(m[2]) };
}

/** Ngày mặc định: hôm nay nếu cùng tháng với sheet, ngược lại ngày 1 của sheet */
function defaultDateForSheet_(sheetName, today) {
  const p = parseSheetName_(sheetName);
  if (!p) return fmtDateKey_(today);
  if (p.month === today.getMonth() + 1 && p.year === today.getFullYear()) {
    return fmtDateKey_(today);
  }
  return Utilities.formatDate(new Date(p.year, p.month - 1, 1, 12, 0, 0),
    CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/** Số ngày còn lại trong tháng của sheet (0 nếu tháng đã qua) */
function daysLeftInMonth_(sheetName, today) {
  const p = parseSheetName_(sheetName);
  if (!p) return 0;
  if (p.month !== today.getMonth() + 1 || p.year !== today.getFullYear()) return 0;
  return new Date(p.year, p.month, 0).getDate() - today.getDate();
}

function resolveMonthSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  if (!CONFIG.AUTO_CREATE_SHEET) {
    throw new Error('Chưa có sheet "' + sheetName + '". Hãy chọn sheet khác hoặc tạo sheet này trước.');
  }
  const tpl = ss.getSheetByName(CONFIG.TEMPLATE_SHEET);
  if (!tpl) throw new Error('Không tìm thấy sheet mẫu ' + CONFIG.TEMPLATE_SHEET);

  sheet = tpl.copyTo(ss).setName(sheetName);
  const last = findLastDataRow_(sheet);
  if (last >= CONFIG.TX_START_ROW) {
    sheet.getRange(CONFIG.TX_START_ROW, CONFIG.COL_NOTE,
      last - CONFIG.TX_START_ROW + 1, CONFIG.TX_WIDTH).clearContent();
  }
  Logger.log('Đã tạo sheet mới: ' + sheetName);
  return sheet;
}

/**
 * Trần quét: getLastRow() của sheet (dòng cuối có dữ liệu ở BẤT KỲ cột nào,
 * kể cả các bảng bên phải K→BK) + đệm. Trước đây dùng getMaxRows() nên phải
 * đọc cả nghìn dòng rỗng mỗi lần — đây là nút thắt tốc độ chính.
 */
function scanLimit_(sheet) {
  const maxRows = sheet.getMaxRows();
  const last = sheet.getLastRow();
  return Math.min(maxRows, Math.max(last, CONFIG.TX_START_ROW) + CONFIG.SCAN_PADDING);
}

/** Tìm dòng cuối CHỈ trong vùng C:H */
function findLastDataRow_(sheet) {
  const limit = scanLimit_(sheet);
  if (limit < CONFIG.TX_START_ROW) return CONFIG.TX_START_ROW - 1;
  const values = sheet.getRange(CONFIG.TX_START_ROW, CONFIG.COL_NOTE,
    limit - CONFIG.TX_START_ROW + 1, CONFIG.TX_WIDTH).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i].some(v => v !== '' && v !== null)) return CONFIG.TX_START_ROW + i;
  }
  return CONFIG.TX_START_ROW - 1;
}

function findNextRow_(sheet) {
  return findLastDataRow_(sheet) + 1;
}

/** Thêm dòng trống nếu hết chỗ (chèn ở cuối nên không lệch bảng bên phải) */
function ensureRows_(sheet, needRow) {
  const maxRows = sheet.getMaxRows();
  if (needRow > maxRows) {
    sheet.insertRowsAfter(maxRows, (needRow - maxRows) + 100);
  }
}

/** Đọc toàn bộ giao dịch trong vùng C:H — 1 lần getValues duy nhất */
function readTransactions_(sheet) {
  const limit = scanLimit_(sheet);
  if (limit < CONFIG.TX_START_ROW) return { lastRow: CONFIG.TX_START_ROW - 1, rows: [] };

  const values = sheet.getRange(CONFIG.TX_START_ROW, CONFIG.COL_NOTE,
    limit - CONFIG.TX_START_ROW + 1, CONFIG.TX_WIDTH).getValues();

  const rows = [];
  let lastRow = CONFIG.TX_START_ROW - 1;

  values.forEach((r, i) => {
    const rowNum = CONFIG.TX_START_ROW + i;
    if (r.some(v => v !== '' && v !== null)) lastRow = rowNum;

    const amount = toNumber_(r[2]);
    const dateVal = r[1];
    if (!amount && !r[3] && !r[4]) return; // bỏ dòng rỗng giữa bảng
    rows.push({
      row: rowNum,
      note: String(r[0] || ''),
      dateKey: (dateVal instanceof Date) ? fmtDateKey_(dateVal) : '',
      dateLabel: (dateVal instanceof Date)
        ? Utilities.formatDate(dateVal, CONFIG.TIMEZONE, 'dd/MM') : '',
      weekday: (dateVal instanceof Date) ? weekdayVi_(dateVal) : '',
      amount: amount,
      hu: String(r[3] || ''),
      item: String(r[4] || ''),
      moneyType: String(r[5] || '')
    });
  });
  return { lastRow: lastRow, rows: rows };
}

/** Tổng ngày/tháng + số giao dịch — dùng chung cho getBootstrap */
function sumSheet_(sheet, today) {
  const todayKey = fmtDateKey_(today);
  let t = 0, m = 0, c = 0;
  readTransactions_(sheet).rows.forEach(r => {
    m += r.amount; c++;
    if (r.dateKey === todayKey) t += r.amount;
  });
  return { today: t, month: m, count: c };
}

function weekdayVi_(d) {
  const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return names[d.getDay()];
}


/* ========================= CATALOG ============================ */

/** Đọc sheet LIST → danh mục. Giữ chuỗi RAW để không vi phạm Data Validation */
function readList_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('CATALOG_V2');
  if (hit) return JSON.parse(hit);

  const sheet = getSS_().getSheetByName(CONFIG.LIST_SHEET);
  if (!sheet) throw new Error('Không tìm thấy sheet ' + CONFIG.LIST_SHEET);

  const lastRow = sheet.getLastRow();
  const n = lastRow - CONFIG.LIST_START_ROW + 1;
  if (n <= 0) throw new Error('Sheet LIST không có dữ liệu.');

  const data = sheet.getRange(CONFIG.LIST_START_ROW, 1, n, CONFIG.LIST_COL_HU_MASTER).getValues();

  const huOrder = [], huSeen = {}, items = [], pairSeen = {};

  // Thứ tự HŨ ưu tiên theo cột G (danh sách gốc)
  data.forEach(r => {
    const g = String(r[CONFIG.LIST_COL_HU_MASTER - 1] || '').trim();
    if (g && !huSeen[normKey_(g)]) { huSeen[normKey_(g)] = true; huOrder.push({ v: g, t: g }); }
  });

  data.forEach(r => {
    const huRaw = String(r[CONFIG.LIST_COL_HU - 1] || '');
    const itemRaw = String(r[CONFIG.LIST_COL_ITEM - 1] || '');
    if (!huRaw.trim() || !itemRaw.trim()) return; // bỏ dòng khoản mục rỗng

    const huKey = normKey_(huRaw);
    if (!huSeen[huKey]) { huSeen[huKey] = true; huOrder.push({ v: huRaw.trim(), t: huRaw.trim() }); }

    const pairKey = huKey + '||' + normKey_(itemRaw);
    if (pairSeen[pairKey]) return;
    pairSeen[pairKey] = true;

    items.push({ huKey: huKey, v: itemRaw, t: itemRaw.trim() }); // v = RAW (giữ space)
  });

  items.sort((a, b) => a.t.localeCompare(b.t, 'vi'));
  const out = { hu: huOrder, items: items };
  cache.put('CATALOG_V2', JSON.stringify(out), CONFIG.CACHE_TTL_SEC);
  return out;
}


/* ====================== VALIDATION ============================ */

/**
 * Validate + chuẩn hóa input.
 * forcedSheet != null → người dùng đã chọn sheet, ngày phải thuộc tháng đó
 * và bỏ qua giới hạn ngày tương lai.
 */
function validateTx_(p, forcedSheet) {
  if (!p) throw new Error('Không có dữ liệu gửi lên.');

  // --- Số tiền: hỗ trợ "50k", "1tr2", "50.000", "50,000" ---
  const amount = parseVndAmount_(p.amount);
  if (!amount || amount <= 0) throw new Error('Số tiền phải lớn hơn 0.');
  if (amount > CONFIG.MAX_AMOUNT) throw new Error('Số tiền vượt ngưỡng cho phép, kiểm tra lại số 0.');

  // --- Ngày ---
  const date = parseISODate_(p.date);
  if (forcedSheet) {
    const ps = parseSheetName_(forcedSheet);
    if (ps && (date.getMonth() + 1 !== ps.month || date.getFullYear() !== ps.year)) {
      throw new Error('Ngày ' + Utilities.formatDate(date, CONFIG.TIMEZONE, 'dd/MM/yyyy')
        + ' không thuộc sheet ' + forcedSheet + '. Hãy đổi ngày hoặc đổi sheet.');
    }
  } else {
    const diffDays = Math.round((date - new Date()) / 86400000);
    if (diffDays > CONFIG.DATE_FWD_DAYS) throw new Error('Ngày ghi quá xa trong tương lai.');
    if (diffDays < -CONFIG.DATE_BACK_DAYS) throw new Error('Ngày ghi quá xa trong quá khứ.');
  }

  // --- Loại chi phí (HŨ) & KHOẢN MỤC: map ngược về chuỗi RAW trong LIST ---
  const list = readList_();
  const itemKey = normKey_(p.item);
  if (!itemKey) throw new Error('Chưa chọn khoản mục.');

  let huKey = normKey_(p.hu);
  // Nếu không truyền HŨ (vd từ Shortcut), tự suy từ khoản mục
  if (!huKey) {
    const guess = list.items.filter(it => normKey_(it.v) === itemKey)[0];
    if (!guess) throw new Error('KHOẢN MỤC "' + p.item + '" không có trong LIST.');
    huKey = guess.huKey;
  }

  const huMatch = list.hu.filter(h => normKey_(h.v) === huKey)[0];
  if (!huMatch) throw new Error('Loại chi phí "' + p.hu + '" không có trong LIST.');

  const itemMatch = list.items.filter(it => it.huKey === huKey && normKey_(it.v) === itemKey)[0];
  if (!itemMatch) {
    throw new Error('Khoản mục "' + p.item + '" không thuộc loại "' + huMatch.t + '".');
  }

  // --- Loại tiền ---
  const money = CONFIG.MONEY_TYPES.filter(m => normKey_(m) === normKey_(p.moneyType))[0];
  if (!money) throw new Error('LOẠI TIỀN không hợp lệ.');

  // --- Ghi chú: chặn formula injection ---
  let note = String(p.note == null ? '' : p.note).trim().slice(0, CONFIG.MAX_NOTE_LEN);
  if (/^[=+\-@]/.test(note)) note = "'" + note;

  return {
    amount: amount,
    date: date,
    hu: huMatch.v,
    item: itemMatch.v,
    moneyType: money,
    note: note,
    clientId: String(p.clientId || Utilities.getUuid())
  };
}


/* ======================= UTILITIES ============================ */

function normKey_(s) {
  return String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g, ' ');
}

function toNumber_(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** "50k" → 50000 | "1tr2" → 1200000 | "50.000" → 50000 */
function parseVndAmount_(raw) {
  if (typeof raw === 'number') return Math.round(raw);
  let s = String(raw || '').trim().toLowerCase().replace(/\s|₫/g, '');
  if (!s) return 0;

  let m = s.match(/^(\d+(?:[.,]\d+)?)(tr|m)(\d*)$/);
  if (m) {
    let base = parseFloat(m[1].replace(',', '.')) * 1000000;
    if (m[3]) base += parseInt(m[3], 10) * Math.pow(10, 6 - m[3].length);
    return Math.round(base);
  }
  m = s.match(/^(\d+(?:[.,]\d+)?)k$/);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1000);

  return Math.round(Number(s.replace(/[.,]/g, '')) || 0);
}

/** 'yyyy-MM-dd' → Date lúc 12:00 trưa để tránh lệch ngày do timezone */
function parseISODate_(iso) {
  const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Ngày không hợp lệ (cần yyyy-MM-dd).');
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  if (isNaN(d.getTime())) throw new Error('Ngày không hợp lệ.');
  return d;
}

function fmtDateKey_(d) {
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/** 1234567 → "1.234.567 đ" (chuẩn VN, dấu chấm phân cách nghìn) */
function formatVnd_(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
}


/* ================= ĐỌC EMAIL NGÂN HÀNG ======================== */
/*
 * Biên lai Vietcombank là bảng HTML. Khi lấy bản text thuần, mỗi ô thành
 * một dòng theo thứ tự: nhãn tiếng Việt → nhãn tiếng Anh → giá trị.
 * Vì vậy cách bóc là: tìm dòng nhãn tiếng Việt, rồi lấy dòng kế tiếp mà
 * không phải nhãn tiếng Anh.
 *
 * LƯU Ý: email KHÔNG chứa loại chi phí / khoản mục. Hàm này chỉ trả về
 * danh sách chờ duyệt, không tự ghi vào sheet. Khoản mục được ĐOÁN từ
 * lịch sử ghi chú của chính bạn và vẫn cần bạn xác nhận.
 */

/** Các nhãn tiếng Anh cần bỏ qua khi dò giá trị */
const MAIL_EN_SKIP = [
  'trans. date, time', 'order number', 'debit account', "remitter's name",
  'remitter name', 'credit account', 'beneficiary name', 'beneficiary bank',
  'beneficiary bank name', 'amount', 'amount in words', 'content',
  'details of payment', 'charge code', 'charge amount', 'net income', 'vat',
  'exclude', 'include', 'transaction fee', 'fee', 'payment receipt',
  'bank', 'in words', 'transaction amount', 'status of transaction',
  'card', 'at', 'debit account',
  // --- nhãn tiếng Anh của Cake by VPBank ---
  'supplier', 'transaction type', 'transaction code', 'trading date and time',
  'transaction date and time', 'transaction fees', 'transaction details',
  'account information', 'transaction information', 'account',
  'payment account', 'information'
];

/* Nhãn phải loại trừ khi dò "Số tiền": biên lai còn có ô "Số tiền phí"
   nằm trong bảng con, nếu không chặn thì dễ bóc nhầm ra 0 VND. */
/* Nhãn phải chặn khi dò số tiền.
   "Tổng tiền" là BẪY nguy hiểm nhất của thư Shopee: nó là giá TRƯỚC giảm giá
   (609.000), trong khi số thật sự bị trừ tiền là "Tổng thanh toán" (421.880).
   Lấy nhầm là sổ chi tiêu sai 44%. */
const MAIL_AMOUNT_BLOCK = ['số tiền phí', 'số tiền bằng chữ', 'tổng tiền'];

/* Trạng thái giao dịch.
   BẪY: "Không thành công" CHỨA cả cụm "thành công". Nếu dò chữ "thành công"
   trước thì giao dịch thất bại cũng được coi là thành công. Vì vậy LUÔN kiểm
   tra nhóm THẤT BẠI trước, và chỉ kết luận thành công khi không dính nhóm đó. */
const MAIL_FAIL_WORDS = [
  'không thành công', 'khong thanh cong', 'thất bại', 'that bai',
  'bị từ chối', 'bi tu choi', 'từ chối', 'tu choi', 'đã hủy', 'da huy',
  'unsuccessful', 'not successful', 'failed', 'failure', 'declined',
  'rejected', 'cancelled', 'canceled'
];

/**
 * CHẠY TAY MỘT LẦN để Google hỏi quyền đọc Gmail.
 * Không kiểm tra PIN — vì assertPin_ sẽ chặn trước khi code chạm tới GmailApp,
 * khiến Google không bao giờ hỏi quyền (đó là lý do chạy scanBankEmails
 * trực tiếp không có tác dụng).
 * Chạy xong xem Nhật ký thực thi: có dòng "OK" là đã cấp quyền thành công.
 */
function authorizeGmail() {
  const threads = GmailApp.search(CONFIG.GMAIL.QUERY, 0, 5);
  Logger.log('OK — đã có quyền đọc Gmail.');
  Logger.log('Bộ lọc: ' + CONFIG.GMAIL.QUERY);
  Logger.log('Số luồng thư khớp: ' + threads.length);
  threads.forEach(t => Logger.log('  • ' + t.getFirstMessageSubject()));
  if (!threads.length) {
    Logger.log('Không có thư nào khớp — sửa CONFIG.GMAIL.QUERY cho đúng người gửi.');
  }
}

/**
 * CHẠY TAY ĐỂ CHẨN ĐOÁN khi app báo "không có giao dịch mới".
 * In ra: mỗi luồng có bao nhiêu thư, bóc được bao nhiêu, và nếu có thư
 * biên lai không bóc được thì dump nguyên văn để biết cấu trúc thật.
 */
function debugMail() {
  const threads = GmailApp.search(CONFIG.GMAIL.QUERY, 0, CONFIG.GMAIL.MAX_THREADS);
  const done = mailDoneSet_();
  let total = 0, parsed = 0, skipped = 0, dump = '';

  Logger.log('Bộ lọc: ' + CONFIG.GMAIL.QUERY);
  Logger.log('Số luồng: ' + threads.length);

  threads.forEach(th => {
    const msgs = th.getMessages();
    Logger.log('— "' + th.getFirstMessageSubject() + '" (' + msgs.length + ' thư)');
    msgs.forEach(m => {
      total++;
      const tx = parseBankMail_(m);
      if (tx) {
        parsed++;
        const mark = tx.failed ? ' [KHÔNG THÀNH CÔNG — bỏ qua]'
                   : tx.credit ? ' [TIỀN VÀO — bỏ qua]'
                   : (done[tx.id] ? ' [đã xử lý trước đó]' : '');
        Logger.log('   ✓ ' + tx.dateLabel + ' | ' + tx.amount + ' | ' + tx.note + mark);
        if (!tx.credit && !tx.failed && done[tx.id]) skipped++;
      } else {
        const subj = String(m.getSubject() || '');
        if (!dump && /bi[êe]n lai|giao d[ịi]ch/i.test(subj)) {
          dump = (m.getPlainBody() || '').slice(0, 2500);
        }
      }
    });
  });

  Logger.log('TỔNG: ' + total + ' thư — bóc được ' + parsed
             + ' — trong đó đã xử lý trước ' + skipped);
  if (dump) {
    Logger.log('--- NỘI DUNG THƯ KHÔNG BÓC ĐƯỢC (2500 ký tự đầu) ---');
    Logger.log(dump);
  }
}

/**
 * CHẠY TAY để kiểm tra riêng thư Cake. In ra NGUYÊN VĂN bản text thuần của
 * thư Cake gần nhất cùng kết quả bóc tách — nhờ đó biết chính xác Gmail dựng
 * nhãn bằng tiếng Việt hay tiếng Anh, thay vì phải đoán từ ảnh chụp màn hình.
 * Nếu kết quả bóc ra sai, gửi đoạn log này để sửa đúng nhãn.
 */
function debugCakeMail() {
  const threads = GmailApp.search('newer_than:30d from:cake.vn', 0, 10);
  Logger.log('Số luồng thư Cake: ' + threads.length);
  if (!threads.length) {
    Logger.log('Không có thư nào từ cake.vn trong 30 ngày.');
    return;
  }

  let shown = 0;
  threads.forEach(th => {
    th.getMessages().forEach(m => {
      const tx = parseCakeMail_(m);
      Logger.log('— "' + m.getSubject() + '"');
      if (tx) {
        Logger.log('   số tiền: ' + tx.amount + (tx.credit ? ' (TIỀN VÀO)' : ' (tiền ra)'));
        Logger.log('   ngày   : ' + tx.timeLabel + '  → sheet ' + tx.sheet);
        Logger.log('   mã GD  : ' + tx.id);
        Logger.log('   đơn vị : ' + tx.payee);
        Logger.log('   ghi chú: ' + tx.note);
        Logger.log('   phí    : ' + tx.fee);
      } else {
        Logger.log('   ✗ KHÔNG bóc được');
      }
      if (shown < 2) {
        shown++;
        Logger.log('   --- nguyên văn (1800 ký tự đầu) ---');
        Logger.log(mailLines_(m).join('\n').slice(0, 1800));
      }
    });
  });
}

/** Xóa danh sách "đã xử lý" — dùng khi muốn quét lại từ đầu */
function resetMailDone() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(CONFIG.GMAIL.DONE_KEY);
  props.deleteProperty(CONFIG.GMAIL.SEEN_KEY);
  props.deleteProperty(CONFIG.GMAIL.ROWKEY_KEY);
  CacheService.getScriptCache().remove('MAILSCAN_V1');
  Logger.log('Đã xóa SẠCH danh sách đã xử lý — kể cả giao dịch ĐÃ GHI vào '
    + 'sheet. Lần quét tới hiện lại tất cả, dễ nhập trùng. Nếu chỉ muốn lấy '
    + 'lại những giao dịch đã bấm ✕ thì dùng nút "Khôi phục ... đã bỏ qua" '
    + 'ngay trong app (hàm restoreSkippedMail).');
}

/**
 * SO VỚI CÙNG KỲ THÁNG TRƯỚC.
 * payload: { pin, sheetName }
 *
 * "Cùng kỳ" là mấu chốt: hôm nay 22/10 thì phải so 1–22/10 với 1–22/9, KHÔNG
 * so cả tháng 10 (mới đi 2/3 chặng) với cả tháng 9 (đã trọn vẹn) — so kiểu đó
 * tháng nào đang diễn ra cũng "tiết kiệm hơn", một kết luận vô nghĩa.
 *
 * Hai trường hợp biên phải xử lý:
 *  • Xem sheet của tháng ĐÃ QUA → mốc cắt là ngày cuối tháng đó, so trọn vẹn.
 *  • Tháng trước ngắn hơn mốc cắt (so 31/03 với tháng 2) → kẹp mốc lại theo
 *    số ngày thật của tháng trước, và nói rõ ra để bạn biết là so lệch ngày.
 */
function getCompare(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);

    const ss = getSS_();
    const name = String((payload && payload.sheetName) || '').trim()
                 || buildSheetName_(new Date());
    const ps = parseSheetName_(name);
    if (!ps) throw new Error('Sheet không hợp lệ: ' + name);

    const cache = CacheService.getScriptCache();
    const today = new Date();
    const ckey = 'CMP_' + name + '_' + fmtDateKey_(today);
    const hit = cache.get(ckey);
    if (hit) return stamp_(JSON.parse(hit), _t0, true);

    const daysCur = new Date(ps.year, ps.month, 0).getDate();
    const isThisMonth = (ps.month === today.getMonth() + 1)
                     && (ps.year === today.getFullYear());
    // Tháng đang diễn ra → cắt ở hôm nay; tháng đã qua → lấy trọn tháng
    let cut = isThisMonth ? today.getDate() : daysCur;

    // Tháng liền trước
    const pm = ps.month === 1 ? 12 : ps.month - 1;
    const py = ps.month === 1 ? ps.year - 1 : ps.year;
    const prevName = 'T' + pm + '/' + py;
    const daysPrev = new Date(py, pm, 0).getDate();

    // Tháng 2 không có ngày 30 — kẹp mốc cắt lại cho công bằng
    const cutPrev = Math.min(cut, daysPrev);
    const clipped = cutPrev < cut;

    /**
     * Đọc MỘT sheet đúng MỘT lần, trả về cả hai con số cần dùng:
     *   full = tổng cả tháng
     *   same = tổng tính đến mốc cắt (cùng kỳ)
     * Phải gộp như vậy: bản đầu tôi viết hàm chỉ tính một con số rồi gọi 2 lần
     * cho mỗi tháng — 6 tháng thành ~11 lượt đọc sheet, mỗi lượt ~400ms. Gộp
     * lại còn đúng 6 lượt.
     */
    function monthStats(sheetName, limitDay) {
      const sh = ss.getSheetByName(sheetName);
      const res = { exists: !!sh, full: 0, same: 0, count: 0, sameCount: 0,
                    cum: [], byItem: {} };
      if (!sh) return res;

      const perDay = [];
      for (let i = 0; i <= 31; i++) perDay.push(0);

      readTransactions_(sh).rows.forEach(r => {
        if (!r.dateKey) return;
        const d = Number(String(r.dateKey).slice(8, 10));
        if (!d) return;
        res.full += r.amount;
        res.count++;
        perDay[d] += r.amount;
        if (d <= limitDay) {
          res.same += r.amount;
          res.sameCount++;
          const ik = normKey_(r.item) || '—';
          if (!res.byItem[ik]) res.byItem[ik] = { name: r.item.trim(), total: 0 };
          res.byItem[ik].total += r.amount;
        }
      });

      // Luỹ kế đến mốc cắt — dùng cho đường biến động trong tháng
      let run = 0;
      for (let d = 1; d <= limitDay; d++) { run += perDay[d]; res.cum.push(run); }
      return res;
    }

    const cur = monthStats(name, cut);
    const prev = monthStats(prevName, cutPrev);

    /* Dãy nhiều tháng cho biểu đồ cột. Mỗi tháng hai con số: tổng cả tháng
       (cột nhạt) và tổng đến cùng kỳ (cột đậm). Tháng đang diễn ra thì hai
       con số bằng nhau vì chưa hết tháng. */
    const series = [];
    for (let k = CONFIG.COMPARE_MONTHS - 1; k >= 0; k--) {
      let mm = ps.month - k, yy = ps.year;
      while (mm <= 0) { mm += 12; yy -= 1; }
      const nm = 'T' + mm + '/' + yy;
      const len = new Date(yy, mm, 0).getDate();

      let st;
      if (nm === name) st = cur;                 // đã đọc rồi
      else if (nm === prevName) st = prev;       // đã đọc rồi
      else st = monthStats(nm, Math.min(cut, len));

      series.push({
        name: nm, month: mm, year: yy,
        full: st.full, same: st.same,
        isCur: nm === name, exists: st.exists, days: len
      });
    }

    /* Khoản mục biến động mạnh nhất — gộp 2 bên rồi xếp theo trị tuyệt đối.
       Khoản mục chỉ có ở một bên vẫn phải xuất hiện (mới phát sinh, hoặc đã
       ngừng chi) — đó thường là thông tin đáng chú ý nhất. */
    const itemKeys = {};
    Object.keys(cur.byItem).forEach(k => itemKeys[k] = 1);
    Object.keys(prev.byItem).forEach(k => itemKeys[k] = 1);
    const movers = Object.keys(itemKeys).map(k => {
      const a = cur.byItem[k] ? cur.byItem[k].total : 0;
      const b = prev.byItem[k] ? prev.byItem[k].total : 0;
      return {
        name: (cur.byItem[k] || prev.byItem[k]).name,
        cur: a, prev: b, delta: a - b
      };
    }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 8);

    const out = {
      ok: true,
      sheet: name,
      prevSheet: prevName,
      prevExists: prev.exists,
      cut: cut,
      cutPrev: cutPrev,
      clipped: clipped,
      daysInMonth: daysCur,
      isThisMonth: isThisMonth,
      curTotal: cur.same,
      prevTotal: prev.same,
      curCount: cur.sameCount,
      prevCount: prev.sameCount,
      prevFull: prev.full,
      curCum: cur.cum,
      prevCum: prev.cum,
      series: series,
      movers: movers
    };
    cache.put(ckey, JSON.stringify(out), CONFIG.TX_CACHE_TTL_SEC);
    return stamp_(out, _t0, false);
  } catch (err) {
    Logger.log('getCompare ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/** Quét Gmail, trả về giao dịch chưa xử lý (mới nhất trước) */
function scanBankEmails(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);
    if (!mailEnabled_()) return { ok: true, items: [], skipped: 0, off: true };

    const cache = CacheService.getScriptCache();
    if (!(payload && payload.force)) {
      const hit = cache.get('MAILSCAN_V1');
      if (hit) return stamp_(JSON.parse(hit), _t0, true);
    }

    const done = mailDoneSet_();
    const seen = mailSeenMap_();          // id Gmail → số lệnh (null = bỏ qua)
    let seenDirty = false;

    const threads = GmailApp.search(CONFIG.GMAIL.QUERY, 0, CONFIG.GMAIL.MAX_THREADS);
    const out = [];
    let skipped = 0;        // số biên lai trong tầm quét từng bị bấm ✕ bỏ qua

    threads.forEach(th => {
      th.getMessages().forEach(msg => {
        const gid = msg.getId();

        /* Đã gặp thư này rồi: biết ngay nó không phải biên lai, hoặc biên lai
           đã xử lý xong → bỏ qua mà KHÔNG cần tải nội dung thư.
           Đây là chỗ tiết kiệm thời gian nhiều nhất. */
        if (seen.hasOwnProperty(gid)) {
          const oid = seen[gid];
          if (!oid || done[oid]) {
            if (oid && done[oid] === 'k') skipped++;
            return;
          }
        }

        const tx = parseBankMail_(msg);

        /* Loại khỏi hàng chờ, và ghi vào bảng "đã gặp" như thể không phải
           biên lai để lần sau bỏ qua luôn mà không phải tải lại nội dung thư:
             • credit = tiền VÀO (hoàn tiền, nhận chuyển khoản) — không phải chi
             • failed = giao dịch KHÔNG THÀNH CÔNG — tiền chưa hề rời tài khoản */
        const keep = !!(tx && !tx.credit && !tx.failed);
        if (seen[gid] !== (keep ? tx.id : null)) {
          seen[gid] = keep ? tx.id : null;
          seenDirty = true;
        }
        if (!keep) return;
        if (done[tx.id]) {                // đã nhập hoặc đã bỏ qua
          if (done[tx.id] === 'k') skipped++;
          return;
        }
        delete tx.credit; delete tx.failed;   // không cần gửi xuống app
        out.push(tx);
      });
    });

    if (seenDirty) saveMailSeen_(seen);

    out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    const items = out.slice(0, CONFIG.GMAIL.MAX_ITEMS);

    // Đoán khoản mục dựa trên ghi chú cũ — chỉ gợi ý, không tự quyết
    const map = noteMap_();
    items.forEach(it => {
      const g = guessFromMap_(map, it.note + ' ' + it.payee);
      if (g) { it.guessHu = g.hu; it.guessItem = g.item; }
    });

    /* Đơn Shopee luôn về đúng một khoản mục, nên gán thẳng — đè lên cả phỏng
       đoán theo lịch sử, vì ở đây ta BIẾT chắc chứ không phải đoán.
       Chỉ đọc sheet LIST khi thật sự có đơn Shopee trong lượt quét này. */
    if (items.some(it => it.isShopee)) {
      const sp = resolveShopeeItem_();
      items.forEach(it => {
        if (!it.isShopee) return;
        delete it.isShopee;              // không cần gửi xuống app
        if (sp) { it.guessHu = sp.hu; it.guessItem = sp.item; }
      });
    }

    flagDuplicates_(items);

    const res = { ok: true, items: items, skipped: skipped };
    cache.put('MAILSCAN_V1', JSON.stringify(res), CONFIG.GMAIL.SCAN_TTL_SEC);
    return stamp_(res, _t0, false);
  } catch (err) {
    Logger.log('scanBankEmails ERROR: ' + err.stack);
    return { ok: false, message: err.message, items: [] };
  }
}

/**
 * Đánh dấu biên lai có khả năng ĐÃ được ghi tay vào sheet.
 *
 * Cơ chế "đã xử lý" (MAIL_DONE_V1) chỉ ghi nhận khi bạn bấm nút "Dùng". Nếu
 * bạn tự gõ tay giao dịch đó thì số lệnh không được đánh dấu, nên lần quét sau
 * nó vẫn hiện — dễ nhập trùng.
 *
 * Ở đây CỐ Ý chỉ gắn cờ cảnh báo chứ không tự ẩn: cùng ngày cùng số tiền hoàn
 * toàn có thể là hai giao dịch thật (hai ly cà phê 35.000đ), tự ẩn sẽ làm mất
 * giao dịch thật — sai nguy hiểm hơn hiện thừa một dòng.
 *
 * Chỉ đọc mỗi sheet một lần dù có bao nhiêu biên lai thuộc sheet đó.
 */
function flagDuplicates_(items) {
  try {
    if (!items.length) return;
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const bySheet = {};
    items.forEach(it => {
      if (!it.sheet) return;
      (bySheet[it.sheet] = bySheet[it.sheet] || []).push(it);
    });

    const cache = CacheService.getScriptCache();

    Object.keys(bySheet).forEach(name => {
      /* Dùng lại gói giao dịch đã cache của getTransactions nếu có — tránh đọc
         lại cả bảng chỉ để đối chiếu trùng. Chính tôi đã thêm phép đọc này ở
         lượt trước và nó làm chậm lại đúng cái vừa tối ưu. */
      let rows = null;
      const hit = cache.get('TX_' + name);
      if (hit) {
        try { rows = JSON.parse(hit).rows || []; } catch (e) { rows = null; }
      }
      if (!rows) {
        const sh = ss.getSheetByName(name);
        if (!sh) return;                     // sheet tháng đó chưa tạo
        rows = readTransactions_(sh).rows;
      }

      // Khóa "ngày|số tiền" → số dòng đã có trong sheet
      const seen = {};
      rows.forEach(r => {
        if (!r.dateKey || !r.amount) return;
        const k = r.dateKey + '|' + Math.round(r.amount);
        seen[k] = (seen[k] || 0) + 1;
      });

      bySheet[name].forEach(it => {
        const k = it.dateKey + '|' + Math.round(it.amount);
        if (seen[k]) it.maybeDup = true;
      });
    });
  } catch (err) {
    // Không chặn luồng quét vì một lỗi phụ trợ
    Logger.log('flagDuplicates_ ERROR: ' + err.stack);
  }
}

/**
 * Lấy toàn văn một email biên lai để xem lại — chỉ gọi khi người dùng chạm vào
 * một dòng trong thẻ "Từ email ngân hàng". Tách riêng khỏi scanBankEmails để
 * thân thư không nằm trong gói cache của danh sách.
 * payload: { pin, gmailId }
 */
function getMailDetail(payload) {
  try {
    assertPin_(payload && payload.pin);
    const gid = String((payload && payload.gmailId) || '').trim();
    if (!gid) return { ok: false, message: 'Thiếu mã email' };

    const cache = CacheService.getScriptCache();
    const key = 'MAILBODY_' + gid;
    const hit = cache.get(key);
    if (hit) return JSON.parse(hit);

    const msg = GmailApp.getMessageById(gid);
    if (!msg) return { ok: false, message: 'Không tìm thấy email' };

    let body = '';
    try { body = msg.getPlainBody() || ''; } catch (e) { body = ''; }
    if (!body.trim()) {
      body = String(msg.getBody() || '')
        .replace(/<(br|\/tr|\/td|\/p|\/div|\/h\d)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');
    }

    /* Dọn đúng như lúc parse: gỡ dấu sao markdown, gộp khoảng trắng, bỏ dòng
       trống — để bạn đọc được thay vì nhìn một mớ "*Số tiền*". Cắt bớt phần
       chân thư quảng cáo dài lê thê ở cuối. */
    const lines = body.split(/\r?\n/)
      .map(s => s.replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(s => s)
      .slice(0, 60);

    const res = {
      ok: true,
      subject: String(msg.getSubject() || '').trim(),
      from: String(msg.getFrom() || '').trim(),
      when: Utilities.formatDate(msg.getDate(), CONFIG.TIMEZONE,
                                 'HH:mm · dd/MM/yyyy'),
      lines: lines
    };
    cache.put(key, JSON.stringify(res), 1800);   // thư cũ không đổi, cache 30'
    return res;
  } catch (err) {
    Logger.log('getMailDetail ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Đánh dấu một số lệnh đã xử lý.
 * payload: { pin, id, kind }  — kind: 'skip' nếu người dùng bấm ✕, còn lại
 * mặc định là đã ghi vào sheet.
 */
function markMailDone(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);
    const id = String((payload && payload.id) || '').trim();
    if (!id) return { ok: false, message: 'Thiếu mã giao dịch' };
    markMailDone_(payload, id);
    return stamp_({ ok: true }, _t0, false);
  } catch (err) {
    Logger.log('markMailDone ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Phần lõi, KHÔNG kiểm tra PIN — để addExpense gọi trực tiếp sau khi ghi
 * thành công, khỏi tốn thêm một vòng gọi mạng riêng.
 * Số đo cho thấy mỗi vòng gọi mất ~1,3 giây chỉ riêng phần mạng; ghi một giao
 * dịch từ email trước đây tốn HAI vòng (addExpense + markMailDone), tức mất
 * không ~1,3 giây mỗi lần. Gộp lại là tiết kiệm được đúng chừng đó.
 */
function markMailDone_(payload, id) {
  const kind = String((payload && payload.kind) || '');
  const props = PropertiesService.getScriptProperties();

  const map = mailDoneSet_();
  map[id] = (kind === 'skip') ? 'k' : 's';

  /* Đã GHI vào sheet thì nhớ luôn đường về: nếu sau này bạn xoá giao dịch đó
     khỏi lịch sử, deleteExpense sẽ tra bảng này để trả biên lai về hàng chờ. */
  const sheetName = String((payload && payload.sheetName) || '').trim();
  const dateKey = String((payload && payload.dateKey) || '').trim();
  const amount = Number((payload && payload.amount) || 0);

  /* Ghi CẢ HAI bảng bằng MỘT lệnh setProperties. Properties Service là thao
     tác chậm nhất trong cả script — trong nhật ký đo có lần markMailDone mất
     11,5 giây. Bản cũ gọi setProperty hai lần riêng; gộp lại còn một lượt. */
  const toWrite = {};
  toWrite[CONFIG.GMAIL.DONE_KEY] = JSON.stringify(trimMap_(map, CONFIG.GMAIL.DONE_KEEP));

  if (kind !== 'skip' && sheetName && dateKey && amount) {
    const rowMap = mailRowMap_();
    rowMap[mailRowKey_(sheetName, dateKey, amount)] = id;
    toWrite[CONFIG.GMAIL.ROWKEY_KEY] =
      JSON.stringify(trimMap_(rowMap, CONFIG.GMAIL.ROWKEY_KEEP));
  }
  props.setProperties(toWrite, false);
  CacheService.getScriptCache().remove('MAILSCAN_V1');
}

/** Cắt bớt bảng, giữ các mục mới nhất */
function trimMap_(map, keep) {
  const keys = Object.keys(map);
  if (keys.length <= keep) return map;
  const t = {};
  keys.slice(keys.length - keep).forEach(k => t[k] = map[k]);
  return t;
}

/**
 * Hoàn tác MỘT lần bỏ qua — dùng cho nút "Hoàn tác" hiện ngay sau khi bấm ✕.
 * Chỉ gỡ được mục đang ở trạng thái 'k'; mục đã ghi vào sheet thì không đụng,
 * tránh việc một cú chạm nhầm làm giao dịch đã nhập hiện lại.
 * payload: { pin, id }
 */
function undoMailSkip(payload) {
  try {
    assertPin_(payload && payload.pin);
    const id = String((payload && payload.id) || '').trim();
    if (!id) return { ok: false, message: 'Thiếu mã giao dịch' };

    const map = mailDoneSet_();
    if (map[id] !== 'k') return { ok: false, message: 'Giao dịch này đã được ghi' };
    delete map[id];
    saveMailDone_(map);
    CacheService.getScriptCache().remove('MAILSCAN_V1');
    return { ok: true };
  } catch (err) {
    Logger.log('undoMailSkip ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Bỏ HẲN các giao dịch đang ở trạng thái "đã bỏ qua": đổi nhãn 'k' → 'x'.
 * Chúng vẫn bị chặn khỏi hàng chờ y như trước, nhưng thôi không được tính vào
 * lời mời "Lấy lại N giao dịch" nữa — nên lời mời đó biến mất khỏi giao diện.
 * KHÔNG xoá khỏi bảng: xoá khỏi bảng thì lần quét sau chúng hiện lại ngay, tức
 * là làm đúng điều ngược lại với ý định.
 * payload: { pin }
 */
function purgeSkippedMail(payload) {
  try {
    assertPin_(payload && payload.pin);
    const map = mailDoneSet_();
    let n = 0;
    Object.keys(map).forEach(id => {
      if (map[id] === 'k') { map[id] = 'x'; n++; }
    });
    if (!n) return { ok: true, purged: 0, message: 'Không có giao dịch nào đã bỏ qua' };

    saveMailDone_(map);
    CacheService.getScriptCache().remove('MAILSCAN_V1');
    return { ok: true, purged: n,
             message: 'Đã bỏ hẳn ' + n + ' giao dịch, sẽ không hỏi lại nữa' };
  } catch (err) {
    Logger.log('purgeSkippedMail ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Khôi phục TẤT CẢ giao dịch từng bị bỏ qua — các mục 'k' bị gỡ khỏi bảng,
 * các mục 's' (đã ghi vào sheet) giữ nguyên nên không bị nhập trùng.
 * Khác hẳn resetMailDone() vốn xóa sạch cả hai loại.
 * payload: { pin }
 */
function restoreSkippedMail(payload) {
  try {
    assertPin_(payload && payload.pin);
    const map = mailDoneSet_();
    let n = 0;
    Object.keys(map).forEach(id => {
      if (map[id] === 'k') { delete map[id]; n++; }
    });
    if (!n) return { ok: true, restored: 0, message: 'Không có giao dịch nào đã bỏ qua' };

    saveMailDone_(map);
    CacheService.getScriptCache().remove('MAILSCAN_V1');
    return { ok: true, restored: n,
             message: 'Đã khôi phục ' + n + ' giao dịch đã bỏ qua' };
  } catch (err) {
    Logger.log('restoreSkippedMail ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/* ===================== HẠN MỨC CHI TIÊU ===================== */
/** Đọc bảng hạn mức. Hỏng hoặc chưa đặt thì trả bảng rỗng, không ném lỗi. */
function budgetMap_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties()
      .getProperty(CONFIG.BUDGET_KEY) || '{}');
  } catch (e) { return {}; }
}

/** Hạn mức áp dụng cho một tháng: ưu tiên khoá riêng, không có thì lấy mặc định */
function budgetFor_(sheetName) {
  const m = budgetMap_();
  const own = Number(m[sheetName] || 0);
  if (own > 0) return { amount: own, own: true };
  const def = Number(m['default'] || 0);
  return { amount: def > 0 ? def : 0, own: false };
}

/**
 * Đặt hạn mức. payload: { pin, amount, sheetName, scope }
 *   scope 'month' → chỉ tháng đó;  'default' → mọi tháng chưa đặt riêng
 *   amount = 0    → xoá hạn mức đang có
 */
function setBudget(payload) {
  const _t0 = Date.now();
  try {
    assertPin_(payload && payload.pin);
    const amount = parseVndAmount_(payload && payload.amount) || 0;
    const scope = String((payload && payload.scope) || 'default');
    const sheetName = String((payload && payload.sheetName) || '').trim();
    if (scope === 'month' && !CONFIG.SHEET_PATTERN.test(sheetName)) {
      throw new Error('Sheet không hợp lệ.');
    }
    if (amount > CONFIG.MAX_AMOUNT) throw new Error('Hạn mức quá lớn.');

    const key = (scope === 'month') ? sheetName : 'default';
    const m = budgetMap_();
    if (amount > 0) m[key] = amount; else delete m[key];
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.BUDGET_KEY, JSON.stringify(m));

    invalidateCaches_(CacheService.getScriptCache(), sheetName,
                      (parseSheetName_(sheetName) || {}).year || 0);

    return stamp_({ ok: true, budget: budgetFor_(sheetName),
      message: amount > 0
        ? ('Hạn mức ' + (scope === 'month' ? sheetName : 'mặc định') + ': '
           + formatVnd_(amount))
        : 'Đã bỏ hạn mức' }, _t0, false);
  } catch (err) {
    Logger.log('setBudget ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/* ===================== HÂM NÓNG CACHE ===================== */
/**
 * CHẠY BẰNG TRIGGER mỗi 5 phút. Gọi sẵn getBootstrap để cache luôn nóng, nhờ
 * đó lúc bạn mở app phần máy chủ chỉ còn vài chục ms thay vì ~1.000 ms.
 *
 * Số đo cho thấy đây là đòn bẩy CUỐI CÙNG còn lại: chặng mở app đã xuống
 * 158 ms, phần mạng ~1,5–1,9 giây là sàn cứng của việc gọi Apps Script từ tên
 * miền khác, nên chỗ duy nhất còn cắt được là ~900 ms máy chủ của lần gọi
 * nguội đầu tiên.
 *
 * Hâm cả hai khóa: khóa AUTO (khi app không gửi tên sheet) và khóa theo đúng
 * tên sheet tháng này — app gửi tên sheet đã lưu nên phải có cả hai.
 */
function warmCache() {
  try {
    const pin = CONFIG.APP_PIN;
    const name = buildSheetName_(new Date());

    getBootstrap({ pin: pin });                    // khóa BOOT_AUTO
    getBootstrap({ pin: pin, sheetName: name });   // khóa BOOT_<sheet>
    getTransactions({ pin: pin, sheetName: name });

    Logger.log('Đã hâm cache cho ' + name);
  } catch (err) {
    // Lỗi ở đây không được làm phiền ai: app vẫn chạy, chỉ là nguội hơn
    Logger.log('warmCache ERROR: ' + err.stack);
  }
}

/**
 * CHẠY TAY MỘT LẦN để tạo trigger 5 phút cho warmCache.
 * Gọi lại nhiều lần cũng không tạo trùng — hàm tự xóa trigger cũ trước.
 */
function installWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'warmCache') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('warmCache').timeBased().everyMinutes(5).create();
  Logger.log('Đã tạo trigger: warmCache chạy mỗi 5 phút.');
}

/** CHẠY TAY để gỡ trigger hâm cache */
function removeWarmTrigger() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'warmCache') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Đã gỡ ' + n + ' trigger warmCache.');
}

/* ===================== ĐO TỐC ĐỘ ===================== */
/**
 * Gắn thời gian xử lý phía máy chủ vào kết quả trả về.
 *   ms     = số mili giây hàm này chạy trên máy chủ Google
 *   cached = kết quả lấy từ cache hay tính mới
 * App lấy hiệu (thời gian đi-về trên điện thoại − ms) để biết bao nhiêu là
 * mạng, bao nhiêu là máy chủ — không có con số này thì mọi tối ưu đều là đoán.
 */
function stamp_(obj, t0, cached) {
  try {
    obj.ms = Date.now() - t0;
    obj.cached = !!cached;
  } catch (e) { /* đối tượng đông cứng — bỏ qua, không làm hỏng luồng chính */ }
  return obj;
}

/**
 * CHẠY TAY để đo riêng phần máy chủ, không lẫn thời gian mạng và iframe.
 * Mỗi phép đo chạy 2 lần: lần đầu tính mới, lần sau lấy từ cache — chênh lệch
 * giữa hai lần chính là giá trị thật mà cache mang lại.
 */
function benchmarkServer() {
  const pin = CONFIG.APP_PIN;
  const log = [];

  function run(name, fn) {
    const t = Date.now();
    let note = '';
    try {
      const r = fn();
      note = (r && r.cached) ? ' (từ cache)' : ' (tính mới)';
      if (r && r.ok === false) note = ' LỖI: ' + r.message;
    } catch (e) { note = ' NGOẠI LỆ: ' + e.message; }
    log.push('  ' + name + ': ' + (Date.now() - t) + ' ms' + note);
  }

  /* Xóa cache trước để lần đầu là số đo "nguội" thật. Phải xóa cả khóa theo
     TÊN SHEET, không chỉ khóa AUTO, nếu không lần 1 vẫn trúng cache và phép
     đo mất sạch ý nghĩa. */
  const c = CacheService.getScriptCache();
  const yr = new Date().getFullYear();
  invalidateCaches_(c, '', yr);
  const keys = ['MAILSCAN_V1'];
  try {
    listMonthSheets_(getSS_()).forEach(s => {
      keys.push('TX_' + s.name);
      keys.push('BOOT_' + s.name + '_' + fmtDateKey_(new Date()));
      keys.push('YEAR_' + s.year);
    });
  } catch (e) { /* không đọc được sheet thì xóa được bao nhiêu hay bấy nhiêu */ }
  c.removeAll(keys);

  log.push('--- LẦN 1: cache rỗng ---');
  run('getBootstrap   ', () => getBootstrap({ pin: pin }));
  run('getTransactions', () => getTransactions({ pin: pin }));
  run('getYearSummary ', () => getYearSummary({ pin: pin }));
  run('scanBankEmails ', () => scanBankEmails({ pin: pin, force: true }));

  log.push('--- LẦN 2: đã có cache ---');
  run('getBootstrap   ', () => getBootstrap({ pin: pin }));
  run('getTransactions', () => getTransactions({ pin: pin }));
  run('getYearSummary ', () => getYearSummary({ pin: pin }));
  run('scanBankEmails ', () => scanBankEmails({ pin: pin }));

  Logger.log('ĐO TỐC ĐỘ MÁY CHỦ (chỉ phần Apps Script, chưa tính mạng/iframe)');
  log.forEach(l => Logger.log(l));
  Logger.log('Cách đọc: LẦN 2 thấp hơn hẳn LẦN 1 nghĩa là cache đang chạy đúng. '
    + 'Nếu một hàm nào đó CAO ở cả hai lần thì cache của nó hỏng hoặc chưa có. '
    + 'Mọi con số ở đây là thời gian MÁY CHỦ — thời gian chờ thật trên điện '
    + 'thoại còn cộng thêm mạng và chặng vỏ + sandbox, xem thẻ "Tốc độ tải" '
    + 'trong tab Thống kê của app.');
}

/* ===================== CÔNG TẮC QUÉT EMAIL ===================== */
/**
 * Người dùng có bật quét email không?
 * Lưu ở Script Properties chứ KHÔNG ở bộ nhớ trình duyệt: app chạy trong
 * iframe lồng 2 lớp, bộ nhớ trình duyệt có thể bị Safari xoá hoặc ngăn cách,
 * mà một công tắc thì phải nhớ cho chắc. Lưu phía máy chủ còn được cái lợi là
 * mở ở máy nào cũng giữ nguyên lựa chọn.
 * Mặc định BẬT để người đang dùng không bị mất tính năng sau khi cập nhật.
 */
function mailEnabled_() {
  if (!CONFIG.GMAIL.ENABLED) return false;        // công tắc cứng đè lên tất cả
  try {
    const v = PropertiesService.getScriptProperties()
      .getProperty(CONFIG.GMAIL.ON_KEY);
    return v === null || v === undefined || v === '' ? true : (v === '1');
  } catch (e) { return true; }
}

/**
 * Bật/tắt quét email. payload: { pin, on }
 *
 * Tắt là ĐỂ ẨN, không phải để xoá. Trước đây hàm này xoá cache MAILSCAN_V1 khi
 * tắt, nên bật lại là mất sạch kết quả vừa quét và phải quét lại từ đầu — mà
 * một lượt quét tốn gần 6 giây. Nay cache được giữ nguyên: tắt rồi bật lại là
 * thấy lại đúng danh sách cũ, không tốn thêm lời gọi nào.
 */
function setMailEnabled(payload) {
  try {
    assertPin_(payload && payload.pin);
    if (!CONFIG.GMAIL.ENABLED) {
      return { ok: false, message: 'Tính năng đọc email đang tắt trong CONFIG' };
    }
    const on = !!(payload && payload.on);
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.GMAIL.ON_KEY, on ? '1' : '0');
    // CỐ Ý không đụng tới cache MAILSCAN_V1 — xem phần giải thích ở trên.
    return { ok: true, on: on,
             message: on ? 'Đã bật quét email' : 'Đã tắt quét email' };
  } catch (err) {
    Logger.log('setMailEnabled ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/* ============ BẢNG TRA NGƯỢC: DÒNG SHEET → BIÊN LAI ============ */
/** Khoá tra ngược. Cố ý không dùng số dòng: xoá một dòng là mọi dòng sau dồn
    lên 1, số dòng lập tức sai. Ngày + số tiền thì không đổi. */
function mailRowKey_(sheetName, dateKey, amount) {
  return String(sheetName) + '|' + String(dateKey) + '|' + Math.round(Number(amount) || 0);
}

function mailRowMap_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties()
      .getProperty(CONFIG.GMAIL.ROWKEY_KEY) || '{}');
  } catch (e) { return {}; }
}

function saveMailRowMap_(map) {
  try {
    let keys = Object.keys(map);
    if (keys.length > CONFIG.GMAIL.ROWKEY_KEEP) {
      const t = {};
      keys.slice(keys.length - CONFIG.GMAIL.ROWKEY_KEEP).forEach(k => t[k] = map[k]);
      map = t;
    }
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.GMAIL.ROWKEY_KEY, JSON.stringify(map));
  } catch (e) { Logger.log('saveMailRowMap_ ERROR: ' + e.message); }
}

/**
 * Trả một biên lai về lại hàng chờ sau khi giao dịch tương ứng bị XOÁ khỏi
 * lịch sử. Gỡ hẳn số lệnh khỏi bảng đã-xử-lý để lần quét sau nó hiện lại.
 * Trả về true nếu có tìm thấy biên lai để trả về.
 */
function releaseMailForRow_(sheetName, dateKey, amount) {
  try {
    const key = mailRowKey_(sheetName, dateKey, amount);
    const rowMap = mailRowMap_();
    const orderId = rowMap[key];
    if (!orderId) return false;

    const done = mailDoneSet_();
    if (done[orderId] === 'k' || done[orderId] === 'x') return false;  // bạn đã chủ ý bỏ
    delete done[orderId];
    saveMailDone_(done);

    delete rowMap[key];
    saveMailRowMap_(rowMap);
    CacheService.getScriptCache().remove('MAILSCAN_V1');
    return true;
  } catch (err) {
    Logger.log('releaseMailForRow_ ERROR: ' + err.stack);
    return false;
  }
}

/* ===================== CÔNG TẮC SỬA GIAO DỊCH ===================== */
/**
 * Có được phép sửa giao dịch đã ghi không?
 * Mặc định TẮT (ngược với công tắc email, vốn mặc định bật) — vì hậu quả của
 * hai thứ khác hẳn nhau: quét email sai thì chỉ hiện thừa một dòng để bạn bỏ
 * qua, còn sửa nhầm thì dữ liệu đã ghi bị đổi mất.
 */
function editEnabled_() {
  try {
    return PropertiesService.getScriptProperties()
      .getProperty(CONFIG.EDIT_ON_KEY) === '1';
  } catch (e) { return false; }
}

/** Bật/tắt quyền sửa. payload: { pin, on } */
function setEditEnabled(payload) {
  try {
    assertPin_(payload && payload.pin);
    const on = !!(payload && payload.on);
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.EDIT_ON_KEY, on ? '1' : '0');
    return { ok: true, on: on,
             message: on ? 'Đã mở khóa sửa giao dịch' : 'Đã khóa sửa giao dịch' };
  } catch (err) {
    Logger.log('setEditEnabled ERROR: ' + err.stack);
    return { ok: false, message: err.message };
  }
}

/**
 * Tìm khoản mục dành cho đơn Shopee trong sheet LIST.
 * Dò theo từ khoá đã bỏ dấu, ưu tiên từ khoá đứng trước: 'spaylater' khớp
 * trước 'shopee', nên nếu LIST có cả "SHOPEE SPaylater" lẫn "TIỀN SHOPEE" thì
 * chọn đúng cái SPayLater.
 */
function resolveShopeeItem_() {
  try {
    const list = readList_();
    const keys = CONFIG.GMAIL.SHOPEE_ITEM_MATCH || [];
    for (let i = 0; i < keys.length; i++) {
      const needle = deburr_(keys[i]);
      const hit = list.items.filter(it => deburr_(it.t).indexOf(needle) >= 0)[0];
      if (!hit) continue;
      const hu = list.hu.filter(h => normKey_(h.v) === hit.huKey)[0];
      if (hu) return { hu: hu.v, item: hit.v };
    }
  } catch (err) {
    Logger.log('resolveShopeeItem_ ERROR: ' + err.stack);
  }
  return null;
}

/* ===================== NHÃN TỰ ĐỘNG ===================== */
/**
 * Dựng bảng: khoá khoản mục → nhãn, từ CONFIG.TAG_RULES khớp với LIST thật.
 * Dò bằng chuỗi đã bỏ dấu nên không phụ thuộc cách gõ dấu trong sheet.
 */
function resolveTagRules_(list) {
  const map = {};
  (CONFIG.TAG_RULES || []).forEach(rule => {
    const needles = rule.match.map(m => deburr_(m));
    list.items.forEach(it => {
      const d = deburr_(it.t);
      if (needles.some(n => d.indexOf(n) >= 0)) map[normKey_(it.v)] = rule.tag;
    });
  });
  return map;
}

/* ===================== PHÍM TẮT KHOẢN MỤC ===================== */
/**
 * Khớp từng phím tắt với khoản mục THẬT trong sheet LIST.
 * Dò bằng chuỗi đã bỏ dấu nên không phụ thuộc cách gõ dấu trong sheet.
 * Phím tắt không khớp được thì bỏ qua — thà thiếu nút còn hơn hiện một nút
 * bấm vào là lỗi "khoản mục không hợp lệ".
 */
function resolveShortcuts_(list) {
  const out = [];
  (CONFIG.SHORTCUTS || []).forEach(sc => {
    let hit = null;
    for (let i = 0; i < sc.match.length && !hit; i++) {
      const needle = deburr_(sc.match[i]);
      hit = list.items.filter(it => deburr_(it.t).indexOf(needle) >= 0)[0] || null;
    }
    if (!hit) return;
    const hu = list.hu.filter(h => normKey_(h.v) === hit.huKey)[0];
    if (!hu) return;
    out.push({ key: sc.key, label: sc.label, emoji: sc.emoji,
               hu: hu.v, item: hit.v });
  });
  return out;
}

/* ===================== NHÃN (TAG) ===================== */
/**
 * Bóc các #thẻ ra khỏi ghi chú.
 * Chỉ nhận chữ/số/gạch dưới nên dấu # trong "#1", "#abc-def" không gây rối.
 * Trả về mảng thẻ đã hạ chữ thường, không trùng lặp.
 */
function extractTags_(note) {
  const out = [];
  // Phải bắt đầu bằng CHỮ CÁI: ghi chú hay có "#1234" là số hoá đơn, mã
  // đơn hàng — không phải nhãn. Nhận cả số thì thống kê đầy rác.
  const re = /#([A-Za-z][A-Za-z0-9_]{1,19})/g;
  let m;
  while ((m = re.exec(String(note || '')))) {
    const t = m[1].toLowerCase();
    if (out.indexOf(t) < 0) out.push(t);
  }
  return out;
}

/** Xóa mọi cache bị ảnh hưởng sau khi ghi hoặc xóa một giao dịch */
function invalidateCaches_(cache, sheetName, year) {
  const d = fmtDateKey_(new Date());
  cache.removeAll([
    'BOOT_' + sheetName + '_' + d,
    'BOOT_AUTO_' + d,
    'TX_' + sheetName,
    'TX_AUTO',
    'CMP_' + sheetName + '_' + d,
    'CMP_AUTO_' + d,
    'YEAR_' + year,
    'NOTEMAP_V2'
  ]);
}

/**
 * Bảng số lệnh đã xử lý: { số lệnh → 's' | 'k' }
 *   's' = đã ghi vào sheet        (saved)
 *   'k' = bỏ qua, CÒN lấy lại được (skip)
 *   'x' = bỏ hẳn, thôi không hỏi nữa (purged)
 *
 * Ba trạng thái chứ không phải hai, vì chúng trả lời ba câu hỏi khác nhau:
 *   • có hiện lại trong hàng chờ không?  → cả 3 đều KHÔNG
 *   • có khôi phục lại được không?       → chỉ 'k'
 *   • có đếm vào lời mời "lấy lại" không? → chỉ 'k'
 * Nhờ 'x' mà lời mời "Lấy lại N giao dịch" biến mất hẳn thay vì đeo bám mãi,
 * trong khi dữ liệu vẫn bị chặn y nguyên.
 *
 * Tương thích ngược: bản cũ lưu mảng ["id1","id2"]. Mảng cũ được coi là 's'
 * (đã ghi) vì đó là cách hiểu an toàn — không làm hiện lại thứ đã nhập.
 */
function mailDoneSet_() {
  const out = {};
  try {
    const raw = PropertiesService.getScriptProperties()
      .getProperty(CONFIG.GMAIL.DONE_KEY) || '{}';
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      data.forEach(id => { out[String(id)] = 's'; });   // định dạng cũ
    } else {
      Object.keys(data).forEach(id => {
        const v = data[id];
        out[id] = (v === 'k' || v === 'x') ? v : 's';
      });
    }
  } catch (e) { /* lần đầu chưa có gì, bỏ qua */ }
  return out;
}

/** Ghi bảng đã xử lý, cắt bớt mục cũ cho khỏi vượt hạn mức Properties */
function saveMailDone_(map) {
  let keys = Object.keys(map);
  if (keys.length > CONFIG.GMAIL.DONE_KEEP) {
    const trimmed = {};
    keys.slice(keys.length - CONFIG.GMAIL.DONE_KEEP)
        .forEach(k => trimmed[k] = map[k]);
    map = trimmed;
  }
  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.GMAIL.DONE_KEY, JSON.stringify(map));
}

/** Bảng thư đã đọc: id Gmail → số lệnh, hoặc null nếu không phải biên lai */
function mailSeenMap_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties()
      .getProperty(CONFIG.GMAIL.SEEN_KEY) || '{}');
  } catch (e) { return {}; }
}

function saveMailSeen_(map) {
  try {
    let keys = Object.keys(map);
    // Giữ các mục mới nhất, cắt bớt cho khỏi vượt hạn mức Properties
    if (keys.length > CONFIG.GMAIL.SEEN_KEEP) {
      const trimmed = {};
      keys.slice(keys.length - CONFIG.GMAIL.SEEN_KEEP).forEach(k => trimmed[k] = map[k]);
      map = trimmed;
    }
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.GMAIL.SEEN_KEY, JSON.stringify(map));
  } catch (e) {
    Logger.log('saveMailSeen_ ERROR: ' + e.message);
  }
}

/** Bóc 1 biên lai Vietcombank. Không phải biên lai → trả null */
/**
 * Chọn bộ bóc tách theo người gửi. Mỗi ngân hàng một mẫu biên lai khác nhau,
 * nên không thể dùng chung một hàm.
 */
function parseBankMail_(msg) {
  let from = '';
  try { from = String(msg.getFrom() || '').toLowerCase(); } catch (e) { from = ''; }
  if (from.indexOf('cake.vn') >= 0) return parseCakeMail_(msg);

  if (from.indexOf('shopee') >= 0) {
    try {
      const lines = mailLines_(msg);
      return parseShopeeMail_(msg, lines, lines.join(' | '));
    } catch (e) { Logger.log('parseShopeeMail_: ' + e.message); return null; }
  }

  /* Vietcombank gửi 2 mẫu thư khác hẳn nhau. Nhận diện bằng các nhãn CHỈ có
     ở thông báo giao dịch thẻ ("Sử dụng tại", "Tình trạng giao dịch"), chắc
     chắn hơn là dựa vào tiêu đề thư. */
  try {
    const lines = mailLines_(msg);
    const flat = lines.join(' | ');
    const low = flat.toLowerCase();
    if (low.indexOf('sử dụng tại') >= 0 || low.indexOf('tình trạng giao dịch') >= 0
        || low.indexOf('status of transaction') >= 0) {
      return parseVcbCardMail_(msg, lines, flat);
    }
  } catch (e) { /* đọc hỏng thì để hàm biên lai thử tiếp */ }

  return parseVcbMail_(msg);
}

/**
 * Giao dịch có thành công không?
 * Chỉ dựa trên giá trị của ô "Tình trạng giao dịch" — KHÔNG quét cả thư, vì
 * phần chân thư của Vietcombank có hẳn đoạn "...bảo vệ quyền và lợi ích..."
 * và nhiều chữ khác dễ gây khớp nhầm.
 * Thư không có ô tình trạng (biên lai chuyển tiền) thì coi như thành công —
 * ngân hàng chỉ gửi biên lai khi lệnh đã đi.
 */
function mailStatusFailed_(flat, lines) {
  const st = flatAfter_(flat, ['tình trạng giao dịch', 'trạng thái giao dịch',
                               'tình trạng', 'status of transaction'])
          || fieldAfter_(lines, ['tình trạng giao dịch', 'trạng thái giao dịch',
                                 'status of transaction']);
  if (!st) return false;                       // không có ô tình trạng
  const low = deburr_(String(st)).toLowerCase() + ' ' + String(st).toLowerCase();
  return MAIL_FAIL_WORDS.some(w => low.indexOf(w) >= 0);
}

/** Gỡ dấu sao markdown của Gmail, gộp khoảng trắng, bỏ dòng trống */
function mailLines_(msg) {
  let body = '';
  try { body = msg.getPlainBody() || ''; } catch (e) { body = ''; }
  if (!body.trim()) {
    body = String(msg.getBody() || '')
      .replace(/<(br|\/tr|\/td|\/p|\/div|\/h\d)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');
  }
  return body.split(/\r?\n/)
    .map(s => s.replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(s => s);
}

/**
 * Số tiền CÓ DẤU. Cake ghi rõ chiều tiền ngay trước con số:
 *    "-66,800 VND"  → tiền ra  (chi tiêu)
 *    "+3,000 VND"   → tiền vào (hoàn tiền, nhận chuyển khoản)
 * Phải phân biệt, nếu không một khoản hoàn tiền 3.000đ sẽ bị ghi thành
 * khoản CHI 3.000đ, làm sai cả tổng tháng.
 * Không có dấu thì mặc định coi là tiền ra — thông báo giao dịch đa phần là chi.
 */
function parseSignedAmount_(s) {
  const t = String(s || '').trim();
  if (!t) return { amount: 0, credit: false };
  const m = t.match(/([+\-−–])?\s*([\d][\d.,\s]*)/);
  if (!m) return { amount: 0, credit: false };
  return { amount: parseMailAmount_(m[2]), credit: m[1] === '+' };
}

/* Tên tháng tiếng Anh — Cake gửi kèm bản tiếng Anh "October 19, 2026" */
const MAIL_MONTH_EN = ['january','february','march','april','may','june','july',
  'august','september','october','november','december'];

/**
 * Ngày giờ giao dịch, chấp nhận nhiều kiểu viết:
 *   19/10/2026 08:38:33      (Vietcombank, Cake bản tiếng Việt)
 *   October 19, 2026, 08:38  (Cake bản tiếng Anh)
 *   19 tháng 10, 2026        (Cake bản tiếng Việt kiểu dài)
 *   2026-10-19
 */
function parseMailDateAny_(s) {
  const t = String(s || '').trim();
  if (!t) return null;

  const d1 = parseMailDate_(t);                 // dd/mm/yyyy — ưu tiên
  if (d1) return d1;

  const low = t.toLowerCase();

  // "19 tháng 10, 2026" / "19 tháng 10 năm 2026"
  let m = low.match(/(\d{1,2})\s*tháng\s*(\d{1,2})[,\s]+(?:năm\s*)?(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);

  // "October 19, 2026"
  for (let i = 0; i < MAIL_MONTH_EN.length; i++) {
    const mn = MAIL_MONTH_EN[i];
    const re = new RegExp('(?:' + mn + '|' + mn.slice(0, 3) + ')\\.?\\s+(\\d{1,2})[,\\s]+(\\d{4})');
    const k = low.match(re);
    if (k) return new Date(Number(k[2]), i, Number(k[1]), 12, 0, 0);
  }

  // "2026-10-19"
  m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);

  return null;
}

/**
 * Bóc biên lai "Thông báo giao dịch thành công" của Cake by VPBank.
 *
 * Cấu trúc thư (song ngữ Việt — Anh):
 *   Thông tin tài khoản / Account information
 *     Tài khoản      | Account                 0908724815 - Tài khoản thanh toán
 *     Nhà cung cấp   | Supplier                BeGroup
 *   Thông tin giao dịch / Transaction information
 *     Loại giao dịch | Transaction type        Thanh toán dịch vụ BeGroup
 *     Mã giao dịch   | Transaction code        514394451
 *     Thời gian GD   | Trading date and time   19/10/2026 08:38:33
 *     Số tiền        | Amount                  -66,800 VND
 *     Phí giao dịch  | Transaction fees        0 VND
 *     Chi tiết GD    | Transaction details     ...
 *
 * Nhãn được khai CẢ tiếng Việt LẪN tiếng Anh vì không chắc Gmail dựng bản
 * text thuần theo ngôn ngữ nào — khai thừa thì vô hại, khai thiếu thì trượt.
 */
function parseCakeMail_(msg) {
  try {
    const lines = mailLines_(msg);
    if (!lines.length) return null;
    const flat = lines.join(' | ');
    const take = labels => flatAfter_(flat, labels) || fieldAfter_(lines, labels);

    const amtRaw = take(['số tiền', 'amount']);
    const sig = parseSignedAmount_(amtRaw);
    if (!sig.amount) return null;              // không có tiền → không phải biên lai

    const id = take(['mã giao dịch', 'số giao dịch', 'transaction code'])
               || String(msg.getId());
    const dateRaw = take(['thời gian giao dịch', 'ngày giờ giao dịch',
                          'ngày giao dịch', 'trading date and time',
                          'transaction date and time']);
    const d = parseMailDateAny_(dateRaw) || parseMailDateAny_(flat) || msg.getDate();

    const supplier = take(['nhà cung cấp', 'supplier', 'đơn vị thụ hưởng']);
    const txType   = take(['loại giao dịch', 'transaction type']);
    const detail   = take(['chi tiết giao dịch', 'nội dung giao dịch',
                           'transaction details']);
    const account  = take(['tài khoản', 'account']);
    const fee      = parseMailAmount_(take(['phí giao dịch', 'số tiền phí',
                                            'transaction fees']));

    /* Ghi chú dễ nhớ nhất là LOẠI giao dịch ("Thanh toán dịch vụ BeGroup"),
       vì "Chi tiết giao dịch" thường là một câu dài lặp lại. */
    const noteSrc = txType || supplier || detail || 'Giao dịch Cake';
    const note = String(noteSrc).trim().slice(0, CONFIG.MAX_NOTE_LEN);

    return {
      id: String(id),
      amount: sig.amount,
      credit: sig.credit,                      // true = tiền VÀO, không phải chi
      failed: mailStatusFailed_(flat, lines),
      dateKey: fmtDateKey_(d),
      dateLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM'),
      sheet: buildSheetName_(d),
      payee: String(supplier || '').trim(),
      note: note,

      gmailId: String(msg.getId()),
      timeLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm · dd/MM/yyyy'),
      content: String(detail || txType || '').trim(),
      bankName: 'Cake by VPBank',
      account: String(account || '').trim(),
      fee: fee,
      subject: (function () {
        try { return String(msg.getSubject() || '').trim().slice(0, 120); }
        catch (e) { return ''; }
      })()
    };
  } catch (err) {
    Logger.log('parseCakeMail_ ERROR: ' + err.stack);
    return null;
  }
}

/**
 * Bóc "Thông báo giao dịch thẻ" của Vietcombank — mẫu KHÁC hẳn biên lai
 * chuyển tiền, nên phải có hàm riêng:
 *
 *   Thẻ                   | Card Visa 452404...5907
 *   Sử dụng tại           | At AGODA.COM RIPPLE HOU Singapore SG
 *   Số tiền               | Transaction Amount 587,314 VND
 *   Ngày, giờ giao dịch   | Trans. Date, Time 20-10-2026 22:04:42
 *   Tài khoản trích nợ    | Debit Account 1023264176
 *   Tình trạng giao dịch  | Status of Transaction Không thành công
 *
 * Khác biệt đáng chú ý:
 *   • Không có số lệnh giao dịch → dùng id thư Gmail làm khóa (mỗi thư một
 *     giao dịch nên vẫn duy nhất và ổn định).
 *   • Ngày viết bằng gạch ngang 20-10-2026 chứ không phải gạch chéo.
 *   • CÓ ô tình trạng — đây là loại thư duy nhất có thể báo thất bại.
 */
function parseVcbCardMail_(msg, lines, flat) {
  const take = labels => flatAfter_(flat, labels) || fieldAfter_(lines, labels);

  const amount = parseMailAmount_(take(['số tiền giao dịch', 'số tiền']));
  if (!amount) return null;

  const dateRaw = take(['ngày, giờ giao dịch', 'ngày giờ giao dịch',
                        'ngày giao dịch']);
  const d = parseMailDateAny_(dateRaw) || parseMailDateAny_(flat) || msg.getDate();

  const where = take(['sử dụng tại', 'tại']);          // tên điểm bán hàng

  /* Số thẻ bóc bằng MẪU chứ không bằng nhãn: chữ "thẻ" còn nằm trong chính
     tiêu đề thư ("Thông báo giao dịch thẻ/..."), dò theo nhãn sẽ trúng tiêu đề
     và trả về cả câu tiếng Anh. Mẫu "452404...5907" thì không lẫn vào đâu. */
  const cardM = flat.match(/\b(\d{6}[.*xX•\s]{2,}\d{4})\b/);
  const card = cardM ? cardM[1].replace(/\s+/g, '') : '';

  const account = take(['tài khoản trích nợ', 'tài khoản']);

  const note = String(where || 'Giao dịch thẻ').trim().slice(0, CONFIG.MAX_NOTE_LEN);

  return {
    id: String(msg.getId()),
    amount: amount,
    failed: mailStatusFailed_(flat, lines),
    dateKey: fmtDateKey_(d),
    dateLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM'),
    sheet: buildSheetName_(d),
    payee: String(where || '').trim(),
    note: note,

    gmailId: String(msg.getId()),
    timeLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm · dd/MM/yyyy'),
    content: String(where || '').trim(),
    bankName: 'Vietcombank' + (card ? ' · ' + card : ''),
    account: String(account || '').trim(),
    fee: 0,
    subject: (function () {
      try { return String(msg.getSubject() || '').trim().slice(0, 120); }
      catch (e) { return ''; }
    })()
  };
}

/**
 * Bóc thư "Đơn hàng #... đã giao hàng thành công" của Shopee.
 *
 * Cấu trúc (bản text thuần Gmail dựng từ HTML):
 *   Mã đơn hàng:     #2610192N3RC03C
 *   Ngày đặt hàng:   19/10/2026 13:43:15
 *   Người bán:       mubaohiemroyaloffcial
 *   1. <tên sản phẩm>
 *   Mẫu mã / Số lượng / Giá: ₫609,000
 *   Tổng tiền:        ₫609,000
 *   Voucher từ Shopee:₫97,920
 *   Voucher từ Shop:  ₫33,000
 *   Phí vận chuyển:   ₫8,500
 *   Tổng thanh toán:  ₫421,880
 *
 * BA quyết định quan trọng:
 *
 * 1. SỐ TIỀN = "Tổng thanh toán", KHÔNG phải "Tổng tiền", và TUYỆT ĐỐI
 *    không tự cộng trừ ra.
 *    Thư có 5 con số tiền. "Tổng tiền" là giá trước giảm (609.000), số thật
 *    sự bị trừ là 421.880. Lấy nhầm thì sai 44%. Hai nhãn cùng bắt đầu bằng
 *    "Tổng t" nên phải khớp nhãn ĐẦY ĐỦ, và "tổng tiền" bị chặn trong
 *    MAIL_AMOUNT_BLOCK.
 *    Đã thử cộng tay để kiểm chứng:
 *        609.000 − 97.920 − 33.000 + 8.500 = 486.580  ≠  421.880
 *    Lệch 64.700đ — Shopee KHÔNG liệt kê hết các khoản giảm (voucher vận
 *    chuyển, Shopee Xu...). Nên tự tính lại tổng là sai chắc chắn; chỉ đọc
 *    đúng con số Shopee đã chốt.
 *
 * 2. NGÀY = "Ngày đặt hàng", không phải ngày giao.
 *    Mua SPayLater thì tiền ghi nợ lúc ĐẶT hàng. Thư này lại đến sau vài
 *    ngày, nên nếu lấy ngày giao thì giao dịch rơi nhầm tháng. Hệ quả: đơn
 *    đặt cuối tháng trước, giao đầu tháng này sẽ được ghi vào sheet THÁNG
 *    TRƯỚC — đúng về mặt sổ sách.
 *
 * 3. KHÓA CHỐNG TRÙNG = mã đơn hàng. Mỗi đơn một mã, ổn định.
 */
function parseShopeeMail_(msg, lines, flat) {
  const take = labels => flatAfter_(flat, labels) || fieldAfter_(lines, labels);

  // Số tiền thật sự bị trừ
  const amount = parseMailAmount_(take(['tổng thanh toán', 'thành tiền']));
  if (!amount) return null;

  const idRaw = take(['mã đơn hàng', 'đơn hàng']);
  const idM = String(idRaw || '').match(/#?([A-Z0-9]{8,})/i);
  const id = idM ? idM[1] : String(msg.getId());

  const dateRaw = take(['ngày đặt hàng', 'ngày đặt']);
  const d = parseMailDateAny_(dateRaw) || msg.getDate();

  const seller = take(['người bán', 'shop']);

  /* Tên sản phẩm: dòng bắt đầu bằng "1. ". Dễ nhớ hơn mã đơn hàng nhiều,
     nhưng tên trên Shopee dài lê thê nên phải cắt bớt. */
  let prod = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^1\.\s+(.{4,})$/);
    if (m) { prod = m[1].trim(); break; }
  }

  const fee = parseMailAmount_(take(['phí vận chuyển']));
  const gross = parseMailAmount_(take(['tổng tiền']));

  const noteSrc = prod || seller || 'Đơn Shopee';
  const note = String(noteSrc).trim().slice(0, CONFIG.MAX_NOTE_LEN);

  return {
    id: String(id),
    amount: amount,
    dateKey: fmtDateKey_(d),
    dateLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM'),
    sheet: buildSheetName_(d),
    payee: String(seller || 'Shopee').trim(),
    note: note,
    isShopee: true,                      // để gán khoản mục SPayLater

    gmailId: String(msg.getId()),
    timeLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm · dd/MM/yyyy'),
    content: prod || '',
    bankName: 'Shopee' + (gross && gross !== amount
      ? ' · giá gốc ' + formatVnd_(gross) : ''),
    account: String(seller || '').trim(),
    fee: fee,
    subject: (function () {
      try { return String(msg.getSubject() || '').trim().slice(0, 120); }
      catch (e) { return ''; }
    })()
  };
}

function parseVcbMail_(msg) {
  try {
    let body = '';
    try { body = msg.getPlainBody() || ''; } catch (e) { body = ''; }
    if (!body.trim()) {
      // Không có bản text thuần → gỡ thẻ HTML thủ công
      body = String(msg.getBody() || '')
        .replace(/<(br|\/tr|\/td|\/p|\/div|\/h\d)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');
    }

    /* Gmail dựng bản text kiểu markdown, mọi nhãn bọc trong dấu sao:
         *Số tiền*
         *Amount* 120,000 VND
       Không gỡ dấu sao thì dòng bắt đầu bằng "*" chứ không phải "Số tiền",
       mọi phép so khớp nhãn đều trượt. */
    const lines = body.split(/\r?\n/)
      .map(s => s.replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(s => s);

    /* Gmail chuyển bảng HTML sang text theo 2 kiểu khác nhau:
         (a) mỗi ô một dòng:   "Số tiền" / "Amount" / "66,800 VND"
         (b) cả hàng một dòng: "Số tiền  Amount  66,800 VND"
       Cách dò trên chuỗi phẳng xử lý được CẢ HAI nên để nó chạy trước.
       Cách theo dòng chỉ là dự phòng.
       (Trước đây làm ngược lại: ở kiểu (b) nó lấy nhầm dòng kế tiếp
        — "Loại phí" — làm số tiền, nên mọi biên lai đều bị bỏ qua.) */
    const flat = lines.join(' | ');
    const take = labels => flatAfter_(flat, labels) || fieldAfter_(lines, labels);

    const AMT = ['số tiền bằng số', 'số tiền giao dịch', 'số tiền'];
    let amount = parseMailAmount_(flatAfter_(flat, AMT));
    if (!amount) amount = parseMailAmount_(fieldAfter_(lines, AMT));
    if (!amount) return null;                 // không có tiền → không phải biên lai

    const id = take(['số lệnh giao dịch', 'số giao dịch', 'mã giao dịch'])
               || String(msg.getId());
    const dateRaw = take(['ngày, giờ giao dịch', 'ngày giao dịch', 'thời gian']);
    const d = parseMailDate_(dateRaw) || parseMailDate_(flat) || msg.getDate();

    const payee = take(['tên người hưởng', 'người hưởng', 'người nhận']);
    const content = take(['nội dung chuyển tiền', 'nội dung giao dịch', 'nội dung']);

    /* Các trường phụ — không dùng để ghi sổ, chỉ để bạn mở ra xem lại cho
       nhớ giao dịch này là gì. Nhãn "ngân hàng" để trần sẽ quét trúng dòng
       chân thư ("Ngân hàng TMCP Ngoại thương Việt Nam") nên phải nêu rõ. */
    const bankName = take(['ngân hàng hưởng', 'ngân hàng thụ hưởng',
                           'ngân hàng nhận']);
    const account  = take(['tài khoản hưởng', 'số tài khoản hưởng',
                           'tài khoản nhận', 'tài khoản trích nợ',
                           'số tài khoản']);
    const feeRaw   = take(['số tiền phí', 'phí giao dịch']);
    const fee      = parseMailAmount_(feeRaw) || 0;
    let subject = '';
    try { subject = String(msg.getSubject() || '').trim(); } catch (e) { subject = ''; }

    /* Nội dung chỉ toàn số (mã giao dịch của máy POS/QR) thì vô nghĩa với
       người đọc — lấy tên đơn vị bán hàng làm ghi chú sẽ dễ hiểu hơn nhiều:
       "1003845261021181712" → "WINCOMMERCE JSC" */
    const failed = mailStatusFailed_(flat, lines);

    const contentIsCode = /^\d{8,}$/.test(String(content).replace(/\s/g, ''));
    const noteSrc = (!content || contentIsCode) ? payee : content;
    const note = String(noteSrc || 'Chuyển khoản').trim().slice(0, CONFIG.MAX_NOTE_LEN);

    return {
      id: String(id),
      amount: amount,
      failed: failed,
      dateKey: fmtDateKey_(d),
      dateLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM'),
      sheet: buildSheetName_(d),
      payee: payee || '',
      note: note,

      /* Thông tin đầy đủ cho màn hình chi tiết. Cố ý KHÔNG kèm toàn văn
         email ở đây: 20 giao dịch × vài KB sẽ làm phình gói cache. Thân thư
         lấy riêng qua getMailDetail() khi bạn chạm vào dòng. */
      gmailId: String(msg.getId()),
      timeLabel: Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm · dd/MM/yyyy'),
      content: String(content || '').trim(),
      bankName: String(bankName || '').trim(),
      account: String(account || '').trim(),
      fee: fee,
      subject: subject.slice(0, 120)
    };
  } catch (err) {
    Logger.log('parseVcbMail_ ERROR: ' + err.stack);
    return null;
  }
}

/**
 * Tìm dòng bắt đầu bằng một nhãn, rồi lấy dòng kế tiếp không phải nhãn.
 * Quét tối đa 4 dòng sau nhãn để phòng trường hợp có dòng rác xen vào.
 */
function fieldAfter_(lines, labels) {
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    if (MAIL_AMOUNT_BLOCK.some(x => low.indexOf(x) === 0)) continue;
    if (!labels.some(x => low.indexOf(x) === 0)) continue;

    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const v = lines[j], vl = v.toLowerCase();
      if (MAIL_EN_SKIP.indexOf(vl) >= 0) continue;        // nhãn tiếng Anh
      if (labels.some(x => vl.indexOf(x) === 0)) continue; // lặp lại nhãn
      return v;
    }
  }
  return '';
}

/**
 * Dò trên chuỗi phẳng: tìm nhãn, bỏ nhãn tiếng Anh và dấu phân cách
 * dính ngay sau, rồi lấy phần còn lại tới dấu ngăn kế tiếp.
 * Dùng khi Gmail gộp cả bảng vào một dòng, lúc đó fieldAfter_ vô dụng.
 */
/**
 * Cắt các ký tự phân cách ở đầu chuỗi giá trị.
 * QUAN TRỌNG: dấu trừ dính sát con số là DẤU ÂM của số tiền ("-66,800 VND"),
 * phải giữ lại; chỉ gạch ngang dùng làm phân cách ("Số tiền - 66,800") mới bỏ.
 */
function mailTrimLead_(s) {
  let t = String(s);
  for (let i = 0; i < 8; i++) {
    const before = t;
    t = t.replace(/^[\s|:.]+/, '');
    t = t.replace(/^[-–—](?!\d)\s*/, '');
    if (t === before) break;
  }
  return t;
}

function flatAfter_(flat, labels) {
  const low = flat.toLowerCase();
  for (let a = 0; a < labels.length; a++) {
    const L = labels[a];

    /* Dò MỌI vị trí của nhãn, không chỉ vị trí đầu tiên. Lý do: thư Cake có
       tiêu đề mục "Thông tin tài khoản" đứng trước hàng "Tài khoản | ...",
       nên lần khớp đầu tiên rơi vào tiêu đề và trả về chính cái nhãn.
       Trước đây gặp vậy là bỏ luôn nhãn; nay thử tiếp vị trí sau. */
    let i = low.indexOf(L);
    let guard = 0;
    while (i >= 0 && guard++ < 6) {
      let seg = mailTrimLead_(flat.substr(i + L.length, 180));

      // Gỡ nhãn tiếng Anh nếu nó đứng ngay sau nhãn tiếng Việt
      const segLow = seg.toLowerCase();
      for (let b = 0; b < MAIL_EN_SKIP.length; b++) {
        const E = MAIL_EN_SKIP[b];
        if (segLow.indexOf(E) !== 0) continue;
        /* Phải chặn khớp cụt: "transaction fee" là tiền tố của
           "transaction fees", cắt theo cái ngắn sẽ còn sót chữ "s" và biến nó
           thành giá trị. Chỉ cắt khi sau nhãn không còn chữ cái. */
        if (/[a-z]/.test(segLow.charAt(E.length))) continue;
        seg = mailTrimLead_(seg.substr(E.length));
        break;
      }

      const v = seg.split('|')[0].trim();
      const vLow = v.toLowerCase();
      // Giá trị trùng với chính một cái nhãn → đó là tiêu đề mục, không phải giá trị
      const isLabel = labels.indexOf(vLow) >= 0 || MAIL_EN_SKIP.indexOf(vLow) >= 0;
      if (v && !isLabel) return v;

      i = low.indexOf(L, i + L.length);
    }
  }
  return '';
}

/** "1,000,000 VND" / "1.000.000,00 VND" → 1000000 */
function parseMailAmount_(s) {
  if (!s) return 0;
  let t = String(s).replace(/vnd|vnđ|đ/gi, '').trim();
  t = t.replace(/[.,]\d{2}$/, '');     // bỏ phần thập phân nếu có
  const n = Number(t.replace(/[^\d]/g, ''));
  return (isNaN(n) || n <= 0) ? 0 : n;
}

/** "15:40 Thứ Tư 21/10/2026" → Date lúc 12:00 trưa */
function parseMailDate_(s) {
  const m = String(s || '').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
}

/**
 * Bỏ dấu tiếng Việt để so khớp. Nội dung chuyển khoản ngân hàng gần như
 * luôn không dấu ("cat toc"), trong khi khoản mục trong sheet có dấu
 * ("CĂT TÓC") — không bỏ dấu thì không bao giờ khớp được.
 */
function deburr_(s) {
  return normKey_(s)
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ÌÍỊỈĨ]/g, 'I')
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
    .replace(/[ỲÝỴỶỸ]/g, 'Y')
    .replace(/Đ/g, 'D');
}

/**
 * Bảng tra để đoán khoản mục, gồm 2 nguồn:
 *   1. Tên khoản mục trong sheet LIST — khớp được ngay cả lần đầu
 *      ("cat toc" → CĂT TÓC)
 *   2. Ghi chú đã ghi ở 2 tháng gần nhất — ưu tiên cao hơn vì sát thói quen
 * Khóa đều đã bỏ dấu.
 */
function noteMap_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('NOTEMAP_V2');
  if (hit) return JSON.parse(hit);

  const map = {};

  // Nguồn 1: danh mục gốc
  try {
    readList_().items.forEach(it => {
      const k = deburr_(it.v);
      if (k.length >= 3) {
        const hu = readList_().hu.filter(h => normKey_(h.v) === it.huKey)[0];
        if (hu) map[k] = { hu: hu.v, item: it.v };
      }
    });
  } catch (e) { Logger.log('noteMap_ catalog: ' + e.message); }

  // Nguồn 2: ghi chú thật, ghi đè lên danh mục nếu trùng khóa
  const ss = getSS_();
  listMonthSheets_(ss).slice(-2).forEach(s => {
    const sh = ss.getSheetByName(s.name);
    if (!sh) return;
    readTransactions_(sh).rows.forEach(r => {
      const k = deburr_(r.note);
      if (k && k.length >= 3) map[k] = { hu: r.hu, item: r.item };
    });
  });

  cache.put('NOTEMAP_V2', JSON.stringify(map), 600);
  return map;
}

/**
 * Đoán khoản mục theo thứ tự ưu tiên:
 *   1. Tên đơn vị bán hàng (WINCOMMERCE → TIỀN TẠP HÓA) — chắc chắn nhất
 *   2. Ghi chú cũ / tên khoản mục, khớp 2 chiều, ưu tiên khóa DÀI nhất để
 *      "CK tien an trua" ra TIỀN ĂN TRƯA chứ không phải TIỀN
 */
function guessFromMap_(map, text) {
  const t = deburr_(text);
  if (!t) return null;

  // 1. Bảng đơn vị bán hàng
  const ms = CONFIG.GMAIL.MERCHANTS || [];
  for (let i = 0; i < ms.length; i++) {
    if (ms[i].k.some(w => t.indexOf(deburr_(w)) >= 0)) {
      const hit = resolveItem_(ms[i].item);
      if (hit) return hit;
    }
  }

  // 2. Ghi chú cũ và tên khoản mục
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (t.indexOf(k) >= 0 || k.indexOf(t) >= 0) return map[k];
  }
  return null;
}

/** Tên khoản mục dạng chữ → cặp {hu, item} đúng chuỗi gốc trong sheet LIST */
function resolveItem_(name) {
  try {
    const list = readList_();
    const key = deburr_(name);
    const it = list.items.filter(x => deburr_(x.v) === key)[0];
    if (!it) return null;
    const hu = list.hu.filter(h => normKey_(h.v) === it.huKey)[0];
    return hu ? { hu: hu.v, item: it.v } : null;
  } catch (e) {
    return null;
  }
}


/* =================== SEATALK (TÙY CHỌN) ======================= */

/** Helper dùng chung cho mọi loại thông báo SeaTalk */
function sendSeaTalkNotification(payload) {
  try {
    if (!CONFIG.ENABLE_SEATALK || !CONFIG.SEATALK_WEBHOOK_URL) return false;
    const res = UrlFetchApp.fetch(CONFIG.SEATALK_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 200) Logger.log('SeaTalk FAIL ' + code + ': ' + res.getContentText());
    return code === 200;
  } catch (err) {
    Logger.log('sendSeaTalkNotification ERROR: ' + err.stack);
    return false;
  }
}

/** Cảnh báo khi tổng chi trong ngày vượt ngưỡng — nhận sẵn total, không quét lại */
function maybeNotifySeaTalk_(tx, dayTotal) {
  try {
    if (!CONFIG.ENABLE_SEATALK) return;
    if (dayTotal < CONFIG.SEATALK_DAILY_THRESHOLD) return;

    sendSeaTalkNotification({
      tag: 'text',
      text: {
        content: '⚠️ Chi tiêu ngày ' + Utilities.formatDate(tx.date, CONFIG.TIMEZONE, 'dd/MM/yyyy')
          + ': ' + formatVnd_(dayTotal) + '\nGiao dịch mới: ' + tx.item.trim()
          + ' — ' + formatVnd_(tx.amount)
      }
    });
  } catch (err) {
    Logger.log('maybeNotifySeaTalk_ ERROR: ' + err.stack);
  }
}

/** Gắn trigger hằng ngày nếu muốn nhận tổng kết */
function notifyDailySummary() {
  try {
    if (!CONFIG.ENABLE_SEATALK) return;
    const today = new Date();
    const sheet = getSS_().getSheetByName(buildSheetName_(today));
    if (!sheet) return;

    const key = fmtDateKey_(today);
    const byItem = {};
    let total = 0;
    readTransactions_(sheet).rows.forEach(r => {
      if (r.dateKey !== key) return;
      total += r.amount;
      byItem[r.item.trim()] = (byItem[r.item.trim()] || 0) + r.amount;
    });
    if (!total) return;

    const lines = Object.keys(byItem)
      .sort((a, b) => byItem[b] - byItem[a])
      .slice(0, 8)
      .map(k => '• ' + k + ': ' + formatVnd_(byItem[k]));

    sendSeaTalkNotification({
      tag: 'text',
      text: {
        content: '📊 Tổng kết ' + Utilities.formatDate(today, CONFIG.TIMEZONE, 'dd/MM/yyyy')
          + '\nTổng chi: ' + formatVnd_(total) + '\n' + lines.join('\n')
      }
    });
  } catch (err) {
    Logger.log('notifyDailySummary ERROR: ' + err.stack);
  }
}
