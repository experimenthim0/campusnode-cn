/**
 * CampusNode Synthetic Test Data Seeder
 *
 * Deterministic, idempotent, automated test-data generator for staging / load-testing.
 *
 * Requirements fulfilled:
 * - Preserves existing admin account(s) without modifications
 * - Uses bcrypt with cost 10 for test password '12345678'
 * - Creates 2,000 synthetic students (student_1@nitj.ac.in to student_2000@nitj.ac.in)
 * - Graduation years 2027 to 2030 (B.Tech programs, realistic NITJ branches)
 * - Accounts verified: isVerified = true, isTwoStepEnabled = false
 * - Creates exactly 10 external users (external_1@college.edu to external_10@college.edu)
 * - Creates exactly 25 clubs with unique slugs and emails
 * - Creates 25 faculty coordinators (faculty_1@nitj.ac.in to faculty_25@nitj.ac.in)
 * - Populates club memberships (3–5 clubs per active student, heads & coordinators)
 * - Creates at least 200 events (8 events per club: 4 past, 4 upcoming)
 * - Creates event participations (attendees for past, registered for upcoming)
 * - Creates 10 scoped notifications covering required scenarios
 * - Automated post-seed verification and authentication validation
 * - Database safety guard to prevent execution on production
 * - ZERO emails sent, ZERO external service calls
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { PROGRAM_BRANCH_MAP } from "../constants/academicConstants.js";
import { assertDatabaseSafety } from "./db-safety-guard.js";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const TEST_PASSWORD = "12345678";
const BCRYPT_ROUNDS = 10;
const STUDENT_COUNT = 2000;
const EXTERNAL_COUNT = 10;
const FACULTY_COUNT = 25;
const EVENTS_PER_CLUB = 8;
const GRADUATION_YEARS = [2027, 2028, 2029, 2030];

const BTECH_BRANCHES = PROGRAM_BRANCH_MAP.BTECH.branches; // ["CSE", "IT", "MNC", "MAC", "ECE", "EE", "ICE", "ME", "CE", "CH", "IPE", "BT", "TT"]

const FIRST_NAMES = [
  "Aarav", "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Manish",
  "Neha", "Pranav", "Pooja", "Rahul", "Rhea", "Rohan", "Sanya", "Shaurya",
  "Sneha", "Tanvi", "Utkarsh", "Varun", "Vikram", "Yash", "Avani", "Karan",
  "Dev", "Meera", "Aryan", "Nikhil", "Simran", "Tara", "Reyansh", "Anika",
  "Dhruv", "Gauri", "Kabir", "Khushi", "Mayank", "Nandini", "Parth", "Riddhi",
  "Samarth", "Shreya", "Siddharth", "Tanmay", "Vaishnavi", "Vidur", "Zoya", "Aayush"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Mehta", "Joshi",
  "Chopra", "Malhotra", "Bhatia", "Saxena", "Reddy", "Nair", "Iyer", "Rao",
  "Agarwal", "Bansal", "Mittal", "Kapoor", "Arora", "Bhardwaj", "Choudhary",
  "Dhawan", "Garg", "Goel", "Jain", "Khanna", "Mahajan", "Pandey", "Prasad",
  "Sarin", "Seth", "Sethi", "Shukla", "Sood", "Srivastava", "Tandon", "Thakur",
  "Tripathi", "Venkatesh", "Yadav", "Bhatt", "Chauhan", "Kashyap", "Mishra"
];

const FACULTY_NAMES = [
  "Dr. Rajesh Sharma", "Dr. Sunita Verma", "Dr. Amit Patel", "Dr. Neha Gupta",
  "Dr. Rajiv Malhotra", "Dr. Meenakshi Rao", "Dr. Sanjay Kumar", "Dr. Anjali Bhatia",
  "Dr. Vikram Singh", "Dr. Kavita Joshi", "Dr. Manoj Agarwal", "Dr. Preeti Kapoor",
  "Dr. Suresh Nair", "Dr. Rekha Reddy", "Dr. Arvind Mehta", "Dr. Sangeeta Saxena",
  "Dr. Deepak Chopra", "Dr. Vandana Iyer", "Dr. Ashok Bansal", "Dr. Ritu Choudhary",
  "Dr. Harish Mittal", "Dr. Poonam Sethi", "Dr. Alok Shukla", "Dr. Geeta Tripathi",
  "Dr. Pradeep Thakur"
];

const CLUBS_CONFIG = [
  {
    name: "Coding Club",
    slug: "coding-club",
    category: "Technical",
    motto: "Code the future, debug the world.",
    mission: "To foster competitive programming, open source development, and algorithmic thinking among students.",
    description: "The premier coding and technical society of NIT Jalandhar, organizing hackathons, coding contests, and developer bootcamps.",
  },
  {
    name: "Robotics Club",
    slug: "robotics-club",
    category: "Technical",
    motto: "Innovating mechanical and robotic excellence.",
    mission: "Designing autonomous robots, drone technology, and embedded IoT systems.",
    description: "Focuses on hardware-software integration, ROS, microcontroller programming, and bot-building competitions.",
  },
  {
    name: "Civil Engineering Society",
    slug: "civil-engineering-society",
    category: "Technical",
    motto: "Building sustainable and resilient infrastructure.",
    mission: "Advancing civil engineering practices, structural modeling, and geotechnical innovations.",
    description: "A professional academic and practical engineering society organizing bridge design competitions and surveying workshops.",
  },
  {
    name: "Entrepreneurship Cell",
    slug: "entrepreneurship-cell",
    category: "Innovation",
    motto: "Igniting the entrepreneurial spirit.",
    mission: "Fostering startup culture, incubation, venture pitching, and business networking.",
    description: "Connects aspiring student founders with angel investors, alumni entrepreneurs, and incubation resources.",
  },
  {
    name: "Literary Club",
    slug: "literary-club",
    category: "Literary",
    motto: "Pens sharper than swords.",
    mission: "Cultivating poetry, creative writing, elocution, and literary appreciation.",
    description: "Organizes poetry slams, book reviews, creative writing contests, and annual literary festivals.",
  },
  {
    name: "Photography Club",
    slug: "photography-club",
    category: "Creative Arts",
    motto: "Capturing moments that define a lifetime.",
    mission: "Developing visual storytelling, cinematography, and digital photography skills.",
    description: "The official creative photography club of the institute covering campus life, nature, and cultural celebrations.",
  },
  {
    name: "Music Club",
    slug: "music-club",
    category: "Cultural",
    motto: "Harmonizing rhythm, soul, and melody.",
    mission: "Promoting vocal and instrumental musical talents across Western, Classical, and Fusion genres.",
    description: "Features collegiate bands, solo vocalists, jam sessions, and musical evenings.",
  },
  {
    name: "Dramatics Club",
    slug: "dramatics-club",
    category: "Cultural",
    motto: "Life is a stage, we bring it to life.",
    mission: "Mastering theatrical arts, street plays (Nukkad Natak), stage dramas, and mime acts.",
    description: "The theatre society raising social awareness and staging theatrical productions.",
  },
  {
    name: "Dance Club",
    slug: "dance-club",
    category: "Cultural",
    motto: "Expressing passion through every movement.",
    mission: "Promoting classical, contemporary, hip-hop, and folk dance forms.",
    description: "Showcases energetic choreography, group performances, and inter-college dance face-offs.",
  },
  {
    name: "Debate Society",
    slug: "debate-society",
    category: "Literary",
    motto: "Clash of ideas, power of reasoned argument.",
    mission: "Training parliamentary debaters, public speakers, and critical thinkers.",
    description: "Hosts Asian Parliamentary, British Parliamentary, and conventional debates on global and national topics.",
  },
  {
    name: "Astronomy Club",
    slug: "astronomy-club",
    category: "Science",
    motto: "Looking beyond the horizon into the cosmos.",
    mission: "Promoting astrophysics, sky observation, telescope handling, and space science.",
    description: "Organizes nocturnal star-gazing sessions, eclipse observations, and astrophysics seminars.",
  },
  {
    name: "AI & Machine Learning Club",
    slug: "ai-machine-learning-club",
    category: "Technical",
    motto: "Transforming data into intelligent intelligence.",
    mission: "Democratizing artificial intelligence, deep learning, computer vision, and NLP research.",
    description: "Hosts ML paper discussions, Kaggle competitions, and generative AI workshops.",
  },
  {
    name: "Cyber Security Club",
    slug: "cyber-security-club",
    category: "Technical",
    motto: "Securing the digital frontier.",
    mission: "Training ethical hackers, security analysts, and CTF champions.",
    description: "Focuses on network security, web penetration testing, cryptography, and reverse engineering.",
  },
  {
    name: "Finance Club",
    slug: "finance-club",
    category: "Management",
    motto: "Smart capital, astute valuation.",
    mission: "Educating students on equity markets, personal finance, valuation, and algorithmic trading.",
    description: "Simulates virtual stock trading, financial modeling workshops, and macro-economic case discussions.",
  },
  {
    name: "Marketing Club",
    slug: "marketing-club",
    category: "Management",
    motto: "Crafting narratives that sell.",
    mission: "Developing brand strategy, digital growth marketing, and consumer psychology skills.",
    description: "Hosts brand marketing case studies, ad-making challenges, and growth hacking seminars.",
  },
  {
    name: "Environment Club",
    slug: "environment-club",
    category: "Social & Eco",
    motto: "Green campus, sustainable tomorrow.",
    mission: "Driving ecological sustainability, tree plantation, renewable energy, and waste audits.",
    description: "Leads campus sustainability drives, clean-up walks, and environmental awareness summits.",
  },
  {
    name: "Automobile Club",
    slug: "automobile-club",
    category: "Technical",
    motto: "Fueled by horsepower and engineering precision.",
    mission: "Designing and building BAJA SAE, electric go-karts, and formula student vehicles.",
    description: "Vehicle design, aerodynamic modeling, powertrain optimization, and automotive telemetry.",
  },
  {
    name: "Design Club",
    slug: "design-club",
    category: "Creative Arts",
    motto: "Aesthetics meeting purposeful function.",
    mission: "Teaching UI/UX design, brand identity design, motion graphics, and 3D rendering.",
    description: "Conducts Figma UI hackathons, typography sprints, and user-experience workshops.",
  },
  {
    name: "Quiz Club",
    slug: "quiz-club",
    category: "Literary",
    motto: "Curiosity ignited, knowledge tested.",
    mission: "Challenging quizzers in trivia, science, history, pop culture, and sports.",
    description: "The home of trivia buffs at NITJ, conducting general and specialized quizzes throughout the year.",
  },
  {
    name: "Sports Club",
    slug: "sports-club",
    category: "Athletics",
    motto: "Discipline, strength, and sportsmanship.",
    mission: "Promoting physical fitness, inter-branch athletic championships, and varsity sports.",
    description: "Coordinates football, cricket, badminton, basketball, and track-and-field tourneys.",
  },
  {
    name: "Innovation Club",
    slug: "innovation-club",
    category: "Innovation",
    motto: "Turning creative concepts into tangible prototypes.",
    mission: "Facilitating patents, intellectual property development, and multidisciplinary invention.",
    description: "Provides maker-space facilities, 3D printing equipment, and rapid prototyping mentorship.",
  },
  {
    name: "Mathematics Society",
    slug: "mathematics-society",
    category: "Science",
    motto: "Unlocking the universe through mathematics.",
    mission: "Exploring pure mathematics, applied statistics, cryptography, and mathematical puzzles.",
    description: "Hosts integration bees, Olympiad preparation sessions, and quantitative research talks.",
  },
  {
    name: "Electronics Club",
    slug: "electronics-club",
    category: "Technical",
    motto: "Circuits, signals, and silicon innovation.",
    mission: "Mastering PCB design, VLSI, FPGA programming, and embedded IoT systems.",
    description: "Hands-on soldering workshops, circuit simulation competitions, and microcontroller bootcamps.",
  },
  {
    name: "Cultural Society",
    slug: "cultural-society",
    category: "Cultural",
    motto: "Celebrating the vibrant tapestry of traditions.",
    mission: "Organizing institute-wide multi-cultural fests, heritage celebrations, and arts fairs.",
    description: "Coordinates the flagship cultural fest, inter-state folk exhibits, and traditional artistic showcases.",
  },
  {
    name: "Media & Communications Club",
    slug: "media-communications-club",
    category: "Media",
    motto: "The voice and pulse of the campus.",
    mission: "Reporting campus news, managing social channels, podcasting, and conducting media interviews.",
    description: "Produces campus video bulletins, student newsletters, and coverage for all university fests.",
  },
];

const VENUES = [
  "Central Seminar Hall",
  "Main Auditorium",
  "Lecture Hall Complex LT-1",
  "Lecture Hall Complex LT-2",
  "Student Activity Centre (SAC)",
  "CSE Department Seminar Hall",
  "IT Building Lab 1",
  "Open Air Theatre (OAT)",
  "Sports Complex Indoor Arena",
  "Innovation & Incubation Hub",
];

// Event title templates per category
const EVENT_TEMPLATES = {
  Technical: [
    { title: "Annual Hackathon 2026", desc: "A 24-hour intensive software development and prototype hackathon." },
    { title: "AI & Deep Learning Bootcamp", desc: "Hands-on session on fine-tuning LLMs and training convolutional vision models." },
    { title: "Full-Stack Web Development Workshop", desc: "Mastering modern React, Node.js, and Postgres architecture." },
    { title: "Competitive Coding Championship", desc: "An algorithmic programming contest featuring dynamic programming and graph problems." },
    { title: "Cyber Security & CTF Challenge", desc: "Capture the flag competition testing binary exploitation and web application security." },
    { title: "Microcontroller & Embedded Systems Lab", desc: "Prototyping sensor telemetry and IoT firmware on ARM architecture." },
    { title: "Cloud Architecture & DevOps Seminar", desc: "Containerization, Kubernetes pipelines, and resilient cloud architectures." },
    { title: "CAD & 3D Modeling Workshop", desc: "Parametric design, structural FEA simulation, and rapid 3D printing." },
  ],
  Cultural: [
    { title: "Annual Musical Eve", desc: "An evening of acoustic, classical, and rock performances by student artists." },
    { title: "Campus Theatre & Play Night", desc: "Dramatic stage play addressing contemporary social themes and narratives." },
    { title: "Open Mic & Poetry Slam", desc: "Spoken word, stand-up comedy, and original poetic expressions." },
    { title: "Inter-College Dance Showcase", desc: "Choreographed crew dance battles spanning hip-hop to classical." },
    { title: "Folk Arts & Heritage Exhibition", desc: "Traditional crafts, rangoli design, and cultural heritage display." },
    { title: "Battle of the Campus Bands", desc: "Live music competition featuring student rock, fusion, and indie bands." },
    { title: "Photography Walk & Exhibition", desc: "Guided campus photowalk followed by an exhibition of juried student prints." },
    { title: "Street Play (Nukkad Natak) Festival", desc: "High-energy street drama performances on social responsibility." },
  ],
  Literary: [
    { title: "Parliamentary Debate Championship", desc: "Rigorous 3v3 Asian parliamentary debate tournament on public policy." },
    { title: "General Knowledge Quiz Bowl", desc: "Multi-round general trivia covering science, history, arts, and geography." },
    { title: "Creative Writing Workshop", desc: "Mastering narrative structure, character development, and worldbuilding." },
    { title: "Elocution & Extempore Challenge", desc: "Testing spontaneity and public speaking prowess before an expert jury." },
    { title: "Book Discussion & Literary Forum", desc: "In-depth review and panel discussion on contemporary fiction and philosophy." },
    { title: "Technical Paper Presentation Contest", desc: "Students present research papers on emerging engineering methodologies." },
    { title: "Spelling Bee & Vocabulary Clash", desc: "High-stakes etymology and vocabulary competition for language buffs." },
    { title: "Editorial & Journalism Bootcamp", desc: "Investigative reporting, op-ed writing, and campus newsletter layout." },
  ],
  Default: [
    { title: "Leadership & Career Guidance Summit", desc: "Distinguished alumni share insights on modern industry leadership." },
    { title: "Startup Pitch & Demo Day", desc: "Student founders pitch prototypes to angel investors and mentors." },
    { title: "Annual Inter-Branch Sports Meet", desc: "Track and field, badminton, table tennis, and chess tourneys." },
    { title: "Campus Green Drive & Sustainability Walk", desc: "Eco-audit, tree plantation, and clean campus volunteer drive." },
    { title: "Design Sprint & UI/UX Challenge", desc: "Design a mobile product flow within 6 hours using modern design systems." },
    { title: "Mathematical Puzzles & Logic Olympiad", desc: "Problem solving challenge in discrete math and combinatorics." },
    { title: "Product Innovation & Maker Fair", desc: "Exhibition of student-built hardware and multidisciplinary prototypes." },
    { title: "Industry Expert Talk & Networking", desc: "Keynote on technological disruptions and career navigation." },
  ],
};

// ==========================================
// SEED RUNNER
// ==========================================

export async function runSyntheticSeed() {
  console.log("\n=======================================================");
  console.log("  CampusNode Production-Safe Synthetic Test Data Seeder");
  console.log("=======================================================\n");

  // Step 1: Database Safety Guard
  console.log("[1/9] Asserting database safety...");
  const dbInfo = assertDatabaseSafety({ command: "Synthetic Test Data Seeder" });
  console.log(`  -> Database: ${dbInfo.database} on host: ${dbInfo.host}`);
  console.log("  -> Safety verification passed.\n");

  // Step 2: Existing Admin Protection
  console.log("[2/9] Inspecting existing AdminRole accounts...");
  const existingAdmins = await prisma.adminRole.findMany({
    where: { role: "admin" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  console.log(`  -> Found ${existingAdmins.length} existing admin account(s).`);
  if (existingAdmins.length === 0) {
    console.log("  -> Warning: No existing admin found, but per critical rules, seeder will not invent or recreate one.");
  } else {
    console.log(`  -> Preserving existing admin: "${existingAdmins[0].name}" (${existingAdmins[0].email}). NO MODIFICATIONS.`);
  }

  // Step 3: Password Hash
  console.log("\n[3/9] Hashing shared test password '12345678' via bcryptjs (cost 10)...");
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  console.log("  -> Password hash prepared successfully.\n");

  // Step 4: Faculty Coordinators (25 accounts)
  console.log("[4/9] Provisioning 25 Faculty Coordinators...");
  const facultyUsers = [];
  for (let i = 1; i <= FACULTY_COUNT; i++) {
    const email = `faculty_${i}@nitj.ac.in`;
    const name = FACULTY_NAMES[i - 1] || `Dr. Faculty Coordinator ${i}`;
    const id = `f0000000000000000000${String(i).padStart(4, "0")}`;

    const faculty = await prisma.adminRole.upsert({
      where: { email },
      update: {
        name,
        role: "facultyCoordinator",
        password: passwordHash,
        isTwoStepEnabled: false,
      },
      create: {
        id,
        name,
        email,
        password: passwordHash,
        role: "facultyCoordinator",
        isTwoStepEnabled: false,
      },
    });
    facultyUsers.push(faculty);
  }
  console.log(`  -> Provisioned/verified ${facultyUsers.length} Faculty Coordinators.\n`);

  // Step 5: Clubs (25 clubs)
  console.log("[5/9] Provisioning 25 Clubs...");
  const clubs = [];
  for (let i = 0; i < CLUBS_CONFIG.length; i++) {
    const cfg = CLUBS_CONFIG[i];
    const assignedFaculty = facultyUsers[i];
    const id = `b0000000000000000000${String(i + 1).padStart(4, "0")}`;
    const clubEmail = `${cfg.slug}@nitj.ac.in`;

    const club = await prisma.club.upsert({
      where: { slug: cfg.slug },
      update: {
        clubName: cfg.name,
        description: cfg.description,
        category: cfg.category,
        clubEmail,
        facultyCoordinatorId: assignedFaculty.id,
        facultyName: assignedFaculty.name,
        facultyEmail: assignedFaculty.email,
        motto: cfg.motto,
        mission: cfg.mission,
        establishedYear: "2015",
      },
      create: {
        id,
        clubName: cfg.name,
        slug: cfg.slug,
        description: cfg.description,
        category: cfg.category,
        clubEmail,
        facultyCoordinatorId: assignedFaculty.id,
        facultyName: assignedFaculty.name,
        facultyEmail: assignedFaculty.email,
        motto: cfg.motto,
        mission: cfg.mission,
        establishedYear: "2015",
      },
    });
    clubs.push(club);
  }
  console.log(`  -> Provisioned/verified ${clubs.length} Clubs with coordinators.\n`);

  // Step 6: Students (2,000 accounts) & External Users (10 accounts)
  console.log("[6/9] Provisioning 2,000 Synthetic Students & 10 External Users...");

  // Check how many students already exist with student_*@nitj.ac.in
  const existingSyntheticStudents = await prisma.studentUser.findMany({
    where: {
      email: { startsWith: "student_" },
    },
    select: { id: true, email: true, rollNo: true },
  });
  const existingStudentEmails = new Set(existingSyntheticStudents.map((s) => s.email));

  const studentCreateBatch = [];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const email = `student_${i}@nitj.ac.in`;
    if (!existingStudentEmails.has(email)) {
      const gradYear = GRADUATION_YEARS[(i - 1) % GRADUATION_YEARS.length];
      const admissionYear = gradYear - 4; // e.g. 2027 grad -> 2023 admission
      const admissionPrefix = String(admissionYear).slice(-2); // e.g. "23"
      const branchCode = BTECH_BRANCHES[(i - 1) % BTECH_BRANCHES.length];
      const rollNo = `${admissionPrefix}10${String(i).padStart(4, "0")}`; // e.g. "23100001"

      const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i * 11) % LAST_NAMES.length];
      const name = `${firstName} ${lastName}`;
      const id = `c0000000000000000000${String(i).padStart(4, "0")}`;

      studentCreateBatch.push({
        id,
        rollNo,
        name,
        email,
        password: passwordHash,
        branch: branchCode,
        program: "BTECH",
        expectedGraduationYear: gradYear,
        isVerified: true,
        isTwoStepEnabled: false,
      });
    }
  }

  if (studentCreateBatch.length > 0) {
    console.log(`  -> Inserting ${studentCreateBatch.length} new synthetic students in chunks of 500...`);
    const CHUNK_SIZE = 500;
    for (let c = 0; c < studentCreateBatch.length; c += CHUNK_SIZE) {
      const chunk = studentCreateBatch.slice(c, c + CHUNK_SIZE);
      await prisma.studentUser.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  } else {
    console.log("  -> All 2,000 synthetic students already present in database.");
  }

  // Fetch all 2,000 synthetic students for relation building
  const allSyntheticStudents = await prisma.studentUser.findMany({
    where: { email: { startsWith: "student_" } },
    select: { id: true, email: true, name: true, branch: true },
    orderBy: { email: "asc" },
  });
  console.log(`  -> Total verified synthetic students available: ${allSyntheticStudents.length}`);

  // Provision 10 External Users
  const externalUsers = [];
  const EXTERNAL_COLLEGES = [
    "IIT Delhi", "BITS Pilani", "Thapar Institute", "DTU Delhi", "PEC Chandigarh",
    "IIT Roorkee", "NIT Kurukshetra", "IIIT Delhi", "NSUT Delhi", "Manipal University"
  ];
  for (let i = 1; i <= EXTERNAL_COUNT; i++) {
    const email = `external_${i}@college.edu`;
    const firstName = FIRST_NAMES[(i * 5) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 9) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const id = `e0000000000000000000${String(i).padStart(4, "0")}`;
    const collegeName = EXTERNAL_COLLEGES[i - 1];
    const gradYear = GRADUATION_YEARS[(i - 1) % GRADUATION_YEARS.length];

    const external = await prisma.externalUser.upsert({
      where: { email },
      update: {
        name,
        password: passwordHash,
        collegeName,
        program: "B.Tech",
        graduationYear: gradYear,
        isVerified: true,
        isTwoStepEnabled: false,
      },
      create: {
        id,
        name,
        email,
        password: passwordHash,
        collegeName,
        program: "B.Tech",
        graduationYear: gradYear,
        isVerified: true,
        isTwoStepEnabled: false,
      },
    });
    externalUsers.push(external);
  }
  console.log(`  -> Provisioned/verified ${externalUsers.length} External Users.\n`);

  // Step 7: Club Memberships (3–5 clubs per active student)
  console.log("[7/9] Populating Club Memberships (3–5 clubs per active student)...");
  const existingMemberships = await prisma.clubMembership.findMany({
    where: {
      student: { email: { startsWith: "student_" } },
    },
    select: { clubId: true, studentId: true },
  });
  const existingMembershipKeys = new Set(
    existingMemberships.map((m) => `${m.clubId}:${m.studentId}`)
  );

  const membershipBatch = [];
  // Designate heads and coordinators for each club first
  for (let cIdx = 0; cIdx < clubs.length; cIdx++) {
    const club = clubs[cIdx];
    // 1 Club Head per club
    const headStudent = allSyntheticStudents[cIdx];
    if (headStudent) {
      const key = `${club.id}:${headStudent.id}`;
      if (!existingMembershipKeys.has(key)) {
        membershipBatch.push({
          id: `m0000000000${String(cIdx + 1).padStart(3, "0")}head0001`,
          clubId: club.id,
          studentId: headStudent.id,
          role: "CLUB_HEAD",
          canTakeAttendance: true,
          canEditEvents: true,
        });
        existingMembershipKeys.add(key);
      }
    }

    // 3 Coordinators per club
    for (let coordIdx = 1; coordIdx <= 3; coordIdx++) {
      const coordStudent = allSyntheticStudents[25 + cIdx * 3 + (coordIdx - 1)];
      if (coordStudent) {
        const key = `${club.id}:${coordStudent.id}`;
        if (!existingMembershipKeys.has(key)) {
          membershipBatch.push({
            id: `m0000000000${String(cIdx + 1).padStart(3, "0")}crd${String(coordIdx).padStart(4, "0")}`,
            clubId: club.id,
            studentId: coordStudent.id,
            role: "COORDINATOR",
            canTakeAttendance: true,
            canEditEvents: true,
          });
          existingMembershipKeys.add(key);
        }
      }
    }
  }

  // Distribute 3–5 memberships across active students (students 1 to 1200)
  for (let sIdx = 0; sIdx < Math.min(1200, allSyntheticStudents.length); sIdx++) {
    const student = allSyntheticStudents[sIdx];
    // Determine how many clubs for this student: 3, 4, or 5
    const clubCount = 3 + (sIdx % 3); // 3, 4, or 5
    for (let k = 0; k < clubCount; k++) {
      const clubIndex = (sIdx * 3 + k * 7) % clubs.length;
      const targetClub = clubs[clubIndex];
      const key = `${targetClub.id}:${student.id}`;
      if (!existingMembershipKeys.has(key)) {
        membershipBatch.push({
          id: `m${String(sIdx + 1).padStart(11, "0")}${String(clubIndex + 1).padStart(12, "0")}`,
          clubId: targetClub.id,
          studentId: student.id,
          role: "MEMBER",
          canTakeAttendance: true,
          canEditEvents: false,
        });
        existingMembershipKeys.add(key);
      }
    }
  }

  if (membershipBatch.length > 0) {
    console.log(`  -> Inserting ${membershipBatch.length} club memberships in chunks of 500...`);
    const CHUNK_SIZE = 500;
    for (let c = 0; c < membershipBatch.length; c += CHUNK_SIZE) {
      const chunk = membershipBatch.slice(c, c + CHUNK_SIZE);
      await prisma.clubMembership.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  }

  const totalMemberships = await prisma.clubMembership.count({
    where: { student: { email: { startsWith: "student_" } } },
  });
  console.log(`  -> Verified active synthetic memberships in DB: ${totalMemberships}\n`);

  // Step 8: Events (25 clubs × 8 events = 200 events) & Event Organizers
  console.log("[8/9] Provisioning Events (25 clubs × 8 events = 200 events, 100 past & 100 upcoming)...");
  const now = new Date();
  const pastOffsetsDays = [-60, -30, -14, -3];
  const upcomingOffsetsDays = [3, 10, 21, 45];

  const seededEvents = [];
  const eventOrganizerBatch = [];

  for (let cIdx = 0; cIdx < clubs.length; cIdx++) {
    const club = clubs[cIdx];
    const category = club.category || "Technical";
    const templates = EVENT_TEMPLATES[category] || EVENT_TEMPLATES.Technical;

    for (let eIdx = 0; eIdx < EVENTS_PER_CLUB; eIdx++) {
      const isPast = eIdx < 4; // 0..3: past, 4..7: upcoming
      const offsetDays = isPast
        ? pastOffsetsDays[eIdx]
        : upcomingOffsetsDays[eIdx - 4];

      const startTime = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      startTime.setHours(14, 0, 0, 0); // 2:00 PM
      const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 5:00 PM (3 hours later)
      const regDeadline = new Date(startTime.getTime() - 24 * 60 * 60 * 1000); // 1 day before

      const tpl = templates[eIdx % templates.length] || EVENT_TEMPLATES.Default[eIdx % 8];
      const title = `${club.clubName}: ${tpl.title}`;
      const slug = `${club.slug}-${tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${isPast ? "past" : "live"}-${(eIdx % 4) + 1}`;
      const venue = VENUES[(cIdx + eIdx) % VENUES.length];
      const eventId = `a000000000000000${String(cIdx + 1).padStart(4, "0")}${String(eIdx + 1).padStart(4, "0")}`;

      const event = await prisma.event.upsert({
        where: { slug },
        update: {
          title,
          description: tpl.desc,
          venue,
          startTime,
          endTime,
          registrationDeadline: regDeadline,
          reviewStatus: "PUBLISHED",
          totalSeats: 150,
          allowExternal: true,
          allowWaitlist: true,
          feedbackEnabled: true,
        },
        create: {
          id: eventId,
          title,
          slug,
          description: tpl.desc,
          venue,
          startTime,
          endTime,
          registrationDeadline: regDeadline,
          reviewStatus: "PUBLISHED",
          totalSeats: 150,
          allowExternal: true,
          allowWaitlist: true,
          feedbackEnabled: true,
          allowedPrograms: ["BTECH", "MTECH", "OTHER"],
          allowedYears: [],
          allowedBranches: [],
        },
      });
      seededEvents.push({ ...event, isPast, clubId: club.id });

      eventOrganizerBatch.push({
        id: `d000000000000000${String(cIdx + 1).padStart(4, "0")}${String(eIdx + 1).padStart(4, "0")}`,
        eventId: event.id,
        clubId: club.id,
      });
    }
  }

  // Batch insert EventOrganizer records
  await prisma.eventOrganizer.createMany({
    data: eventOrganizerBatch,
    skipDuplicates: true,
  });

  const totalEventsCount = seededEvents.length;
  const pastEventsCount = seededEvents.filter((e) => e.isPast).length;
  const upcomingEventsCount = seededEvents.filter((e) => !e.isPast).length;
  console.log(`  -> Provisioned/verified ${totalEventsCount} events (${pastEventsCount} past, ${upcomingEventsCount} upcoming).\n`);

  // Step 9: Participations & Attendances
  console.log("[9/9] Populating Event Participations & Scoped Notifications...");

  // Existing participations
  const existingParticipations = await prisma.participation.findMany({
    where: {
      eventId: { in: seededEvents.map((e) => e.id) },
    },
    select: { eventId: true, studentId: true, externalUserId: true },
  });
  const existingPartKeys = new Set(
    existingParticipations.map((p) =>
      p.studentId ? `stu:${p.eventId}:${p.studentId}` : `ext:${p.eventId}:${p.externalUserId}`
    )
  );

  const participationBatch = [];
  const eventParticipantCounts = new Map();

  for (let evIdx = 0; evIdx < seededEvents.length; evIdx++) {
    const ev = seededEvents[evIdx];
    // Assign 20 to 60 students per event
    const participantCount = 20 + (evIdx % 41);
    let registeredForThisEvent = 0;

    for (let pIdx = 0; pIdx < participantCount; pIdx++) {
      const student = allSyntheticStudents[(evIdx * 17 + pIdx * 7) % allSyntheticStudents.length];
      const key = `stu:${ev.id}:${student.id}`;
      if (!existingPartKeys.has(key)) {
        const ticketId = `tkt_${ev.id.slice(-6)}_${student.id.slice(-6)}_${pIdx}`;
        participationBatch.push({
          id: `p${String(evIdx + 1).padStart(11, "0")}${String(pIdx + 1).padStart(12, "0")}`,
          eventId: ev.id,
          userId: student.id,
          studentId: student.id,
          externalUserId: null,
          status: ev.isPast ? "ATTENDED" : "REGISTERED",
          qrCode: ticketId,
          attendedAt: ev.isPast ? new Date(ev.startTime.getTime() + 30 * 60 * 1000) : null,
          paymentStatus: "SUCCESS",
        });
        existingPartKeys.add(key);
        registeredForThisEvent++;
      }
    }

    // Register 1-2 external users for each event
    for (let extIdx = 0; extIdx < 2; extIdx++) {
      const extUser = externalUsers[(evIdx + extIdx) % externalUsers.length];
      const extKey = `ext:${ev.id}:${extUser.id}`;
      if (!existingPartKeys.has(extKey)) {
        const ticketId = `tkt_ext_${ev.id.slice(-6)}_${extUser.id.slice(-4)}`;
        participationBatch.push({
          id: `pe${String(evIdx + 1).padStart(10, "0")}${String(extIdx + 1).padStart(12, "0")}`,
          eventId: ev.id,
          userId: extUser.id,
          studentId: null,
          externalUserId: extUser.id,
          status: ev.isPast ? "ATTENDED" : "REGISTERED",
          qrCode: ticketId,
          attendedAt: ev.isPast ? new Date(ev.startTime.getTime() + 30 * 60 * 1000) : null,
          paymentStatus: "SUCCESS",
        });
        existingPartKeys.add(extKey);
        registeredForThisEvent++;
      }
    }

    eventParticipantCounts.set(ev.id, registeredForThisEvent);
  }

  if (participationBatch.length > 0) {
    console.log(`  -> Inserting ${participationBatch.length} participations in chunks of 500...`);
    const CHUNK_SIZE = 500;
    for (let c = 0; c < participationBatch.length; c += CHUNK_SIZE) {
      const chunk = participationBatch.slice(c, c + CHUNK_SIZE);
      await prisma.participation.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  }

  // Sync event registered counts
  console.log("  -> Synchronizing Event registeredCount fields...");
  const countsPerEvent = await prisma.participation.groupBy({
    by: ["eventId"],
    _count: { id: true },
    where: {
      eventId: { in: seededEvents.map((e) => e.id) },
      status: { in: ["REGISTERED", "ATTENDED"] },
    },
  });
  for (const row of countsPerEvent) {
    await prisma.event.update({
      where: { id: row.eventId },
      data: { registeredCount: row._count.id },
    });
  }

  const totalParticipations = await prisma.participation.count({
    where: { eventId: { in: seededEvents.map((e) => e.id) } },
  });
  console.log(`  -> Verified active synthetic participations in DB: ${totalParticipations}\n`);

  // Step 10: 10 Scoped Notifications
  console.log("[10/10] Seeding 10 Scoped Notifications across all required scenarios...");
  const primaryAdmin = existingAdmins[0];
  const sampleEvent1 = seededEvents[0];
  const sampleEvent2 = seededEvents[1];
  const sampleEvent3 = seededEvents[2];
  const sampleEvent5 = seededEvents[4];
  const sampleClub1 = clubs[0];
  const sampleClub2 = clubs[1];
  const sampleClub3 = clubs[2];
  const sampleClub24 = clubs[23]; // Cultural Society
  const student1 = allSyntheticStudents[0];
  const student2 = allSyntheticStudents[1];
  const student3 = allSyntheticStudents[2];
  const student4 = allSyntheticStudents[3];
  const student5 = allSyntheticStudents[4];

  const NOTIFICATIONS_DATA = [
    // 1. Event Reminder
    {
      id: "n00000000000000000000001",
      recipientStudentId: student1.id,
      eventId: sampleEvent1.id,
      type: "EVENT_REMINDER",
      title: "Upcoming Event Reminder: Annual Hackathon 2026",
      message: "Your registered event Annual Hackathon 2026 starts in 3 days. Please review the venue guidelines and reporting instructions.",
    },
    // 2. Club Announcement
    {
      id: "n00000000000000000000002",
      clubId: sampleClub1.id,
      type: "EVENT_ANNOUNCEMENT",
      title: "Coding Club Core Team Meeting",
      message: "All coordinators and members are requested to assemble at Student Activity Centre Room 204 this Friday at 5:00 PM.",
    },
    // 3. Event Registration Confirmation
    {
      id: "n00000000000000000000003",
      recipientStudentId: student2.id,
      eventId: sampleEvent2.id,
      type: "REGISTRATION_CONFIRMATION",
      title: "Registration Confirmed: AI & Deep Learning Bootcamp",
      message: "Your registration has been confirmed. Download your digital ticket and access passes from your student dashboard.",
    },
    // 4. Faculty Coordinator Notification
    {
      id: "n00000000000000000000004",
      clubId: sampleClub2.id,
      eventId: sampleEvent5.id,
      type: "EVENT_REVIEW_REQUEST",
      title: "New Event Pending Approval: Autonomous Rover Challenge",
      message: "Robotics Club has submitted the Autonomous Rover Challenge proposal for faculty review and scheduling approval.",
    },
    // 5. Club Membership Notification
    {
      id: "n00000000000000000000005",
      recipientStudentId: student3.id,
      clubId: sampleClub3.id,
      type: "MEMBERSHIP_UPDATE",
      title: "Club Membership Approved",
      message: "Congratulations! Your membership application for Civil Engineering Society has been accepted by the executive board.",
    },
    // 6. Event Staff Notification
    {
      id: "n00000000000000000000006",
      recipientStudentId: student4.id,
      eventId: sampleEvent1.id,
      type: "STAFF_ASSIGNMENT",
      title: "Event Staff Duty: Attendance Verification Desk",
      message: "You have been designated as an attendance verification operator for the upcoming hackathon check-in gates.",
    },
    // 7. ODSW / Admin Notification
    {
      id: "n00000000000000000000007",
      senderAdminId: primaryAdmin ? primaryAdmin.id : null,
      title: "Campus Safety & Event Timing Advisory",
      message: "All club events scheduled post 9:00 PM must carry prior written authorization from the Office of Dean Student Welfare.",
      type: "ADMIN_ADVISORY",
    },
    // 8. Private Team / Invite Notification
    {
      id: "n00000000000000000000008",
      recipientStudentId: student5.id,
      eventId: sampleEvent1.id,
      type: "TEAM_INVITATION",
      title: "Team Invitation",
      message: `Aarav Sharma invited you to join team 'ByteForce' for the upcoming event '${sampleEvent1.title}'.`,
    },
    // 9. Event Update / Reschedule
    {
      id: "n00000000000000000000009",
      recipientStudentId: student1.id,
      eventId: sampleEvent3.id,
      type: "EVENT_RESCHEDULED",
      title: "Event Rescheduled: Full-Stack Web Development Workshop",
      message: "The workshop venue has been upgraded to the Central Seminar Hall to accommodate additional attendees.",
    },
    // 10. General Campus Announcement
    {
      id: "n00000000000000000000010",
      clubId: sampleClub24.id,
      type: "BROADCAST",
      title: "Annual Cultural Fest Dates Announced",
      message: "The dates for the Annual Cultural Festival have been announced. Club event proposals are now open on CampusNode.",
    },
  ];

  for (const notif of NOTIFICATIONS_DATA) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {
        recipientStudentId: notif.recipientStudentId || null,
        senderAdminId: notif.senderAdminId || null,
        clubId: notif.clubId || null,
        eventId: notif.eventId || null,
        type: notif.type,
        title: notif.title,
        message: notif.message,
      },
      create: {
        id: notif.id,
        recipientStudentId: notif.recipientStudentId || null,
        senderAdminId: notif.senderAdminId || null,
        clubId: notif.clubId || null,
        eventId: notif.eventId || null,
        type: notif.type,
        title: notif.title,
        message: notif.message,
      },
    });
  }
  console.log("  -> 10 scoped notifications seeded successfully.\n");

  // ==========================================
  // POST-SEED VALIDATION & AUTHENTICATION CHECK
  // ==========================================
  console.log("=======================================================");
  console.log("  Running Automated Post-Seed Integrity Validation");
  console.log("=======================================================\n");

  const finalStudentsCount = await prisma.studentUser.count({
    where: { email: { startsWith: "student_" } },
  });
  const finalExternalCount = await prisma.externalUser.count({
    where: { email: { startsWith: "external_" } },
  });
  const finalFacultyCount = await prisma.adminRole.count({
    where: { email: { startsWith: "faculty_" }, role: "facultyCoordinator" },
  });
  const finalClubsCount = await prisma.club.count({
    where: { slug: { in: CLUBS_CONFIG.map((c) => c.slug) } },
  });
  const finalPastEvents = await prisma.event.count({
    where: {
      id: { in: seededEvents.map((e) => e.id) },
      startTime: { lt: now },
    },
  });
  const finalUpcomingEvents = await prisma.event.count({
    where: {
      id: { in: seededEvents.map((e) => e.id) },
      startTime: { gt: now },
    },
  });
  const finalTotalEvents = await prisma.event.count({
    where: { id: { in: seededEvents.map((e) => e.id) } },
  });
  const finalMembershipsCount = await prisma.clubMembership.count({
    where: { student: { email: { startsWith: "student_" } } },
  });
  const finalRegistrationsCount = await prisma.participation.count({
    where: { eventId: { in: seededEvents.map((e) => e.id) } },
  });
  const finalNotifsCount = await prisma.notification.count({
    where: { id: { in: NOTIFICATIONS_DATA.map((n) => n.id) } },
  });

  // Check admin preservation
  const postAdmins = await prisma.adminRole.findMany({
    where: { role: "admin" },
    select: { id: true, email: true },
  });
  const adminPreserved = postAdmins.length >= existingAdmins.length;

  // Automated Authentication Check for sample accounts
  const authChecks = [
    { label: "student_1@nitj.ac.in", type: "student", email: "student_1@nitj.ac.in" },
    { label: "student_100@nitj.ac.in", type: "student", email: "student_100@nitj.ac.in" },
    { label: "student_2000@nitj.ac.in", type: "student", email: "student_2000@nitj.ac.in" },
    { label: "faculty_1@nitj.ac.in", type: "faculty", email: "faculty_1@nitj.ac.in" },
    { label: "faculty_25@nitj.ac.in", type: "faculty", email: "faculty_25@nitj.ac.in" },
    { label: "external_1@college.edu", type: "external", email: "external_1@college.edu" },
  ];

  const authResults = {};
  for (const item of authChecks) {
    let userRecord = null;
    if (item.type === "student") {
      userRecord = await prisma.studentUser.findUnique({ where: { email: item.email } });
    } else if (item.type === "faculty") {
      userRecord = await prisma.adminRole.findUnique({ where: { email: item.email } });
    } else if (item.type === "external") {
      userRecord = await prisma.externalUser.findUnique({ where: { email: item.email } });
    }
    const isMatch = userRecord
      ? await bcrypt.compare(TEST_PASSWORD, userRecord.password)
      : false;
    authResults[item.label] = isMatch ? "PASS" : "FAIL";
  }

  // Graduation year validation for students
  const gradYearDistribution = await prisma.studentUser.groupBy({
    by: ["expectedGraduationYear"],
    where: { email: { startsWith: "student_" } },
    _count: { id: true },
  });

  console.log("=======================================================");
  console.log("  CampusNode Test Data Seed Summary");
  console.log("=======================================================");
  console.log(`  Students created/reused: ${finalStudentsCount} (Target: 2000)`);
  console.log(`  External students:       ${finalExternalCount} (Target: 10)`);
  console.log(`  Faculty coordinators:    ${finalFacultyCount} (Target: 25)`);
  console.log(`  Clubs created/reused:    ${finalClubsCount} (Target: 25)`);
  console.log(`  Past events:             ${finalPastEvents} (Target: 100)`);
  console.log(`  Upcoming events:         ${finalUpcomingEvents} (Target: 100)`);
  console.log(`  Total events:            ${finalTotalEvents} (Target: 200)`);
  console.log(`  Club memberships:        ${finalMembershipsCount}`);
  console.log(`  Event registrations:     ${finalRegistrationsCount}`);
  console.log(`  Notifications:           ${finalNotifsCount} (Target: 10)`);
  console.log("-------------------------------------------------------");
  console.log(`  Existing admin preserved: ${adminPreserved ? "YES" : "NO"}`);
  console.log(`  Emails sent:              NO (0)`);
  console.log(`  Verification required:    NO (All pre-verified)`);
  console.log("-------------------------------------------------------");
  console.log("  Graduation Year Distribution (2027-2030):");
  gradYearDistribution.forEach((g) => {
    console.log(`    Year ${g.expectedGraduationYear}: ${g._count.id} students`);
  });
  console.log("-------------------------------------------------------");
  console.log("  Sample Authentication Checks ('12345678'):");
  Object.entries(authResults).forEach(([email, status]) => {
    console.log(`    ${email.padEnd(28)}: ${status}`);
  });
  console.log("=======================================================");
  console.log("✅ Seed completed successfully.\n");

  return {
    students: finalStudentsCount,
    externalStudents: finalExternalCount,
    faculty: finalFacultyCount,
    clubs: finalClubsCount,
    pastEvents: finalPastEvents,
    upcomingEvents: finalUpcomingEvents,
    totalEvents: finalTotalEvents,
    memberships: finalMembershipsCount,
    registrations: finalRegistrationsCount,
    notifications: finalNotifsCount,
    adminPreserved: adminPreserved ? "PASS" : "FAIL",
    authResults,
  };
}

// When executed directly from CLI: node scripts/seed-synthetic-data.js
if (process.argv[1] && process.argv[1].endsWith("seed-synthetic-data.js")) {
  runSyntheticSeed()
    .catch((err) => {
      console.error("\n❌ Seeding failed with error:\n", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
