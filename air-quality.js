(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardAirQuality = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LEVELS = [
    { label: '좋음', rank: 0 },
    { label: '보통', rank: 1 },
    { label: '나쁨', rank: 2 },
    { label: '매우나쁨', rank: 3 }
  ];

  function toValidNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function gradePm25(value) {
    const numeric = toValidNumber(value);
    if (numeric === null) return null;
    if (numeric <= 15) return LEVELS[0];
    if (numeric <= 35) return LEVELS[1];
    if (numeric <= 75) return LEVELS[2];
    return LEVELS[3];
  }

  function gradePm10(value) {
    const numeric = toValidNumber(value);
    if (numeric === null) return null;
    if (numeric <= 30) return LEVELS[0];
    if (numeric <= 80) return LEVELS[1];
    if (numeric <= 150) return LEVELS[2];
    return LEVELS[3];
  }

  function getRepresentativeLevel(pm25Level, pm10Level) {
    if (!pm25Level && !pm10Level) {
      return null;
    }
    if (!pm25Level) {
      return pm10Level;
    }
    if (!pm10Level) {
      return pm25Level;
    }
    return pm25Level.rank >= pm10Level.rank ? pm25Level : pm10Level;
  }

  function getKoreanAirQuality(pm25, pm10) {
    const pm25Level = gradePm25(pm25);
    const pm10Level = gradePm10(pm10);
    const representative = getRepresentativeLevel(pm25Level, pm10Level);

    return {
      representative: representative ? representative.label : '정보없음',
      pm25: {
        level: pm25Level ? pm25Level.label : '정보없음'
      },
      pm10: {
        level: pm10Level ? pm10Level.label : '정보없음'
      }
    };
  }

  return {
    gradePm25,
    gradePm10,
    getKoreanAirQuality
  };
});
