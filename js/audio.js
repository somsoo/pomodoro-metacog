// ==========================================================================
// Web Audio API 기반 무의존성 사운드 엔진
// ==========================================================================
const SoundEngine = (function () {
  let audioCtx = null;
  let noiseNode = null;
  let noiseGain = null;
  let isSoundEnabled = true;
  let isNoiseActive = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // 세션 시작 명상 벨 (맑은 528Hz 솔페지오 톤)
  function playStartChime() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, now); // Solfeggio 528Hz (Transformation & Miracles)
      osc.frequency.exponentialRampToValueAtTime(1056, now + 1.2);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 1.8);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // 세션 완료 티베탄 차임 (풍부한 배음)
  function playEndChime() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const freqs = [432, 864, 1296]; // 432Hz 평온 배음
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        
        const volume = 0.25 / (idx + 1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 2.8);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // 부드러운 핑크 노이즈 (집중 백색소음 합성)
  function toggleWhiteNoise() {
    const ctx = getAudioContext();
    if (isNoiseActive) {
      stopWhiteNoise();
      return false;
    } else {
      startWhiteNoise(ctx);
      return true;
    }
  }

  function startWhiteNoise(ctx) {
    if (noiseNode) stopWhiteNoise();
    
    // 2초 핑크 노이즈 버퍼 생성 (부드러운 빗소리 질감)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    // 로우패스 필터로 귀에 편안하게 고주파 커트
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.0);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseNode.start();
    isNoiseActive = true;
  }

  function stopWhiteNoise() {
    if (noiseNode) {
      try {
        noiseNode.stop();
        noiseNode.disconnect();
      } catch (e) {}
      noiseNode = null;
    }
    isNoiseActive = false;
  }

  function setSoundEnabled(val) {
    isSoundEnabled = val;
  }

  return {
    playStartChime,
    playEndChime,
    toggleWhiteNoise,
    stopWhiteNoise,
    setSoundEnabled,
    isSoundEnabled: () => isSoundEnabled,
    isNoiseActive: () => isNoiseActive
  };
})();
