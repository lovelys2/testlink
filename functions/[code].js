export async function onRequestGet({ params, env, next, waitUntil }) {
  const code = params.code;

  // Bỏ qua các file tĩnh (.html, .css, .js, .ico...)
  if (!code || code.includes(".")) {
    return next();
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return new Response("Hệ thống chưa được cấu hình cơ sở dữ liệu.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  // Tra cứu URL gốc từ Supabase
  const sbRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}&select=original_url,clicks`,
    {
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`
      }
    }
  );

  if (!sbRes.ok) {
    return new Response("Lỗi truy vấn dữ liệu.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const rows = await sbRes.json();
  if (!rows || rows.length === 0) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 - Không tìm thấy liên kết</title></head>
      <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center;padding:20px">
        <div>
          <h1 style="font-size:3rem;margin:0 0 8px;color:#3b82f6">404</h1>
          <p style="font-size:1.1rem;margin:0 0 20px">Liên kết rút gọn không tồn tại hoặc đã bị xóa.</p>
          <a href="/" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Quay về trang chủ</a>
        </div>
      </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  const record = rows[0];

  // Cập nhật số lượt click chạy ngầm để chuyển hướng diễn ra tức thì
  waitUntil(
    fetch(`${env.SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ clicks: (record.clicks || 0) + 1 })
    })
  );

  return Response.redirect(record.original_url, 302);
}