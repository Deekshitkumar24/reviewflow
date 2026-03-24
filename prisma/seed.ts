// prisma/seed.ts — ReviewFlow v3.0 Dev Seed Data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ReviewFlow database...');

  // ─── Roles ───
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: { name: 'super_admin', displayName: 'Super Administrator' },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', displayName: 'Event Administrator' },
    }),
    prisma.role.upsert({
      where: { name: 'mentor' },
      update: {},
      create: { name: 'mentor', displayName: 'Mentor / Judge' },
    }),
    prisma.role.upsert({
      where: { name: 'coordinator' },
      update: {},
      create: { name: 'coordinator', displayName: 'Event Coordinator' },
    }),
  ]);

  const [superAdminRole, adminRole, mentorRole, coordinatorRole] = roles;
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  // ─── Users ───
  const admin = await prisma.user.upsert({
    where: { email: 'admin@reviewflow.app' },
    update: {},
    create: {
      roleId: adminRole.id,
      fullName: 'Dr. Ramesh Kumar',
      email: 'admin@reviewflow.app',
      passwordHash,
      mustChangePassword: false, // For dev convenience
      status: 'active',
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@reviewflow.app' },
    update: {},
    create: {
      roleId: superAdminRole.id,
      fullName: 'Deekshit Kumar',
      email: 'superadmin@reviewflow.app',
      passwordHash,
      mustChangePassword: false,
      status: 'active',
    },
  });

  const mentor1 = await prisma.user.upsert({
    where: { email: 'mentor1@reviewflow.app' },
    update: {},
    create: {
      roleId: mentorRole.id,
      fullName: 'Dr. Priya Sharma',
      email: 'mentor1@reviewflow.app',
      passwordHash,
      mustChangePassword: false,
      status: 'active',
    },
  });

  const mentor2 = await prisma.user.upsert({
    where: { email: 'mentor2@reviewflow.app' },
    update: {},
    create: {
      roleId: mentorRole.id,
      fullName: 'Prof. Venkat Rao',
      email: 'mentor2@reviewflow.app',
      passwordHash,
      mustChangePassword: false,
      status: 'active',
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@reviewflow.app' },
    update: {},
    create: {
      roleId: coordinatorRole.id,
      fullName: 'Arjun Reddy',
      email: 'coordinator@reviewflow.app',
      passwordHash,
      mustChangePassword: false,
      status: 'active',
    },
  });

  // ─── Event ───
  const event = await prisma.event.create({
    data: {
      eventName: 'Tech Expo 2026',
      organizerName: 'VJIT Computer Science Department',
      description: 'Annual technical project exhibition and hackathon with multi-round judging.',
      eventDate: new Date('2026-04-15'),
      venue: 'VJIT Main Campus, Block A',
      eventType: 'multi_round',
      status: 'active',
      totalRounds: 2,
      suggestionsEnabled: true,
      allowMultiMentorReview: false,
      createdById: admin.id,
    },
  });

  // ─── Rounds ───
  const round1 = await prisma.round.create({
    data: {
      eventId: event.id,
      roundName: 'Round 1 — Preliminary',
      roundOrder: 1,
      status: 'open',
    },
  });

  const round2 = await prisma.round.create({
    data: {
      eventId: event.id,
      roundName: 'Round 2 — Finals',
      roundOrder: 2,
      status: 'pending',
    },
  });

  // ─── Labs ───
  const labs = await Promise.all([
    prisma.lab.create({
      data: { eventId: event.id, labName: 'Lab 101', building: 'Block A', floor: '1st Floor', capacity: 8, status: 'active' },
    }),
    prisma.lab.create({
      data: { eventId: event.id, labName: 'Lab 102', building: 'Block A', floor: '1st Floor', capacity: 8, status: 'active' },
    }),
    prisma.lab.create({
      data: { eventId: event.id, labName: 'Lab 201', building: 'Block A', floor: '2nd Floor', capacity: 6, status: 'active' },
    }),
  ]);

  // ─── Mentor Assignments ───
  await prisma.mentorAssignment.create({
    data: { mentorId: mentor1.id, labId: labs[0].id, roundId: round1.id },
  });
  await prisma.mentorAssignment.create({
    data: { mentorId: mentor1.id, labId: labs[1].id, roundId: round1.id },
  });
  await prisma.mentorAssignment.create({
    data: { mentorId: mentor2.id, labId: labs[2].id, roundId: round1.id },
  });

  // ─── Teams (20 teams) ───
  const teamNames = [
    { name: 'AlgoX', project: 'AI-Powered Code Review Assistant', domain: 'AI/ML', dept: 'CSE', college: 'VJIT' },
    { name: 'ByteHackers', project: 'Real-time Collaborative IDE', domain: 'Web Development', dept: 'CSE', college: 'VJIT' },
    { name: 'DevForge', project: 'Smart Campus Navigation System', domain: 'IoT', dept: 'ECE', college: 'VJIT' },
    { name: 'CloudNine', project: 'Serverless Event Management', domain: 'Cloud Computing', dept: 'CSE', college: 'VJIT' },
    { name: 'DataWizards', project: 'Healthcare Analytics Dashboard', domain: 'Data Science', dept: 'IT', college: 'JNTU' },
    { name: 'CyberGuards', project: 'Network Intrusion Detection System', domain: 'Cybersecurity', dept: 'CSE', college: 'VJIT' },
    { name: 'GreenTech', project: 'Solar Panel Efficiency Optimizer', domain: 'Renewable Energy', dept: 'EEE', college: 'VJIT' },
    { name: 'MedAI', project: 'Disease Prediction from Symptoms', domain: 'AI/ML', dept: 'CSE', college: 'Osmania' },
    { name: 'FinFlow', project: 'Personal Finance Tracker App', domain: 'FinTech', dept: 'CSE', college: 'VJIT' },
    { name: 'EduConnect', project: 'Virtual Classroom Platform', domain: 'EdTech', dept: 'IT', college: 'VJIT' },
    { name: 'AgriSense', project: 'Crop Disease Detection via Drone', domain: 'AgriTech', dept: 'CSE', college: 'JNTU' },
    { name: 'RoboNav', project: 'Autonomous Warehouse Robot', domain: 'Robotics', dept: 'Mechanical', college: 'VJIT' },
    { name: 'BlockChain', project: 'Decentralized Certificate Verification', domain: 'Blockchain', dept: 'CSE', college: 'VJIT' },
    { name: 'VoiceAI', project: 'Voice-Controlled Home Automation', domain: 'IoT', dept: 'ECE', college: 'VJIT' },
    { name: 'PixelPerfect', project: 'Real-time Image Enhancement Tool', domain: 'Computer Vision', dept: 'CSE', college: 'Osmania' },
    { name: 'SafeRoute', project: 'Women Safety Alert System', domain: 'Mobile Apps', dept: 'CSE', college: 'VJIT' },
    { name: 'CodeMentor', project: 'AI Programming Tutor Chatbot', domain: 'AI/ML', dept: 'CSE', college: 'VJIT' },
    { name: 'TrafficFlow', project: 'Smart Traffic Signal Management', domain: 'IoT', dept: 'ECE', college: 'JNTU' },
    { name: 'HealthMate', project: 'Mental Health Support Chatbot', domain: 'AI/ML', dept: 'IT', college: 'VJIT' },
    { name: 'EcoTrack', project: 'Carbon Footprint Calculator', domain: 'GreenTech', dept: 'CSE', college: 'VJIT' },
  ];

  for (let i = 0; i < teamNames.length; i++) {
    const t = teamNames[i];
    const labIndex = i % 3; // Distribute across 3 labs

    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        teamName: t.name,
        projectTitle: t.project,
        domain: t.domain,
        department: t.dept,
        collegeName: t.college,
        attendanceStatus: i < 16 ? 'checked_in' : 'registered',
        checkedInAt: i < 16 ? new Date() : null,
        checkedInById: i < 16 ? coordinator.id : null,
        members: {
          create: [
            { fullName: `${t.name} Leader`, email: `${t.name.toLowerCase()}@team.com`, isLeader: true, academicYear: 3 },
            { fullName: `${t.name} Member 2`, academicYear: 3 },
            { fullName: `${t.name} Member 3`, academicYear: 2 },
          ],
        },
      },
    });

    // Assign to lab for round 1
    await prisma.labAssignment.create({
      data: {
        teamId: team.id,
        labId: labs[labIndex].id,
        roundId: round1.id,
        assignedById: admin.id,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('  Admin:       admin@reviewflow.app / Admin@123');
  console.log('  Super Admin: superadmin@reviewflow.app / Admin@123');
  console.log('  Mentor 1:    mentor1@reviewflow.app / Admin@123');
  console.log('  Mentor 2:    mentor2@reviewflow.app / Admin@123');
  console.log('  Coordinator: coordinator@reviewflow.app / Admin@123');
  console.log('');
  console.log('📊 Seeded Data:');
  console.log(`  Event: ${event.eventName}`);
  console.log(`  Rounds: ${round1.roundName}, ${round2.roundName}`);
  console.log(`  Labs: ${labs.map(l => l.labName).join(', ')}`);
  console.log(`  Teams: ${teamNames.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
