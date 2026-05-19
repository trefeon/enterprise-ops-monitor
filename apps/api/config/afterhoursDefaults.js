const DEFAULT_WARNING_SCHEDULE_TIMES = Object.freeze(["23:15", "23:30", "23:45", "00:00"]);

const DEFAULT_AFTERHOURS_CONFIG = Object.freeze({
  warning_schedule_times: JSON.stringify(DEFAULT_WARNING_SCHEDULE_TIMES),
  first_warning_time: DEFAULT_WARNING_SCHEDULE_TIMES[0],
  final_warning_time: DEFAULT_WARNING_SCHEDULE_TIMES[DEFAULT_WARNING_SCHEDULE_TIMES.length - 1],
});

function getDefaultWarningScheduleTimes() {
  return [...DEFAULT_WARNING_SCHEDULE_TIMES];
}

module.exports = {
  DEFAULT_AFTERHOURS_CONFIG,
  DEFAULT_WARNING_SCHEDULE_TIMES,
  getDefaultWarningScheduleTimes,
};
