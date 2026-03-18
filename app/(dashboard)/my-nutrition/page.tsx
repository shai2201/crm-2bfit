import { Header } from "@/components/dashboard/Header";
import { NutritionChat } from "@/components/nutrition/NutritionChat";
import { prisma } from "@/lib/prisma";

// In production replace with: const session = await auth();
const DEMO_USER_ID = process.env.DEMO_TRAINEE_ID ?? "";

async function getLastPlan(userId: string) {
  const plan = await prisma.nutritionPlan.findFirst({
    where:   { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id:       true,
      messages: true,
      response: true,
    },
  });
  return plan;
}

export default async function MyNutritionPage() {
  const plan = await getLastPlan(DEMO_USER_ID);

  return (
    <>
      <Header
        title="תזונה מותאמת אישית"
        subtitle="יועץ תזונה מבוסס AI · BMR / TDEE"
      />
      <div className="p-4 sm:p-6">
        <div className="card overflow-hidden">
          <NutritionChat
            userId={DEMO_USER_ID}
            initialPlan={
              plan
                ? {
                    id:       plan.id,
                    messages: plan.messages as { role: "user" | "assistant"; content: string }[] | null,
                    response: plan.response as { content: string },
                  }
                : null
            }
          />
        </div>
      </div>
    </>
  );
}
