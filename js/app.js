// ==========================================================================
// 메타인지 포모도로 타이머 메인 애플리케이션
// 타임스탬프 델타 연산으로 백그라운드 탭에서도 1초 오차 없이 무결성 유지
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const modeButtons = document.querySelectorAll('.mode-btn');
  const timerStatusBadge = document.getElementById('timerStatusBadge');
  const timerStatusText = document.getElementById('timerStatusText');
  const dialProgress = document.getElementById('dialProgress');
  const timeDisplay = document.getElementById('timeDisplay');
  const sessionTarget = document.getElementById('sessionTarget');
  
  const btnToggleTimer = document.getElementById('btnToggleTimer');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleText = document.getElementById('toggleText');
  const btnResetTimer = document.getElementById('btnResetTimer');
  const btnSkipTimer = document.getElementById('btnSkipTimer');
  const skipText = document.getElementById('skipText');

  const btnSoundAlert = document.getElementById('btnSoundAlert');
  const btnWhiteNoise = document.getElementById('btnWhiteNoise');

  // 대시보드 통계 요소
  const statTotalMinutes = document.getElementById('statTotalMinutes');
  const statCompletedCount = document.getElementById('statCompletedCount');
  const statAvgRating = document.getElementById('statAvgRating');
  const distractionBars = document.getElementById('distractionBars');
  const sessionList = document.getElementById('sessionList');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const todayDateBadge = document.getElementById('todayDateBadge');

  // 메타인지 모달 요소
  const metacogModal = document.getElementById('metacogModal');
  const metacogForm = document.getElementById('metacogForm');
  const starRatingGroup = document.getElementById('starRatingGroup');
  const ratingDesc = document.getElementById('ratingDesc');
  const distractionTagGrid = document.getElementById('distractionTagGrid');
  const taskNoteInput = document.getElementById('taskNoteInput');
  const btnSkipMetacog = document.getElementById('btnSkipMetacog');

  // 상태 머신
  const CIRCLE_CIRCUMFERENCE = 722.56; // 2 * PI * 115
  let currentMode = 'pomodoro'; // pomodoro, deepwork, korean, math
  let state = 'IDLE'; // IDLE, WORK_RUNNING, WORK_PAUSED, BREAK_RUNNING, BREAK_PAUSED
  
  let workDurationSec = 25 * 60;
  let breakDurationSec = 5 * 60;
  let totalDurationSec = 25 * 60;
  let remainingSec = 25 * 60;

  let timerInterval = null;
  let targetTimestamp = null;
  let pauseRemainingSec = null;

  // 모달 폼 상태
  let selectedRating = 5;
  let selectedDistractions = new Set(['완전몰입(없음)']);
  const ratingDescriptions = {
    1: '1점: 집중 불가 (매우 산만함)',
    2: '2점: 잦은 이탈 (산만함)',
    3: '3점: 보통 몰입 (중간 수준)',
    4: '4점: 높은 몰입 (대부분 집중)',
    5: '5점: 완전한 몰입 (초집중 달성)'
  };

  // ------------------------------------------------------------------------
  // 1. 초기화 및 대시보드 렌더링
  // ------------------------------------------------------------------------
  function init() {
    renderDashboard();
    setupEventListeners();
    updateDisplay();
    todayDateBadge.textContent = MetacogStorage.getTodayDateString();
  }

  // ------------------------------------------------------------------------
  // 2. 모드 전환
  // ------------------------------------------------------------------------
  function setMode(btn) {
    if (state === 'WORK_RUNNING' || state === 'BREAK_RUNNING') {
      if (!confirm('타이머가 진행 중입니다. 모드를 변경하고 초기화하시겠습니까?')) {
        return;
      }
    }
    resetTimerState();

    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentMode = btn.dataset.mode;
    const workMin = parseInt(btn.dataset.work, 10);
    const breakMin = parseInt(btn.dataset.break, 10);

    workDurationSec = workMin * 60;
    breakDurationSec = breakMin * 60;
    totalDurationSec = workDurationSec;
    remainingSec = workDurationSec;

    sessionTarget.textContent = `목표: ${workMin}분 집중`;
    updateDisplay();
  }

  // ------------------------------------------------------------------------
  // 3. 타이머 코어 로직 (Timestamp Delta 무오차)
  // ------------------------------------------------------------------------
  function startWorkTimer() {
    state = 'WORK_RUNNING';
    targetTimestamp = Date.now() + remainingSec * 1000;
    
    timerStatusBadge.className = 'timer-status-badge';
    timerStatusText.textContent = '몰입 집중 세션 진행 중';
    dialProgress.classList.remove('break-mode');
    
    toggleIcon.textContent = '⏸';
    toggleText.textContent = '일시 정지';
    btnToggleTimer.className = 'action-btn btn-primary';
    skipText.textContent = '세션 완료 처리';

    SoundEngine.playStartChime();
    startTicker();
  }

  function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    pauseRemainingSec = Math.max(0, Math.round((targetTimestamp - Date.now()) / 1000));
    remainingSec = pauseRemainingSec;

    if (state === 'WORK_RUNNING') {
      state = 'WORK_PAUSED';
      timerStatusText.textContent = '몰입 세션 일시정지';
    } else if (state === 'BREAK_RUNNING') {
      state = 'BREAK_PAUSED';
      timerStatusText.textContent = '휴식 세션 일시정지';
    }

    toggleIcon.textContent = '▶';
    toggleText.textContent = '계속 하기';
    updateDisplay();
  }

  function resumeTimer() {
    if (state === 'WORK_PAUSED') {
      state = 'WORK_RUNNING';
      timerStatusText.textContent = '몰입 집중 세션 진행 중';
    } else if (state === 'BREAK_PAUSED') {
      state = 'BREAK_RUNNING';
      timerStatusText.textContent = '재충전 휴식 진행 중';
    }
    targetTimestamp = Date.now() + remainingSec * 1000;
    toggleIcon.textContent = '⏸';
    toggleText.textContent = '일시 정지';
    startTicker();
  }

  function startBreakTimer() {
    state = 'BREAK_RUNNING';
    totalDurationSec = breakDurationSec;
    remainingSec = breakDurationSec;
    targetTimestamp = Date.now() + remainingSec * 1000;

    timerStatusBadge.className = 'timer-status-badge break-mode';
    timerStatusText.textContent = '재충전 휴식 진행 중';
    dialProgress.classList.add('break-mode');

    toggleIcon.textContent = '⏸';
    toggleText.textContent = '일시 정지';
    btnToggleTimer.className = 'action-btn btn-primary break-active';
    skipText.textContent = '휴식 건너뛰기';

    const breakMin = Math.round(breakDurationSec / 60);
    sessionTarget.textContent = `휴식: ${breakMin}분 동안 쉬어가기`;

    updateDisplay();
    startTicker();
  }

  function startTicker() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.round((targetTimestamp - now) / 1000);

      if (deltaSec <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        remainingSec = 0;
        updateDisplay();
        handleSessionEnd();
      } else {
        remainingSec = deltaSec;
        updateDisplay();
      }
    }, 250); // 250ms 정밀 틱
  }

  function handleSessionEnd() {
    if (state === 'WORK_RUNNING') {
      SoundEngine.playEndChime();
      openMetacogModal();
    } else if (state === 'BREAK_RUNNING') {
      SoundEngine.playStartChime();
      alert('휴식이 종료되었습니다! 다음 집중 세션을 준비하세요.');
      resetToWorkReady();
    }
  }

  function resetTimerState() {
    clearInterval(timerInterval);
    timerInterval = null;
    state = 'IDLE';
    totalDurationSec = workDurationSec;
    remainingSec = workDurationSec;
    targetTimestamp = null;

    timerStatusBadge.className = 'timer-status-badge';
    timerStatusText.textContent = '몰입 집중 세션 대기';
    dialProgress.classList.remove('break-mode');

    toggleIcon.textContent = '▶';
    toggleText.textContent = '집중 시작';
    btnToggleTimer.className = 'action-btn btn-primary';
    skipText.textContent = '휴식 건너뛰기';
    const workMin = Math.round(workDurationSec / 60);
    sessionTarget.textContent = `목표: ${workMin}분 집중`;

    updateDisplay();
  }

  function resetToWorkReady() {
    resetTimerState();
  }

  function skipCurrentPhase() {
    if (state === 'WORK_RUNNING' || state === 'WORK_PAUSED') {
      if (confirm('현재 집중 세션을 지금 완료하고 메타인지를 기록하시겠습니까?')) {
        clearInterval(timerInterval);
        timerInterval = null;
        handleSessionEnd();
      }
    } else if (state === 'BREAK_RUNNING' || state === 'BREAK_PAUSED') {
      clearInterval(timerInterval);
      timerInterval = null;
      resetToWorkReady();
    }
  }

  // ------------------------------------------------------------------------
  // 4. 화면 디스플레이 및 SVG 다이얼 갱신
  // ------------------------------------------------------------------------
  function updateDisplay() {
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timeDisplay.textContent = timeStr;
    document.title = `${timeStr} - ${state.startsWith('BREAK') ? '휴식' : '집중'} | 메타인지 포모도로`;

    // SVG 게이지 갱신 (감소형)
    const progressFraction = totalDurationSec > 0 ? (remainingSec / totalDurationSec) : 0;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progressFraction);
    dialProgress.style.strokeDashoffset = offset;
  }

  // ------------------------------------------------------------------------
  // 5. 메타인지 모달 제어
  // ------------------------------------------------------------------------
  function openMetacogModal() {
    // 폼 초기화
    selectedRating = 5;
    selectedDistractions = new Set(['완전몰입(없음)']);
    taskNoteInput.value = '';
    renderModalStars();
    renderModalTags();
    
    if (typeof metacogModal.showModal === 'function') {
      metacogModal.showModal();
    } else {
      metacogModal.setAttribute('open', 'true');
    }
  }

  function closeMetacogModal() {
    if (typeof metacogModal.close === 'function') {
      metacogModal.close();
    } else {
      metacogModal.removeAttribute('open');
    }
  }

  function renderModalStars() {
    const starBtns = starRatingGroup.querySelectorAll('.star-btn');
    starBtns.forEach(btn => {
      const val = parseInt(btn.dataset.val, 10);
      if (val <= selectedRating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    ratingDesc.textContent = ratingDescriptions[selectedRating] || '';
  }

  function renderModalTags() {
    const tagChips = distractionTagGrid.querySelectorAll('.tag-chip');
    tagChips.forEach(chip => {
      const tag = chip.dataset.tag;
      if (selectedDistractions.has(tag)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  function submitMetacogSession(skipSave = false) {
    if (!skipSave) {
      const durationMin = Math.round(workDurationSec / 60);
      const sessionData = {
        id: 'sess_' + Date.now(),
        timestamp: Date.now(),
        dateStr: MetacogStorage.getTodayDateString(),
        mode: currentMode,
        durationMin: durationMin,
        rating: selectedRating,
        distractions: Array.from(selectedDistractions),
        note: taskNoteInput.value.trim() || '딥워크 세션 완료'
      };

      MetacogStorage.saveSession(sessionData);
      renderDashboard();
    }

    closeMetacogModal();
    startBreakTimer();
  }

  // ------------------------------------------------------------------------
  // 6. 대시보드 통계 & 세션 기록 렌더링
  // ------------------------------------------------------------------------
  function renderDashboard() {
    const todayStats = MetacogStorage.getTodayStats();
    statTotalMinutes.innerHTML = `${todayStats.totalMinutes}<span class="stat-unit">분</span>`;
    statCompletedCount.innerHTML = `${todayStats.count}<span class="stat-unit">회</span>`;
    statAvgRating.innerHTML = `${todayStats.avgRating}<span class="stat-unit">/ 5</span>`;

    // 방해요인 차트 렌더링
    const distData = MetacogStorage.getDistractionStats();
    if (distData.sorted.length === 0) {
      distractionBars.innerHTML = '<p class="empty-hint">세션을 완료하고 메타인지를 기록하면 방해요인 분석이 표시됩니다.</p>';
    } else {
      let barsHtml = '';
      distData.sorted.slice(0, 5).forEach(item => {
        barsHtml += `
          <div class="dist-bar-item">
            <span class="dist-bar-label" title="${item.tag}">${item.tag}</span>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width: ${item.percent}%"></div>
            </div>
            <span class="dist-bar-count">${item.count}회</span>
          </div>
        `;
      });
      distractionBars.innerHTML = barsHtml;
    }

    // 최근 세션 타임라인 렌더링
    const allSessions = MetacogStorage.getAllSessions();
    if (allSessions.length === 0) {
      sessionList.innerHTML = '<p class="empty-hint">아직 완료된 세션이 없습니다. 첫 타이머를 시작해보세요!</p>';
    } else {
      let listHtml = '';
      allSessions.slice(0, 10).forEach(s => {
        const timeStr = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const starStr = '★'.repeat(s.rating || 0) + '☆'.repeat(5 - (s.rating || 0));
        const tags = (s.distractions || []).map(t => `<span class="session-tag-chip">${t}</span>`).join(' ');

        listHtml += `
          <div class="session-item">
            <div class="session-left">
              <div class="session-title-line">
                <span>${s.durationMin}분 몰입</span>
                ${tags}
              </div>
              <div class="session-note">${escapeHtml(s.note || '')}</div>
            </div>
            <div class="session-right">
              <span class="session-stars" title="몰입도 ${s.rating}점">${starStr}</span>
              <span class="session-time">${timeStr}</span>
            </div>
          </div>
        `;
      });
      sessionList.innerHTML = listHtml;
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------------------
  // 7. 이벤트 리스너 바인딩
  // ------------------------------------------------------------------------
  function setupEventListeners() {
    // 모드 전환
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn));
    });

    // 시작/정지 토글
    btnToggleTimer.addEventListener('click', () => {
      if (state === 'IDLE') {
        startWorkTimer();
      } else if (state === 'WORK_RUNNING' || state === 'BREAK_RUNNING') {
        pauseTimer();
      } else if (state === 'WORK_PAUSED' || state === 'BREAK_PAUSED') {
        resumeTimer();
      }
    });

    // 초기화
    btnResetTimer.addEventListener('click', () => {
      if (state !== 'IDLE') {
        if (confirm('타이머를 초기화하시겠습니까?')) {
          resetTimerState();
        }
      }
    });

    // 스킵
    btnSkipTimer.addEventListener('click', () => {
      skipCurrentPhase();
    });

    // 사운드 토글
    btnSoundAlert.addEventListener('click', () => {
      const current = SoundEngine.isSoundEnabled();
      SoundEngine.setSoundEnabled(!current);
      if (!current) {
        btnSoundAlert.classList.add('active');
        btnSoundAlert.querySelector('.toggle-label').textContent = '알림음 켜짐';
        SoundEngine.playStartChime();
      } else {
        btnSoundAlert.classList.remove('active');
        btnSoundAlert.querySelector('.toggle-label').textContent = '알림음 꺼짐';
      }
    });

    // 백색소음 토글
    btnWhiteNoise.addEventListener('click', () => {
      const active = SoundEngine.toggleWhiteNoise();
      if (active) {
        btnWhiteNoise.classList.add('active');
        btnWhiteNoise.querySelector('.toggle-label').textContent = '몰입 노이즈 켜짐';
      } else {
        btnWhiteNoise.classList.remove('active');
        btnWhiteNoise.querySelector('.toggle-label').textContent = '몰입 노이즈 끔';
      }
    });

    // 기록 삭제
    btnClearHistory.addEventListener('click', () => {
      if (confirm('모든 딥워크 세션 기록을 삭제하시겠습니까? (되돌릴 수 없습니다)')) {
        MetacogStorage.clearHistory();
        renderDashboard();
      }
    });

    // 모달 별점 클릭
    starRatingGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.star-btn');
      if (btn) {
        selectedRating = parseInt(btn.dataset.val, 10);
        renderModalStars();
      }
    });

    // 모달 태그 클릭
    distractionTagGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.tag-chip');
      if (chip) {
        const tag = chip.dataset.tag;
        if (tag === '완전몰입(없음)') {
          selectedDistractions.clear();
          selectedDistractions.add(tag);
        } else {
          selectedDistractions.delete('완전몰입(없음)');
          if (selectedDistractions.has(tag)) {
            selectedDistractions.delete(tag);
          } else {
            selectedDistractions.add(tag);
          }
          if (selectedDistractions.size === 0) {
            selectedDistractions.add('완전몰입(없음)');
          }
        }
        renderModalTags();
      }
    });

    // 모달 제출
    metacogForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitMetacogSession(false);
    });

    // 모달 건너뛰기
    btnSkipMetacog.addEventListener('click', () => {
      submitMetacogSession(true);
    });
  }

  // 앱 시동
  init();
});
