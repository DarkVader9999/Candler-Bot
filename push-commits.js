
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const schedule = JSON.parse(
  fs.readFileSync("schedule.json", "utf8")
);

function git(args, env = process.env) {
  execFileSync("git", args, {
    env,
    stdio: "inherit"
  });
}

schedule.sort();

schedule.forEach((timestamp, index) => {
  fs.appendFileSync(
    "activity.txt",
    `Synthetic commit ${index + 1}: ${timestamp}\n`
  );

  git(["add", "activity.txt"]);

  git(
    ["commit", "-m", `Synthetic activity ${index + 1}`],
    {
      ...process.env,
      GIT_AUTHOR_DATE: timestamp,
      GIT_COMMITTER_DATE: timestamp
    }
  );
});

console.log(`Created ${schedule.length} commits.`);
