import "dotenv/config";
import { db } from "./index";
import { roles, users } from "./schema/auth";
import { events, rounds, labs } from "./schema/events";
import { teams } from "./schema/teams";
import { labAssignments, mentorAssignments } from "./schema/assignments";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding ReviewFlow database with Drizzle ORM...");
  
  // Hash password
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  console.log("Creating roles...");
  const roleData = [
    { name: "super_admin", displayName: "Super Administrator" },
    { name: "admin", displayName: "Event Administrator" },
    { name: "mentor", displayName: "Mentor / Judge" },
    { name: "coordinator", displayName: "Event Coordinator" },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roleData) {
    const inserted = await db.insert(roles)
      .values(r)
      .onConflictDoUpdate({ target: roles.name, set: r })
      .returning({ id: roles.id, name: roles.name });
    roleMap[inserted[0].name] = inserted[0].id;
  }

  console.log("Creating users...");
  const usersData = [
    { email: "superadmin@reviewflow.app", fullName: "Deekshit Kumar", roleId: roleMap["super_admin"] },
    { email: "admin@reviewflow.app", fullName: "Dr. Ramesh Kumar", roleId: roleMap["admin"] },
    { email: "mentor1@reviewflow.app", fullName: "Dr. Priya Sharma", roleId: roleMap["mentor"] },
    { email: "mentor2@reviewflow.app", fullName: "Prof. Venkat Rao", roleId: roleMap["mentor"] },
    { email: "coordinator@reviewflow.app", fullName: "Arjun Reddy", roleId: roleMap["coordinator"] },
  ];

  const userMap: Record<string, string> = {};
  for (const u of usersData) {
    const inserted = await db.insert(users)
      .values({ ...u, passwordHash, status: "active", mustChangePassword: false })
      .onConflictDoUpdate({ target: users.email, set: { fullName: u.fullName } })
      .returning({ id: users.id, email: users.email });
    userMap[inserted[0].email] = inserted[0].id;
  }

  console.log("Creating default event...");
  const newlyCreatedEvents = await db.insert(events)
    .values({
      eventName: "Internal Hackathon 2026",
      organizerName: "Tech Hub",
      eventDate: "2026-05-15",
      venue: "Main Auditorium",
      eventType: "hackathon",
      status: "active",
      totalRounds: 2,
      createdById: userMap["admin@reviewflow.app"],
    })
    .returning();
  
  const eventId = newlyCreatedEvents[0].id;

  console.log("Creating rounds...");
  const r1 = await db.insert(rounds).values({ eventId, roundName: "Idea Evaluation", roundOrder: 1, status: "active" }).returning();
  const r2 = await db.insert(rounds).values({ eventId, roundName: "Prototype Evaluation", roundOrder: 2 }).returning();

  console.log("Creating labs...");
  const l1 = await db.insert(labs).values({ eventId, labName: "Lab A", capacity: 10, status: "active" }).returning();
  const l2 = await db.insert(labs).values({ eventId, labName: "Lab B", capacity: 10, status: "active" }).returning();

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
