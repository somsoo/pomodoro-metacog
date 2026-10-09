// ==========================================================================
// 메타인지 딥워크 로그 스토리지 관리자
// ==========================================================================
const MetacogStorage = (function () {
  const STORAGE_KEY = 'pomodoro_metacog_sessions_v1';

  function getAllSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load sessions:', e);
      return [];
    }
  }

  function saveSession(session) {
    try {
      const list = getAllSessions();
      list.unshift(session); // 최신 세션이 맨 앞
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    } catch (e) {
      console.error('Failed to save session:', e);
      return [];
    }
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function getTodayDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTodayStats() {
    const list = getAllSessions();
    const today = getTodayDateString();
    const todaySessions = list.filter(s => s.dateStr === today);

    const totalMinutes = todaySessions.reduce((acc, cur) => acc + (cur.durationMin || 0), 0);
    const count = todaySessions.length;
    const totalRating = todaySessions.reduce((acc, cur) => acc + (cur.rating || 0), 0);
    const avgRating = count > 0 ? (totalRating / count).toFixed(1) : '0.0';

    return {
      today,
      totalMinutes,
      count,
      avgRating,
      todaySessions
    };
  }

  function getDistractionStats() {
    const list = getAllSessions();
    const counts = {};
    let totalTags = 0;

    list.forEach(s => {
      if (Array.isArray(s.distractions)) {
        s.distractions.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
          totalTags++;
        });
      }
    });

    const sorted = Object.entries(counts).map(([tag, count]) => ({
      tag,
      count,
      percent: totalTags > 0 ? Math.round((count / totalTags) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    return { sorted, totalTags };
  }

  async function ensurePersistedStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
    }
  }

  function exportJson() {
    const list = getAllSessions();
    const backupData = {
      schemaVersion: "1.0.0",
      appIdentifier: "pomodoro-metacog",
      exportedAt: new Date().toISOString(),
      payload: {
        sessions: list
      }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = getTodayDateString();
    a.href = url;
    a.download = `pomodoro_flow_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJson(jsonObj) {
    let importedList = [];
    if (jsonObj && jsonObj.payload && Array.isArray(jsonObj.payload.sessions)) {
      importedList = jsonObj.payload.sessions;
    } else if (Array.isArray(jsonObj)) {
      importedList = jsonObj;
    } else {
      throw new Error("유효하지 않은 백업 파일 형식입니다.");
    }

    const existing = getAllSessions();
    const existingIds = new Set(existing.map(s => s.id));
    const merged = [...existing];
    let newCount = 0;

    importedList.forEach(item => {
      if (!existingIds.has(item.id)) {
        merged.push(item);
        newCount++;
      }
    });

    merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return { total: merged.length, added: newCount };
  }

  return {
    getAllSessions,
    saveSession,
    clearHistory,
    getTodayStats,
    getDistractionStats,
    getTodayDateString,
    ensurePersistedStorage,
    exportJson,
    importJson
  };
})();

