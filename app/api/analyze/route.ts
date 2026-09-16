import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 混雑（503エラー等）の際に自動リトライするヘルパー関数
async function generateContentWithRetry(params: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if ((error?.status === 503 || error?.code === 503) && i < retries - 1) {
        console.warn(`Gemini API 混雑のためリトライ中 (${i + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
  throw new Error("リトライ上限を超過しました");
}

export async function POST(req: Request) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "画像データがありません" }, { status: 400 });
    }

    // 複数枚のBase64画像データを inlineData の配列に変換
    const imageParts = images.map((imgBase64: string) => {
      const matches = imgBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const base64Data = matches ? matches[2] : imgBase64.replace(/^data:image\/\w+;base64,/, "");

      return {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };
    });

    const prompt = `
    添付されたチラシ・スクショ画像（複数枚含む）から、掲載されている特売品・限定品・割引対象商品を可能な限りすべて網網して抽出してください。
    
    【抽出ルール】
    1. 各画像のヘッダーやロゴから「店舗名」を認識し、storeName に正確に記録してください。店舗名が認識できない場合は「店舗不明」としてください。
    2. 日付や曜日、時間帯の表記（例: 「9/11(金)限り」「9/12(土)朝市」「9/12・13 2日間」「夕市」など）がある場合は、必ず saleDate に正確に記録してください。
    3. 見落としがないよう、野菜・精肉・鮮魚・加工食品・調味料・日用品など全エリアの商品を細かく抽出してください。
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3.6-flash", // 最新の推奨モデル名
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...imageParts, // 複数枚の画像をまとめて一括送信
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              storeName: { type: Type.STRING, description: "店舗名（例: ○○スーパー 渋谷店, 店舗不明など）" },
              saleDate: { type: Type.STRING, description: "対象日付・条件（例: 9/11(金)限り, 9/12(土)朝市, 全日など）" },
              name: { type: Type.STRING, description: "商品名" },
              price: { type: Type.STRING, description: "価格・割引（例: 98円, 3割引, 298円(税込321円)）" },
              category: { type: Type.STRING, description: "カテゴリ（野菜, 精肉, 鮮魚, 惣菜, 加工食品, 調味料, その他）" },
            },
            required: ["storeName", "saleDate", "name", "price", "category"],
          },
        },
      },
    });

    const textResponse = response.text || "[]";
    const result = JSON.parse(textResponse);

    return NextResponse.json({ items: result });
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    return NextResponse.json(
      { error: error?.message || "解析処理に失敗しました" },
      { status: 500 }
    );
  }
}