const fs = require("fs");
const path = require("path");
const vm = require("vm");

const extractionSource = fs.readFileSync(
  path.join(__dirname, "email-subtask-extraction.js"),
  "utf8"
);
const context = { module: {}, exports: {} };
vm.runInNewContext(extractionSource, context);

const { extractExplicitSubtasks } = context;

const cases = [
  {
    name: "user prose with folgende Aufgaben",
    input:
      "Bitte umsetzen bis zum 15.7.26 und folgende Aufgaben beachten: Count für eingehende Emailanfragen korrekt? Und: werden auch diese Aufgaben als Subtasks angelegt?",
    expected: [
      "Count für eingehende Emailanfragen korrekt",
      "werden auch diese Aufgaben als Subtasks angelegt",
    ],
  },
  {
    name: "wrapped Subtasks word must not create false subtask",
    input:
      "Bitte umsetzen bis zum 15.7.26 und folgende Aufgaben beachten: Count für eingehende Emailanfragen korrekt? Und: werden auch diese Aufgaben als\nSubtasks angelegt?",
    expected: [
      "Count für eingehende Emailanfragen korrekt",
      "werden auch diese Aufgaben als Subtasks angelegt",
    ],
  },
  {
    name: "bullet list under Subtasks header",
    input: "Subtasks:\n- Kontrast prüfen\n- Mobile testen",
    expected: ["Kontrast prüfen", "Mobile testen"],
  },
  {
    name: "standalone Subtasks angelegt line is ignored",
    input: "Subtasks angelegt?",
    expected: [],
  },
];

let failed = 0;
for (const testCase of cases) {
  const result = extractExplicitSubtasks(testCase.input).map((item) => item.value);
  const pass =
    result.length === testCase.expected.length &&
    result.every((value, index) => value === testCase.expected[index]);
  if (!pass) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error(" expected:", testCase.expected);
    console.error("   actual:", result);
  } else {
    console.log(`PASS: ${testCase.name}`);
  }
}

if (failed > 0) process.exit(1);
