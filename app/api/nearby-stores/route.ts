import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 2地点間の距離（km）を計算する関数
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function POST(req: Request) {
  try {
    const { lat, lng } = await req.json();

    console.log("【APIログ】受け取った座標:", lat, lng);

    if (!lat || !lng) {
      return NextResponse.json({ error: "緯度・経度が不足しています" }, { status: 400 });
    }

    // 利用可能な環境変数を順にチェック
    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("【エラー】Google Maps / Places API キーが .env.local に設定されていません。");
      return NextResponse.json({ error: "APIキーが設定されていません", stores: [] }, { status: 500 });
    }

    // 検索半径を 5000m (5km) に拡大し、keyword も指定してヒットしやすくする
    const radius = 5000;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=supermarket&keyword=${encodeURIComponent("スーパー")}&language=ja&key=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    // ログ出力してGoogle Places APIの生の応答を確認
    console.log("【Google Places API ステータス】:", data.status);
    if (data.error_message) {
      console.error("【Google Places API エラー詳細】:", data.error_message);
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: `Google APIエラー: ${data.status}`, stores: [] }, { status: 500 });
    }

    const rawStores = data.results || [];
    console.log(`【取得件数】: ${rawStores.length} 件`);

    // ★ 件数を最大5件までに絞り込み (.slice(0, 5))
    const stores = rawStores.slice(0, 5).map((place: any) => {
      const storeName = place.name || "スーパー";
      const address = place.vicinity || "";
      const storeLat = place.geometry?.location?.lat;
      const storeLng = place.geometry?.location?.lng;

      const dist = storeLat && storeLng ? calculateDistance(lat, lng, storeLat, storeLng) : null;
      const distanceStr = dist !== null ? `${dist}km` : undefined;

      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}&query_place_id=${place.place_id}`;
      const flyerSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(storeName + " チラシ 特売")}`;

      return {
        name: storeName,
        address: address,
        distance: distanceStr,
        mapUrl: mapUrl,
        flyerSearchUrl: flyerSearchUrl,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        openNow: place.opening_hours?.open_now ?? null,
      };
    });

    return NextResponse.json({ stores });
  } catch (error: any) {
    console.error("周辺店舗取得処理エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました", stores: [] }, { status: 500 });
  }
}