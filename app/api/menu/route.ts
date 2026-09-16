import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateContentWithRetry(model: string, contents: any, maxRetries = 3) {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai!.models.generateContent({ model, contents });
    } catch (error: any) {
      if (error?.status === 503 || error?.message?.includes("503")) {
        if (i === maxRetries - 1) throw error;
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed after retries");
}

export async function POST(req: Request) {
  try {
    if (!ai) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const { selectedItems, fridgeItems, mood, shoppingDate, servings, allergies, customNg } = await req.json();

    const allergyList = Array.isArray(allergies) ? allergies.join(", ") : "";
    const ngIngredients = [allergyList, customNg].filter(Boolean).join(", ");

    const prompt = `
以下の特売品と条件を活用し、${servings || 2}人分の献立アイデアを8パターン前後提案してください。

【選択された特売品】
${selectedItems.join(", ")}

【冷蔵庫にあるもの（※この食材は全必要材料リストに含めないでください）】
${fridgeItems || "特になし"}

【希望・気分】
${mood || "特になし"}

【買い物に行く予定日】
${shoppingDate || "特になし（指定なし）"}

【★最優先除外ルール: 絶対に使用不可のアレルギー・NG食材】
${ngIngredients || "なし"}
※注意事項: 上記の【絶対に使用不可のアレルギー・NG食材】に含まれる食材、またはそれを原材料とする調味料・加工品は、提案するどのレシピの材料(allIngredients)や手順にも絶対に含めないでください。

※レシピ記述ルール:
1. 初心者や忙しい人でも迷わない「非常に丁寧で親切なレシピ」にしてください。
2. 食材の切り方は具体的に記述してください。（例：「キャベツは1cm幅の細切り」「玉ねぎは薄切り」「にんじんは一口大の乱切り」など）。
3. 各料理に "batchInstruction" を必ず含め、まとめて調理する際の下ごしらえ（Prep）と加熱仕上げ（Cook）の具体的な内容を分けて記述してください。
4. "tips" には、美味しく仕上げるコツや時短のワンポイントアドバイスを入れてください。

以下のJSONフォーマットのみを出力してください。Markdownの枠組み(\`\`\`json)も含めて構いません。

{
  "menu": [
    {
      "recipeTitle": "料理のタイトル",
      "description": "概要や魅力の短い説明",
      "cookingTime": "15分",
      "difficulty": "簡単",
      "tips": "豚肉に片栗粉を軽くまぶしてから炒めると、味がしっかり絡んでジューシーになります！",
      "targetItemsUsed": ["活用した特売品名"],
      "allIngredients": [
        { "name": "豚薄切り肉", "amount": "200g" },
        { "name": "キャベツ", "amount": "1/4個" }
      ],
      "steps": [
        "キャベツは1cm幅のざく切りにし、豚肉は一口大（約3cm幅）に切ります。",
        "フライパンに油大さじ1を熱し、豚肉を中火で色が変わるまで炒めます。",
        "キャベツを加えてしんなりするまで炒め、合わせ調味料を回し入れてサッと炒め合わせます。"
      ],
      "batchInstruction": {
        "prepStep": "キャベツを1cm幅のざく切り、豚肉を3cm幅に切り、合わせ調味料（醤油大さじ1、みりん大さじ1）を小鉢に混ぜておきます。",
        "cookStep": "フライパンで豚肉とキャベツを中火で炒め、準備しておいた調味料を一気に炒め合わせます。"
      }
    }
  ]
}
`;

    const response = await generateContentWithRetry("gemini-3.6-flash", prompt);
    const text = response.text;

    if (!text) {
      return NextResponse.json({ error: "献立の生成に失敗しました" }, { status: 500 });
    }

    let jsonString = text.trim();
    if (jsonString.includes("```")) {
      jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const parsedData = JSON.parse(jsonString);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("献立作成エラー:", error);
    return NextResponse.json(
      { error: error?.message || "献立の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}