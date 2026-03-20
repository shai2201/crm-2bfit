export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const bodySchema = z.object({
  userId:   z.string(),
  messages: z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  save: z.boolean().optional().default(false), // save plan after AI responds
});

// ──────────────────────────────────────────────────────────────────────────────
// BMR / TDEE helpers
// ──────────────────────────────────────────────────────────────────────────────

function calcBMR(weightKg: number, heightCm: number, ageYears: number, gender: string): number {
  // Mifflin-St Jeor equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return gender?.toLowerCase() === "female" ? base - 161 : base + 5;
}

function calcTDEE(bmr: number, activityLevel = "moderate"): number {
  const multipliers: Record<string, number> = {
    sedentary:    1.2,
    light:        1.375,
    moderate:     1.55,
    active:       1.725,
    very_active:  1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] ?? 1.55));
}

function buildSystemPrompt(profile: {
  firstName:  string;
  birthDate:  Date | null;
  gender:     string | null;
  weightKg?:  number | null;
  heightCm?:  number | null;
  goal?:      string | null;
}): string {
  const age = profile.birthDate
    ? Math.floor((Date.now() - profile.birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const weight = profile.weightKg ?? 75;
  const height = profile.heightCm ?? 170;
  const gender = profile.gender ?? "male";
  const ageVal = age ?? 30;

  const bmr  = Math.round(calcBMR(weight, height, ageVal, gender));
  const tdee = calcTDEE(bmr);

  const goalMap: Record<string, string> = {
    lose_weight:    `הורדת משקל (גרעון קלורי מומלץ: ${tdee - 400} קלוריות/יום)`,
    gain_muscle:    `בניית שריר (עודף קלורי מומלץ: ${tdee + 300} קלוריות/יום)`,
    maintain:       `שמירה על המשקל (${tdee} קלוריות/יום)`,
    improve_fitness:`שיפור כושר כללי (${tdee} קלוריות/יום)`,
  };

  const goalLabel = goalMap[profile.goal ?? ""] ?? `שמירה על המשקל (${tdee} קלוריות/יום)`;

  return `
אתה תזונאי ספורט מוסמך של אולפן הכושר 2Bfit. אתה מומחה לתזונה ספורטיבית ועובד רק בעברית.

פרטי המתאמן/ת:
- שם: ${profile.firstName}
- גיל: ${ageVal}
- משקל: ${weight} ק"ג
- גובה: ${height} ס"מ
- מגדר: ${gender === "female" ? "נקבה" : "זכר"}
- מטרה: ${goalLabel}

חישובים:
- BMR (קצב מטבולי בזאלי / נוסחת Mifflin-St Jeor): ${bmr} קלוריות/יום
- TDEE (הוצאה אנרגטית יומית כוללת, פעילות בינונית): ${tdee} קלוריות/יום

תפקידך:
1. בנה תפריט שבועי מותאם אישית לפי מטרת המתאמן
2. פרט כל ארוחה: ארוחת בוקר, צהריים, ערב ו-2 חטיפים
3. ציין כמויות (גרמים/כוסות), קלוריות משוערות ומאקרו (חלבון/פחמימות/שומן)
4. הצע מאכלים ישראליים/ים-תיכוניים שנגישים בישראל
5. ציין פעמים מתי לאכול יחסית לאימון

פורמט תשובה: השתמש ב-Markdown. ראשית עם סיכום קצר + הקצאת מקרו יומית, אחר כך תפריט יומי לדוגמה.
תמיד סיים בשאלה: "האם תרצה שאתאים משהו? (לדוגמה: צמחוני, ללא גלוטן, תקציב מוגבל)"
`.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/nutrition/chat
// Body: { userId, messages: [{role, content}], save? }
// Returns: SSE stream
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const openai = getOpenAI();
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
    }

    const { userId, messages, save } = parsed.data;

    // Fetch user profile for system prompt
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { profile: true },
    });

    if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

    const profile = user.profile;
    if (!profile) {
      return NextResponse.json({ error: "נא למלא פרטי פרופיל תחילה" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt({
      firstName: profile.firstName,
      birthDate: profile.birthDate ?? null,
      gender:    profile.gender   ?? null,
      goal:      null, // could extend Profile with goal field
    });

    // Build SSE stream
    const encoder = new TextEncoder();
    const stream  = new ReadableStream({
      async start(controller) {
        let fullContent = "";

        const openaiStream = await openai.chat.completions.create({
          model:       "gpt-4o-mini",
          stream:      true,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        });

        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          fullContent += delta;
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
        }

        // Save to DB if requested
        if (save && fullContent) {
          await prisma.nutritionPlan.create({
            data: {
              userId,
              prompt:   messages.at(-1)?.content ?? "תפריט מותאם אישית",
              response: { content: fullContent },
              title:    "תפריט אישי",
              isActive: true,
              messages: [
                ...messages,
                { role: "assistant", content: fullContent },
              ],
            },
          });
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });
  } catch (err) {
    console.error("[POST /api/nutrition/chat]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
