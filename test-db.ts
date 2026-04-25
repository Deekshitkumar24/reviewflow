import { db } from './src/db';
import { events, teams, users, roles, labs, reviews, issues, results } from './src/db/schema';
import { eq, and, isNull, count, isNotNull } from 'drizzle-orm';
async function test() {
  try {
    console.log('Testing...');
    const res = await Promise.all([
        db.select({ value: count() }).from(events).where(isNull(events.deletedAt)),
        db.select({ value: count() }).from(events).where(and(eq(events.status, 'active'), isNull(events.deletedAt))),
        db.select({ value: count() }).from(teams).where(isNull(teams.deletedAt)),
        db.select({ value: count() }).from(teams).where(and(eq(teams.attendanceStatus, 'checked_in'), isNull(teams.deletedAt))),
        db.select({ value: count() }).from(labs),
        db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
        db.select({ value: count() }).from(reviews).where(eq(reviews.isDraft, false)),
        db.select({ count: count(), status: issues.status }).from(issues).groupBy(issues.status),
        db.select({ teamName: teams.teamName, finalPosition: results.finalPosition })
          .from(results)
          .innerJoin(teams, eq(results.teamId, teams.id))
          .where(isNotNull(results.finalPosition))
          .orderBy(results.finalPosition)
          .limit(5),
        db.select({ mentorName: users.fullName, reviewCount: count() })
          .from(reviews)
          .innerJoin(users, eq(reviews.mentorId, users.id))
          .where(eq(reviews.isDraft, false))
          .groupBy(users.fullName)
    ]);
    console.log('SUCCESS API QUERIES WORK');
    process.exit(0);
  } catch (e) {
    console.error('API DB ERROR', e);
    process.exit(1);
  }
}
test();
