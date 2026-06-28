import { execSync } from "node:child_process";

const port = process.env.PORT || "3001";
const isWindows = process.platform === "win32";

/**
 * @param {string} pid
 */
function killPid(pid) {
  if (isWindows) {
    execSync(`cmd.exe /c taskkill /PID ${pid} /F`, { stdio: "pipe" });
    return;
  }
  execSync(`kill -9 ${pid}`, { stdio: "pipe" });
}

/**
 * PIDs listening on the backend port.
 * @returns {string[]}
 */
function getPortPids() {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: "utf8" });
    return [
      ...new Set(
        out
          .split("\n")
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      ),
    ];
  } catch {
    return [];
  }
}

/**
 * node --watch parent + child for this backend (Windows).
 * @returns {string[]}
 */
function getBackendNodePids() {
  if (!isWindows) return [];
  const ps =
    "Get-CimInstance Win32_Process | Where-Object { " +
    "$_.Name -eq 'node.exe' -and $_.CommandLine -match 'backend.*server\\.js' " +
    "} | Select-Object -ExpandProperty ProcessId";
  try {
    const out = execSync(`powershell -NoProfile -Command "${ps}"`, {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter((pid) => /^\d+$/.test(pid));
  } catch {
    return [];
  }
}

const pids = [...new Set([...getPortPids(), ...getBackendNodePids()])];

if (!pids.length) {
  console.log(`Port ${port} ist bereits frei.`);
  process.exit(0);
}

let killed = 0;
for (const pid of pids) {
  try {
    killPid(pid);
    console.log(`Prozess ${pid} beendet.`);
    killed += 1;
  } catch {
    console.warn(`Prozess ${pid} war bereits beendet.`);
  }
}

if (!getPortPids().length) {
  console.log(`Port ${port} ist frei.`);
} else if (killed) {
  console.error(`Port ${port} ist noch belegt — Terminal mit npm run dev schließen.`);
  process.exit(1);
}
