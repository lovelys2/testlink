export async function onRequestPost({ request, env }) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
      return Response.json(
        { error: "Chưa cấu hình biến môi trường." },
        { status: 500 }
      );
    }

    const { url, customCode } = await request.json();

    // 1. Chuẩn hóa và kiểm tra URL
    let targetUrl = (url || "").trim();
    if (!targetUrl) {
      return Response.json({ error: "Vui lòng nhập đường dẫn gốc." }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    try {
      const parsed = new URL(targetUrl);
      if (!parsed.hostname.includes(".")) {
        throw new Error("Invalid domain");
      }
    } catch {
      return Response.json({ error: "Định dạng URL không hợp lệ (ví dụ: https://devpan.vercel.app)." }, { status: 400 });
    }

    // 2. Xử lý bí danh (tùy chỉnh hoặc ngẫu nhiên)
    let code = (customCode || "").trim();
    if (code) {
      if (!/^[a-zA-Z0-9_-]{2,30}$/.test(code)) {
        return Response.json(
          { error: "Bí danh dài 2-30 ký tự, chỉ gồm chữ cái, số, dấu gạch ngang (-) hoặc gạch dưới (_)." },
          { status: 400 }
        );
      }
      const reserved = ["api", "index", "admin", "login", "assets", "static"];
      if (reserved.includes(code.toLowerCase())) {
        return Response.json({ error: "Bạn không thể chọn tên này, vui lòng chọn tên khác." }, { status: 400 });
      }
    } else {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    // 3. Lưu vào Supabase
    const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/links`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ code, original_url: targetUrl })
    });

    if (!sbRes.ok) {
      const errData = await sbRes.json().catch(() => ({}));
      if (errData.code === "23505") {
        return Response.json({ error: "Bạn không thể chọn tên này, vui lòng chọn tên khác." }, { status: 409 });
      }
      return Response.json({ error: errData.message || "Lỗi kết nối cơ sở dữ liệu." }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    return Response.json({
      success: true,
      code,
      shortUrl: `${origin}/${code}`,
      originalUrl: targetUrl,
      clicks: 0,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    return Response.json({ error: "Lỗi máy chủ: " + err.message }, { status: 500 });
  }
}