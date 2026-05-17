const WIB_TZ = 'Asia/Jakarta';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const getWibNowParts = () => {
  const date = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour = Number.parseInt(map.hour || '0', 10);
  const minute = Number.parseInt(map.minute || '0', 10);
  const second = Number.parseInt(map.second || '0', 10);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
  };
};

// EOD window starts at 19:30 WIB.
export const isWithinEodWindowNow = () => {
  const { hour, minute } = getWibNowParts();
  return hour > 19 || (hour === 19 && minute >= 30);
};

export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_FORMATTER.format(date);
};

export const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return TIME_FORMATTER.format(date);
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATETIME_FORMATTER.format(date);
};

export const getWibParts = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return {
    year: Number.parseInt(map.year || '0', 10),
    month: Number.parseInt(map.month || '0', 10),
    day: Number.parseInt(map.day || '0', 10),
    hour: Number.parseInt(map.hour || '0', 10),
    minute: Number.parseInt(map.minute || '0', 10),
    second: Number.parseInt(map.second || '0', 10),
  };
};

export const getWibToday = () => {
  const date = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
};
