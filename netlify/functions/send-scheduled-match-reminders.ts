import { dispatchMatchReminder } from './_lib/matchReminder';
import { getAdminDb } from './_lib/firebaseAdmin';

export default async () => {
  try {
    const db = getAdminDb();
    const snap = await db.collection('matches').where('status', '==', 'scheduled').get();

    let sentCount = 0;
    let skippedCount = 0;

    for (const doc of snap.docs) {
      const result = await dispatchMatchReminder({
        matchId: doc.id,
        source: 'scheduled',
      });

      sentCount += result.sentCount;
      skippedCount += result.skippedCount + (result.sentCount === 0 ? 1 : 0);
    }

    return new Response(
      JSON.stringify({
        matchesChecked: snap.size,
        sentCount,
        skippedCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process scheduled reminders',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const config = {
  schedule: '*/15 * * * *',
};
