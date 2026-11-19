
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  startDate: "2020-04-02",
  endDate: "2026-11-19",

  // Set true to create actual local Git commits
  createCommits: false,

  // Reproducible random schedule
  seed: 20200402,

  // Weekly activity
  normalDaysPerWeek: [4, 5],
  summerDaysPerWeek: [2, 3],

  // Probability of a low-activity week
  normalBreakChance: 0.035,
  summerBreakChance: 0.12,

  // Summer months: June, July, August
  summerMonths: [5, 6, 7],

  // Commit count ranges
  lightCommits: [1, 2],
  normalCommits: [3, 5],
  heavyCommits: [6, 10],

  // Daily time range (UTC)
  startHour: 9,
  endHour: 22
};

// ========================================
// RANDOM NUMBER GENERATOR
// ========================================

let seed = CONFIG.seed;

function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// ========================================
// ACTIVITY RULES
// ========================================

function isSummer(date) {
  return CONFIG.summerMonths.includes(
    date.getUTCMonth()
  );
}

function getDailyCommitCount() {
  const roll = random();

  if (roll < 0.35) {
    return randomInt(...CONFIG.lightCommits);
  }

  if (roll < 0.85) {
    return randomInt(...CONFIG.normalCommits);
  }

  return randomInt(...CONFIG.heavyCommits);
}

function getRandomTimestamp(date) {
  const timestamp = new Date(date);

  timestamp.setUTCHours(
    randomInt(CONFIG.startHour, CONFIG.endHour),
    randomInt(0, 59),
    randomInt(0, 59),
    0
  );

  return timestamp.toISOString();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i);

    [array[i], array[j]] = [
      array[j],
      array[i]
    ];
  }

  return array;
}

// ========================================
// GENERATE SCHEDULE
// ========================================

function generateSchedule() {
  const start = new Date(
    `${CONFIG.startDate}T00:00:00Z`
  );

  const end = new Date(
    `${CONFIG.endDate}T23:59:59Z`
  );

  const schedule = [];

  for (
    let week = new Date(start);
    week <= end;
    week.setUTCDate(week.getUTCDate() + 7)
  ) {
    const summer = isSummer(week);

    const breakChance = summer
      ? CONFIG.summerBreakChance
      : CONFIG.normalBreakChance;

    const breakWeek = random() < breakChance;

    let activeDays;

    if (breakWeek) {
      activeDays = randomInt(0, 1);
    } else if (summer) {
      activeDays = randomInt(
        ...CONFIG.summerDaysPerWeek
      );
    } else {
      activeDays = randomInt(
        ...CONFIG.normalDaysPerWeek
      );
    }

    const days = shuffle([0, 1, 2, 3, 4, 5, 6])
      .slice(0, activeDays)
      .sort((a, b) => a - b);

    for (const offset of days) {
      const date = new Date(week);

      date.setUTCDate(
        date.getUTCDate() + offset
      );

      if (date < start || date > end) {
        continue;
      }

      let commitCount = getDailyCommitCount();

      // Reduced summer activity
      if (summer) {
        commitCount = Math.max(
          1,
          Math.ceil(commitCount * 0.55)
        );
      }

      for (let i = 0; i < commitCount; i++) {
        schedule.push(
          getRandomTimestamp(date)
        );
      }
    }
  }

  return schedule.sort();
}

// ========================================
// CREATE LOCAL GIT COMMITS
// ========================================

function createGitCommits(schedule) {
  schedule.forEach((timestamp, index) => {
    const content =
      `Synthetic activity ${index + 1}: ${timestamp}\n`;

    fs.appendFileSync(
      "activity.txt",
      content
    );

    execFileSync(
      "git",
      ["add", "activity.txt"]
    );

    execFileSync(
      "git",
      [
        "commit",
        "-m",
        `Synthetic activity ${index + 1}`
      ],
      {
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: timestamp,
          GIT_COMMITTER_DATE: timestamp
        },
        stdio: "ignore"
      }
    );

    if ((index + 1) % 100 === 0) {
      console.log(
        `Created ${index + 1}/${schedule.length} commits`
      );
    }
  });
}

// ========================================
// MAIN
// ========================================

function main() {
  const schedule = generateSchedule();

  fs.writeFileSync(
    "schedule.json",
    JSON.stringify(schedule, null, 2)
  );

  const uniqueDays = new Set(
    schedule.map(date => date.slice(0, 10))
  ).size;

  console.log("================================");
  console.log("SYNTHETIC GITHUB ACTIVITY");
  console.log("================================");
  console.log(`Start: ${CONFIG.startDate}`);
  console.log(`End: ${CONFIG.endDate}`);
  console.log(`Total commits: ${schedule.length}`);
  console.log(`Active days: ${uniqueDays.size ?? uniqueDays}`);
  console.log("Schedule saved to schedule.json");

  if (CONFIG.createCommits) {
    createGitCommits(schedule);
    console.log("Git commits created successfully.");
  } else {
    console.log(
      "Preview mode: no Git commits created."
    );
  }
}

main();
