export async function onRequestPost({ request, env }) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
      return Response.json({ stats: {} });
    }

    const { codes } = await request.json();
    if (!Array.isArray(codes) || codes.length === 0) {
      return Response.json({ stats: {} });
    }

    // Chỉ lấy tối đa 50 mã hợp lệ
    const safeCodes = codes
      .filter((c) => typeof c === "string" && /^[a-zA-Z0-9_-]{2,30}$/.test(c))
      .slice(0, 50);

    if (safeCodes.length === 0) {
      return Response.json({ stats: {} });
    }

    const queryList = safeCodes.map((c) => `"${c}"`).join(",");
    const sbRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/links?code=in.(${encodeURIComponent(queryList)})&select=code,clicks`,
      {
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );

    if (!sbRes.ok) {
      return Response.json({ stats: {} });
    }

    const rows = await sbRes.json();
    const stats = {};
    for (const row of rows) {
      stats[row.code] = row.clicks || 0;
    }

    return Response.json({ stats });
  } catch {
    return Response.json({ stats: {} });
  }
}