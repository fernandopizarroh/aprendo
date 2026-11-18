import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { currentReviewAttempt, loadStudentRoute, thresholdsOf } from "@/lib/student-access";
import { cardKeys, parseViewed } from "@/lib/review";
import { lockMessage } from "@/lib/student-quiz";

// Centro de la ruta: etapas, desbloqueos y avance
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const loaded = await loadStudentRoute(params.id, session.sub);
  if (!loaded) return NextResponse.json({ error: "Ruta no disponible" }, { status: 404 });
  const { route, content, summary } = loaded;

  const keys = cardKeys(content.review as { flashcards?: unknown[] }[]);
  const reviewAttempt = currentReviewAttempt(route.attempts, summary);
  const viewed = parseViewed(reviewAttempt?.answersDetailJson).filter((k) => keys.includes(k)).length;

  return NextResponse.json({
    id: route.id,
    title: route.title,
    subject: route.subject,
    threshold: route.configUnlockThreshold,
    challengeThreshold: route.configChallengeThreshold,
    round: summary.round,
    needsRepeat: summary.needsRepeat,
    unlocked: summary.unlocked,
    progressPercent: summary.progressPercent,
    review: { viewed, total: keys.length, completed: summary.reviewCompleted },
    diagnostic: {
      questions: route.configDiagQuestionsCount,
      attempts: summary.diagnosticAttempts,
      best: summary.bestDiagnosticOverall,
      bestThisRound: summary.bestDiagnostic,
      passed: summary.diagnosticPassed,
    },
    challenge: {
      questions: route.configChallengeQuestionsCount,
      attempts: summary.challengeAttempts,
      best: summary.bestChallenge,
      last: summary.lastChallenge,
      done: summary.challengeDone,
      attemptsLeft: summary.challengeAttemptsLeft,
      maxAttempts: 2,
      lockMessage: summary.unlocked.includes("challenge") || summary.challengeDone ? null : lockMessage("challenge", summary, thresholdsOf(route)),
    },
  });
}
