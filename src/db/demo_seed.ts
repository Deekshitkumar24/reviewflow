import "dotenv/config";
import { db } from "./index";
import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
// Import everything directly to avoid naming issues
import {
  roles, users, auditLogs, notifications, refreshTokens, passwordResets,
  events, rounds, labs, eventSettings,
  teams, teamMembers, importBatches,
  labAssignments, mentorAssignments, coordinatorAssignments,
  reviews, suggestions, suggestionStatusLogs,
  results,
  studentTeamAuth,
  issues,
  attendanceSlots, labAttendanceSubmissions, memberAttendance
} from "./schema";

async function clearDB() {
  console.log("🧹 Wiping database for deterministic demo...");
  // Order matters for foreign keys
  await db.delete(auditLogs);
  await db.delete(notifications);
  await db.delete(issues);
  await db.delete(suggestionStatusLogs);
  await db.delete(suggestions);
  await db.delete(reviews);
  await db.delete(results);
  await db.delete(memberAttendance);
  await db.delete(labAttendanceSubmissions);
  await db.delete(attendanceSlots);
  await db.delete(labAssignments);
  await db.delete(mentorAssignments);
  await db.delete(coordinatorAssignments);
  await db.delete(teamMembers);
  await db.delete(studentTeamAuth);
  await db.delete(teams);
  await db.delete(importBatches);
  await db.delete(labs);
  await db.delete(rounds);
  await db.delete(eventSettings);
  await db.delete(events);
  await db.delete(refreshTokens);
  await db.delete(passwordResets);
  await db.delete(users);
  await db.delete(roles);
  console.log("🧹 Clean complete.");
}

async function seedDemo() {
  await clearDB();
  console.log("🌱 Seeding Demo Database...");

  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const studentPasswordHash = await bcrypt.hash("Student@123", 12);

  // 1. ROLES
  const roleData = [
    { name: "super_admin", displayName: "Super Administrator" },
    { name: "admin", displayName: "Event Administrator" },
    { name: "mentor", displayName: "Mentor / Judge" },
    { name: "coordinator", displayName: "Event Coordinator" },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roleData) {
    const inserted = await db.insert(roles).values(r).returning({ id: roles.id, name: roles.name });
    roleMap[inserted[0].name] = inserted[0].id;
  }

  // 2. USERS
  const usersData = [
    { email: "superadmin@reviewflow.app", fullName: "Deekshit Kumar", roleId: roleMap["super_admin"] },
    { email: "admin@reviewflow.app", fullName: "Dr. Ramesh Kumar (Admin)", roleId: roleMap["admin"] },
    
    // Coordinators
    { email: "coord1@reviewflow.app", fullName: "Arjun Reddy (Coordinator)", roleId: roleMap["coordinator"] },
    { email: "coord2@reviewflow.app", fullName: "Sara Smith (Coordinator)", roleId: roleMap["coordinator"] },

    // Judges
    { email: "judge1@reviewflow.app", fullName: "Dr. Priya Sharma (Lead Judge)", roleId: roleMap["mentor"] },
    { email: "judge2@reviewflow.app", fullName: "Prof. Venkat Rao (Judge)", roleId: roleMap["mentor"] },
    { email: "judge3@reviewflow.app", fullName: "Amit Patel (Judge)", roleId: roleMap["mentor"] },
    { email: "judge4@reviewflow.app", fullName: "Lisa Morgan (Judge)", roleId: roleMap["mentor"] },
    { email: "judge5@reviewflow.app", fullName: "biased.judge@reviewflow.app (Strict/Biased Judge)", roleId: roleMap["mentor"] },
    { email: "judge6@reviewflow.app", fullName: "inactive.judge@reviewflow.app (Inactive Judge)", roleId: roleMap["mentor"] },
  ];

  const userMap: Record<string, string> = {};
  for (const u of usersData) {
    const inserted = await db.insert(users)
      .values({ ...u, passwordHash, status: "active", mustChangePassword: false })
      .returning({ id: users.id, email: users.email });
    userMap[inserted[0].email] = inserted[0].id;
  }

  // 3. EVENT
  const newlyCreatedEvents = await db.insert(events)
    .values({
      eventName: "Global Tech Innovators Summit 2026",
      organizerName: "Tech Hub",
      eventDate: "2026-06-15",
      venue: "Main Auditorium",
      eventType: "hackathon",
      status: "active",
      totalRounds: 2,
      createdById: userMap["admin@reviewflow.app"],
    })
    .returning();
  
  const eventId = newlyCreatedEvents[0].id;

  // ROUNDS
  const r1 = await db.insert(rounds).values({ eventId, roundName: "Idea Validation (Round 1)", roundOrder: 1, status: "active" }).returning();
  const r2 = await db.insert(rounds).values({ eventId, roundName: "Prototype Evaluation (Round 2)", roundOrder: 2 }).returning();
  const activeRoundId = r1[0].id;

  // 4. LABS (Total capacity 15)
  // Lab D is near capacity (capacity 2, we will assign 2)
  const l1 = await db.insert(labs).values({ eventId, labName: "Innovation Lab A", capacity: 5, status: "active", notes: "Focus: AI/ML" }).returning();
  const l2 = await db.insert(labs).values({ eventId, labName: "Innovation Lab B", capacity: 5, status: "active", notes: "Focus: FinTech" }).returning();
  const l3 = await db.insert(labs).values({ eventId, labName: "Innovation Lab C", capacity: 3, status: "active", notes: "Focus: Web3" }).returning();
  const l4 = await db.insert(labs).values({ eventId, labName: "Innovation Lab D", capacity: 2, status: "active", notes: "Focus: GenAI" }).returning();
  
  const allLabs = [l1[0], l2[0], l3[0], l4[0]];

  // 5. TEAMS (15 total)
  const teamDef = [
    { teamName: "Neural Ninjas", title: "AI-powered Diagnostics", desc: "A robust AI system for early disease detection.", domain: "AI/ML", dept: "CS" }, // Clear leader
    { teamName: "Block Builders", title: "Decentralized Voting", desc: "Secure voting system built on Ethereum.", domain: "Web3", dept: "IT" },
    { teamName: "FinWizards", title: "Micro-lending SaaS", desc: "Peer to peer micro-lending for rural areas.", domain: "FinTech", dept: "Finance" },
    { teamName: "Data Miners", title: "Predictive Maintainance", desc: "Using sensor data to predict machine failures.", domain: "AI/ML", dept: "Mech" },
    // Plagiarism pair Team A
    { teamName: "EduConnect", title: "Student Learning Portal", desc: "An online portal mapping student learning vectors.", domain: "EduTech", dept: "CS" },
    // Plagiarism pair Team B
    { teamName: "LearnVector", title: "Vectorized Student Portal", desc: "An online portal mapping student learning vectors.", domain: "EduTech", dept: "CS" },
    
    { teamName: "Chain Linkers", title: "Supply Chain Blockchain", desc: "Transparent tracking of retail products.", domain: "Web3", dept: "IT" },
    { teamName: "Quantum Quarks", title: "Quantum Key Distribution", desc: "Simulating QKD over classical networks.", domain: "CyberSec", dept: "Physics" },
    { teamName: "MedScan", title: "MRI Enhancement", desc: "", domain: "MedTech", dept: "BioMed" }, // Missing desc
    { teamName: "AutoPilot", title: "Autonomous Drone Nav", desc: "Drone navigation in GPS-denied environments.", domain: "AI/ML", dept: "Aero" },
    { teamName: "EcoTracker", title: "Carbon Footprint Monitor", desc: "Mobile app to track personal carbon emissions.", domain: "GreenTech", dept: "Civil" },
    { teamName: "SwiftPay", title: "Cross-border Payments", desc: "Low-fee cross border remittance platform.", domain: "FinTech", dept: "Business" },
    { teamName: "HealthSync", title: "EMR Aggregator", desc: "", domain: "MedTech", dept: "BioMed" },
    { teamName: "RoboAssist", title: "Elderly Care Robot", desc: "A companion robot with fall detection.", domain: "Robotics", dept: "ECE" },
    { teamName: "AgriSense", title: "Smart Irrigation", desc: "IoT based soil moisture monitoring.", domain: "IoT", dept: "EEE" } // Missing submission issue
  ];

  const teamObjects = [];
  for (const t of teamDef) {
    const inserted = await db.insert(teams).values({
      eventId,
      teamName: t.teamName,
      projectTitle: t.title,
      projectDescription: t.desc,
      domain: t.domain,
      department: t.dept,
      collegeName: "Global Tech University",
      attendanceStatus: "checked_in", // All checked in
      checkedInAt: new Date(),
    }).returning();
    teamObjects.push(inserted[0]);

    // Create auth for student login
    await db.insert(studentTeamAuth).values({
      teamId: inserted[0].id,
      loginEmail: `${t.teamName.replace(/\s+/g, '').toLowerCase()}@demo.app`,
      passwordHash: studentPasswordHash
    });
  }

  // 6. ASSIGNMENTS to Labs (Pre-assign some, leave some for Smart Suggestion demo)
  // Let's pre-assign 8 teams so Smart Suggestion demonstrates placing the remaining 7.
  await db.insert(labAssignments).values([
    { teamId: teamObjects[0].id, labId: l1[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    { teamId: teamObjects[1].id, labId: l1[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    { teamId: teamObjects[2].id, labId: l1[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    { teamId: teamObjects[3].id, labId: l1[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    // Lab D (Capacity 2) - Fill it up
    { teamId: teamObjects[4].id, labId: l4[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    { teamId: teamObjects[5].id, labId: l4[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] }, // Plagiarism pair assigned to same lab and judge
    { teamId: teamObjects[6].id, labId: l2[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
    { teamId: teamObjects[7].id, labId: l3[0].id, roundId: activeRoundId, assignedById: userMap["admin@reviewflow.app"] },
  ]);

  // 7. REVIEWS (Simulating judge scores)
  // Clean winner: teamObjects[0] (Neural Ninjas) -> High scores from judge1
  await db.insert(reviews).values({
    teamId: teamObjects[0].id,
    mentorId: userMap["judge1@reviewflow.app"],
    labId: l1[0].id,
    roundId: activeRoundId,
    innovationScore: 9, technicalScore: 9, presentationScore: 8, feasibilityScore: 9, problemSolvingScore: 9, communicationScore: 8,
    compositeScore: "8.67",
    strengths: "Incredible architecture. Very solid technical foundation.",
    weaknesses: "Slightly complex deployment process.",
    overallComments: "A clear winner in this lab.",
    verdict: "excellent",
    isDraft: false
  });

  // Biased Judge (judge5) scores team 2 very low despite good tech
  await db.insert(reviews).values({
    teamId: teamObjects[1].id,
    mentorId: userMap["judge5@reviewflow.app"],
    labId: l1[0].id,
    roundId: activeRoundId,
    innovationScore: 3, technicalScore: 4, presentationScore: 3, feasibilityScore: 4, problemSolvingScore: 3, communicationScore: 3,
    compositeScore: "3.33",
    strengths: "None particularly.",
    weaknesses: "Idea is derivative.",
    overallComments: "I don't think this team knows what they are doing. Very poor.",
    verdict: "poor",
    isDraft: false
  });

  // Plagiarism Pair (Team 4 & 5) scored by judge2
  await db.insert(reviews).values([
    {
      teamId: teamObjects[4].id, mentorId: userMap["judge2@reviewflow.app"], labId: l4[0].id, roundId: activeRoundId,
      innovationScore: 7, technicalScore: 7, presentationScore: 7, feasibilityScore: 7, problemSolvingScore: 7, communicationScore: 7,
      compositeScore: "7.00",
      strengths: "The learning vector mapping algorithm is highly efficient and maps student traits perfectly.",
      weaknesses: "UI is a bit cluttered.",
      overallComments: "Good project overall.", verdict: "good", isDraft: false
    },
    {
      teamId: teamObjects[5].id, mentorId: userMap["judge3@reviewflow.app"], labId: l4[0].id, roundId: activeRoundId,
      innovationScore: 7, technicalScore: 7, presentationScore: 7, feasibilityScore: 7, problemSolvingScore: 7, communicationScore: 7,
      compositeScore: "7.00",
      // ALMOST IDENTICAL TEXT to trigger similarity AI checker
      strengths: "The learning vector mapping algorithm is highly efficient and maps student traits perfectly.",
      weaknesses: "Interface is a bit cluttered.",
      overallComments: "Good project overall.", verdict: "good", isDraft: false
    }
  ]);

  // 8. MULTIPLE RESULTS to define Top 5 ranking
  // We'll insert pre-calculated Results for Neural Ninjas, Data Miners, FinWizards
  await db.insert(results).values([
    { eventId, teamId: teamObjects[0].id, finalPosition: 1, isPublished: true },
    { eventId, teamId: teamObjects[3].id, finalPosition: 2, isPublished: true },
    { eventId, teamId: teamObjects[2].id, finalPosition: 3, isPublished: true },
    { eventId, teamId: teamObjects[6].id, finalPosition: 4, isPublished: true },
  ]);

  // 9. ANOMALY ISSUES
  // Issue 1: Missing presentation
  await db.insert(issues).values({
    teamId: teamObjects[14].id, // AgriSense
    eventId,
    category: "submission_missing",
    description: "Team has not uploaded their final presentation slide deck. They are locked out.",
    status: "open"
  });

  // Issue 2: Inactive judge
  await db.insert(issues).values({
    teamId: teamObjects[6].id,
    eventId,
    category: "judge_inactive",
    description: "Judge inactive.judge@reviewflow.app has not scored any of their assigned teams in the last 3 hours.",
    status: "open"
  });

  console.log("✅ Demo Seeding Complete!");
  console.log("-----------------------------------------");
  console.log("Admin Logins:");
  console.log("superadmin@reviewflow.app | Admin@123");
  console.log("admin@reviewflow.app | Admin@123");
  process.exit(0);
}

seedDemo().catch((e) => {
  console.error("Demo Seed failed:", e);
  process.exit(1);
});
