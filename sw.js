/* ============================================================
   SERVICE WORKER — VÍ CHI TIÊU
   ============================================================
   Việc duy nhất của file này: giữ sẵn khung app (HTML, icon) trong máy, để
   lần mở thứ hai trở đi KHÔNG phải tải lại qua mạng. Đây chính là thứ kéo
   chặng "chạm icon → màn hình PIN" xuống dưới nửa giây.

   Nguyên tắc chọn chiến lược cho từng loại:

   · KHUNG APP (index.html, icon) → stale-while-revalidate.
     Trả ngay bản trong máy cho nhanh, đồng thời tải bản mới ở nền cho lần
     sau. Không dùng cache-first thuần: bản mới sẽ không bao giờ tới.
     Không dùng network-first: mất đúng cái lợi tốc độ muốn có.

   · LỜI GỌI MÁY CHỦ (script.google.com) → KHÔNG đụng vào, để đi thẳng.
     Số dư chi tiêu mà trả từ cache thì còn tệ hơn là chờ. Apps Script cũng
     tự có cache phía nó rồi.

   ĐỔI CACHE_VERSION mỗi lần sửa index.html, nếu không máy vẫn chạy bản cũ.
   ============================================================ */

const CACHE_VERSION = 'vi-chi-tieu-v2';

/* Chỉ khung app. KHÔNG đưa sw.js hay manifest vào đây — trình duyệt tự quản
   lý chúng theo cách riêng, cache thêm chỉ gây lệch phiên bản. */
const SHELL = [
  './',
  './index.html',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      /* addAll thất bại TOÀN BỘ nếu một file lỗi, nên thêm từng file và bỏ
         qua file hỏng — thiếu một cái icon không đáng làm hỏng cả bản cài. */
      .then(cache => Promise.all(
        SHELL.map(u => cache.add(u).catch(() => null))
      ))
      .then(() => self.skipWaiting())   // bản mới nhận việc ngay
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                  // POST ghi dữ liệu: bỏ qua

  const url = new URL(req.url);

  // Lời gọi máy chủ đi thẳng, không bao giờ lấy từ cache
  if (url.hostname.indexOf('script.google') >= 0) return;

  // Chỉ lo phần tài nguyên của chính site này
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        /* Chỉ cache phản hồi thành công. Cache nhầm trang lỗi 404 thì app
           hỏng vĩnh viễn cho tới khi đổi CACHE_VERSION. */
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);     // mất mạng → dùng bản trong máy

      return hit || fresh;     // có sẵn thì trả ngay, bản mới để lần sau
    })
  );
});
