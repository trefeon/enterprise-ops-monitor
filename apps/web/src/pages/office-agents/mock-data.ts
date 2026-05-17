import type { AgentMachine } from './types';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPercent() {
  return Math.round(Math.random() * 100);
}

function randomMbps() {
  return Math.round(Math.random() * 1000);
}

function iso(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

const PROCESSES = [
  'chrome.exe',
  'explorer.exe',
  'python.exe',
  'node.exe',
  'msedge.exe',
  'Teams.exe',
  'Outlook.exe',
  'Code.exe',
  'Spotify.exe',
  'slack.exe',
  'docker.exe',
  'postgres.exe',
  'nginx.exe',
  'java.exe',
  'powershell.exe',
];

function randomProcesses() {
  const count = randomInt(3, 6);
  const shuffled = [...PROCESSES].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, count)
    .map((name) => ({
      name,
      cpu_percent: Math.round(Math.random() * 40 * 10) / 10,
      ram_mb: randomInt(50, 1200),
    }))
    .sort((a, b) => b.cpu_percent - a.cpu_percent);
}

function generateHeartbeats(count: number, startMinutesAgo: number): string[] {
  return Array.from({ length: count }, (_, i) => iso(startMinutesAgo + i));
}

function createMachine(
  id: string,
  hostname: string,
  label: string | null,
  cpu: number,
  ram: number,
  disk: number,
  status: 'online' | 'offline',
  lastHbMinutes: number
): AgentMachine {
  return {
    id,
    hostname,
    label,
    specs: {
      cpu_model: [
        'Intel Core i5-12400',
        'Intel Core i7-13700',
        'AMD Ryzen 5 5600',
        'Intel Core i5-13400',
        'AMD Ryzen 7 5800X',
        'Intel Core i3-12100',
      ][randomInt(0, 5)],
      ram_gb: [8, 16, 16, 32, 16, 8][randomInt(0, 5)],
      disk_gb: [256, 512, 512, 1024, 512, 256][randomInt(0, 5)],
      os: 'Windows 11 Pro',
      os_build: `10.0.22631.${randomInt(1000, 5000)}`,
    },
    metrics: {
      cpu_percent: cpu,
      ram_percent: ram,
      disk_percent: disk,
      network_up_mbps: randomMbps(),
      network_down_mbps: randomMbps(),
    },
    top_processes: randomProcesses(),
    status,
    last_heartbeat: iso(lastHbMinutes),
    heartbeat_history: generateHeartbeats(10, lastHbMinutes),
  };
}

export function generateMockMachines(): AgentMachine[] {
  return [
    createMachine('1', 'OFC-LT-001', 'Finance Lead', 23, 45, 62, 'online', 0.2),
    createMachine('2', 'OFC-LT-002', 'HR Coordinator', 78, 82, 55, 'online', 0.5),
    createMachine('3', 'OFC-LT-003', null, 91, 88, 95, 'offline', 65),
    createMachine('4', 'OFC-LT-004', 'IT Support', 15, 34, 41, 'offline', 180),
    createMachine('5', 'OFC-LT-005', 'Marketing Manager', 55, 72, 68, 'offline', 260),
    createMachine('6', 'OFC-LT-006', null, 95, 92, 88, 'offline', 1440),
  ];
}

export function rerollMetrics(machine: AgentMachine): AgentMachine {
  return {
    ...machine,
    metrics: {
      cpu_percent: randomPercent(),
      ram_percent: randomPercent(),
      disk_percent: Math.max(machine.metrics.disk_percent, randomInt(40, 95)),
      network_up_mbps: randomMbps(),
      network_down_mbps: randomMbps(),
    },
    top_processes: randomProcesses(),
    last_heartbeat: new Date().toISOString(),
    heartbeat_history: [new Date().toISOString(), ...machine.heartbeat_history.slice(0, 9)],
    status: 'online',
  };
}
