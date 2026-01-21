const peerNameEl = document.getElementById('peerName');
const statusTextEl = document.getElementById('statusText');
const micSelect = document.getElementById('micSelect');
const speakerSelect = document.getElementById('speakerSelect');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');
const hangupBtn = document.getElementById('hangupBtn');
const closeBtn = document.getElementById('closeBtn');
const remoteAudio = document.getElementById('remoteAudio');

const ICE_SERVERS = [];
const CALL_TIMEOUT_MS = 30000;
let callState = 'idle';
let mode = 'idle';
let targetUid = null;
let targetName = '未知联系人';
let incomingOffer = null;
let peer = null;
let localStream = null;
let pendingCandidates = [];
let callTimeout = null;
let statsTimer = null;

const setStatus = (text) => {
    statusTextEl.textContent = text;
};

const updateButtons = () => {
    const incoming = callState === 'incoming';
    acceptBtn.style.display = incoming ? 'inline-flex' : 'none';
    rejectBtn.style.display = incoming ? 'inline-flex' : 'none';
    const hangupVisible = callState !== 'idle';
    hangupBtn.style.display = hangupVisible ? 'inline-flex' : 'none';
    hangupBtn.textContent = callState === 'ended' ? '关闭' : '挂断';
};

const setCallState = (state) => {
    callState = state;
    if (state === 'calling') setStatus('正在呼叫...');
    if (state === 'incoming') setStatus('来电请求');
    if (state === 'connecting') setStatus('正在连接...');
    if (state === 'in_call') setStatus('通话中');
    if (state === 'ended') setStatus('通话结束');
    if (state === 'waiting') setStatus('等待来电');
    if (state === 'idle') setStatus('待机');
    if (state !== 'in_call') {
        stopStatsReporter();
    }
    updateButtons();
};

const scheduleCallTimeout = () => {
    if (callTimeout) {
        clearTimeout(callTimeout);
    }
    callTimeout = setTimeout(() => {
        if (callState === 'in_call' || callState === 'ended') return;
        setStatus('无人接听');
        endCall(true, false);
    }, CALL_TIMEOUT_MS);
};

const sendSignal = (signal) => {
    if (!targetUid) return;
    console.log('[voice] send signal', signal?.type || signal);
    window.electronAPI?.sendVoiceSignalOut?.({ targetUid, signal });
};

const normalizeCandidate = (candidate) => {
    if (!candidate) return null;
    if (typeof candidate === 'string') {
        return { candidate, sdpMid: '0', sdpMLineIndex: 0 };
    }
    const normalized = { ...candidate };
    if (!normalized.sdpMid && normalized.sdpMLineIndex == null) {
        normalized.sdpMid = '0';
        normalized.sdpMLineIndex = 0;
    }
    return normalized;
};

const buildSessionDescription = (payload, fallbackType) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
        return { type: fallbackType, sdp: payload };
    }
    if (typeof payload.sdp === 'string') {
        return { type: payload.type || fallbackType, sdp: payload.sdp };
    }
    if (payload.sdp && typeof payload.sdp.sdp === 'string') {
        return { type: payload.sdp.type || fallbackType, sdp: payload.sdp.sdp };
    }
    return null;
};

const closeWindow = () => {
    window.electronAPI?.closeVoiceCall?.();
};

const ensureRemoteAudioPlaying = () => {
    if (!remoteAudio) return;
    remoteAudio.muted = false;
    remoteAudio.volume = 1;
    const result = remoteAudio.play?.();
    if (result && typeof result.catch === 'function') {
        result.catch((error) => {
            console.log('[voice] remote play blocked', error?.message || error);
        });
    }
};

const flushPendingCandidates = async () => {
    if (!peer || !peer.remoteDescription || !pendingCandidates.length) return;
    const candidates = [...pendingCandidates];
    pendingCandidates = [];
    for (const candidate of candidates) {
        try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[voice] add queued candidate');
        } catch (error) {
            console.log('[voice] add queued candidate failed', error?.message || error);
        }
    }
};

const startStatsReporter = () => {
    if (!peer) return;
    if (statsTimer) return;
    statsTimer = setInterval(async () => {
        if (!peer) return;
        try {
            const stats = await peer.getStats();
            let selectedPair = null;
            stats.forEach((report) => {
                if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                    console.log('[voice] stats in', report.bytesReceived, report.packetsReceived);
                }
                if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                    console.log('[voice] stats out', report.bytesSent, report.packetsSent);
                }
                if (
                    report.type === 'candidate-pair' &&
                    (report.nominated || report.selected || report.state === 'succeeded')
                ) {
                    selectedPair = report;
                }
            });
            if (selectedPair) {
                console.log('[voice] candidate pair', selectedPair.state, selectedPair.localCandidateId, selectedPair.remoteCandidateId);
            }
        } catch {}
    }, 2000);
};

const stopStatsReporter = () => {
    if (!statsTimer) return;
    clearInterval(statsTimer);
    statsTimer = null;
};

const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    console.log('[voice] create peer');
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('[voice] local candidate', event.candidate.candidate);
            sendSignal({ type: 'candidate', candidate: event.candidate.toJSON?.() || event.candidate });
        }
    };
    pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        console.log('[voice] remote track', stream);
        if (!stream) return;
        remoteAudio.srcObject = stream;
        console.log('[voice] remote track settings', stream.getAudioTracks()?.[0]?.getSettings?.());
        ensureRemoteAudioPlaying();
    };
    pc.onicecandidateerror = (event) => {
        console.log('[voice] ice error', event?.errorCode, event?.errorText);
    };
    pc.onicegatheringstatechange = () => {
        console.log('[voice] ice gathering', pc.iceGatheringState);
    };
    pc.oniceconnectionstatechange = () => {
        console.log('[voice] ice state', pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
        console.log('[voice] conn state', pc.connectionState);
        if (callState !== 'in_call') {
            return;
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setStatus('连接中断');
            endCall(false, false);
        }
    };
    return pc;
};

const stopStream = () => {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
};

const endCall = (notify = true, autoClose = false) => {
    if (notify && targetUid) {
        sendSignal({ type: 'hangup' });
    }
    if (peer) {
        peer.close();
        peer = null;
    }
    stopStream();
    stopStatsReporter();
    incomingOffer = null;
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }
    setCallState('ended');
    if (autoClose) {
        setTimeout(closeWindow, 200);
    }
};

const getSelectedDevice = (selectEl) => selectEl.value || '';

const applySpeaker = async () => {
    const deviceId = getSelectedDevice(speakerSelect);
    if (!remoteAudio?.setSinkId) return;
    try {
        await remoteAudio.setSinkId(deviceId || 'default');
    } catch {}
};

const acquireMicrophone = async () => {
    const deviceId = getSelectedDevice(micSelect);
    const constraints = deviceId
        ? { audio: { deviceId: { exact: deviceId } } }
        : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getAudioTracks()[0];
    if (!track) return null;
    track.onmute = () => console.log('[voice] local track muted');
    track.onunmute = () => console.log('[voice] local track unmuted');
    track.onended = () => console.log('[voice] local track ended');
    if (peer) {
        const sender = peer.getSenders().find((item) => item.track?.kind === 'audio');
        if (sender) {
            await sender.replaceTrack(track);
        }
    }
    if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
    }
    localStream = stream;
    const localTrack = stream.getAudioTracks()[0];
    if (localTrack) {
        localTrack.enabled = true;
        console.log('[voice] local track settings', localTrack.getSettings?.());
    }
    return stream;
};

const startCall = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('当前环境不支持语音');
        return;
    }
    console.log('[voice] start call', targetUid);
    setCallState('calling');
    scheduleCallTimeout();
    peer = createPeer();
    const stream = await acquireMicrophone();
    if (!stream) {
        setStatus('麦克风不可用');
        return;
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    console.log('[voice] senders', peer.getSenders().map((s) => s.track?.kind));
    await applySpeaker();
    const offer = await peer.createOffer({ offerToReceiveAudio: true });
    await peer.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: offer.sdp });
};

const acceptCall = async () => {
    if (!incomingOffer) return;
    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('当前环境不支持语音');
        endCall(false, false);
        return;
    }
    console.log('[voice] accept call', targetUid);
    setCallState('connecting');
    peer = createPeer();
    const stream = await acquireMicrophone();
    if (!stream) {
        setStatus('麦克风不可用');
        endCall(false, false);
        return;
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    console.log('[voice] senders', peer.getSenders().map((s) => s.track?.kind));
    await applySpeaker();
    const remoteDesc = buildSessionDescription(incomingOffer, 'offer');
    if (!remoteDesc) {
        setStatus('收到的请求无效');
        endCall(false, false);
        return;
    }
    await peer.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    await flushPendingCandidates();
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendSignal({ type: 'answer', sdp: answer.sdp });
    incomingOffer = null;
    setCallState('in_call');
    ensureRemoteAudioPlaying();
    startStatsReporter();
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }
};

const rejectCall = () => {
    if (targetUid) {
        sendSignal({ type: 'hangup' });
    }
    endCall(false, false);
};

const handleSignal = async (payload) => {
    const fromUid = Number(payload?.fromUid);
    const signal = payload?.signal;
    if (!Number.isInteger(fromUid) || !signal?.type) return;
    console.log('[voice] recv signal', signal?.type, 'from', fromUid);
    if (!targetUid) {
        targetUid = fromUid;
    }
    if (signal.type === 'offer') {
        if (callState !== 'idle' && callState !== 'waiting') {
            sendSignal({ type: 'busy' });
            return;
        }
        incomingOffer = signal;
        setCallState('incoming');
        return;
    }
    if (signal.type === 'answer') {
        if (!peer) return;
        const remoteDesc = buildSessionDescription(signal, 'answer');
        if (!remoteDesc) return;
        await peer.setRemoteDescription(new RTCSessionDescription(remoteDesc));
        await flushPendingCandidates();
        setCallState('in_call');
        ensureRemoteAudioPlaying();
        startStatsReporter();
        if (callTimeout) {
            clearTimeout(callTimeout);
            callTimeout = null;
        }
        return;
    }
    if (signal.type === 'candidate') {
        if (!signal.candidate) return;
        const normalized = normalizeCandidate(signal.candidate);
        if (!normalized) return;
        if (!peer || !peer.remoteDescription) {
            pendingCandidates = [...pendingCandidates, normalized];
            console.log('[voice] queue candidate');
            return;
        }
        try {
            await peer.addIceCandidate(new RTCIceCandidate(normalized));
        } catch {}
        return;
    }
    if (signal.type === 'hangup') {
        setStatus('对方已挂断');
        endCall(false, false);
        return;
    }
    if (signal.type === 'busy') {
        setStatus('对方忙线');
        endCall(false, false);
    }
};

const populateDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const speakers = devices.filter((d) => d.kind === 'audiooutput');
        micSelect.innerHTML = '';
        speakerSelect.innerHTML = '';
    mics.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `麦克风 ${micSelect.length + 1}`;
        micSelect.appendChild(option);
        });
        speakers.forEach((device) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `扬声器 ${speakerSelect.length + 1}`;
            speakerSelect.appendChild(option);
        });
        if (!micSelect.value && mics.length) {
            micSelect.value = mics[0].deviceId;
        }
    if (!speakerSelect.value && speakers.length) {
        speakerSelect.value = speakers[0].deviceId;
    }
    await applySpeaker();
    } catch {}
};

acceptBtn.addEventListener('click', () => {
    void acceptCall();
});

rejectBtn.addEventListener('click', () => {
    rejectCall();
});

hangupBtn.addEventListener('click', () => {
    if (callState === 'ended') {
        closeWindow();
        return;
    }
    endCall(true, false);
});

closeBtn.addEventListener('click', () => {
    closeWindow();
});

micSelect.addEventListener('change', () => {
    if (callState === 'calling' || callState === 'connecting' || callState === 'in_call') {
        void acquireMicrophone();
    }
});

speakerSelect.addEventListener('change', () => {
    void applySpeaker();
});

remoteAudio.addEventListener('play', () => {
    console.log('[voice] remote audio play');
});

remoteAudio.addEventListener('pause', () => {
    console.log('[voice] remote audio pause');
});

remoteAudio.addEventListener('loadedmetadata', () => {
    console.log('[voice] remote audio metadata', remoteAudio.duration);
});

window.addEventListener('beforeunload', () => {
    endCall(true, false);
});

window.electronAPI?.onVoiceCallInit?.((payload) => {
    mode = payload?.mode || 'idle';
    targetUid = Number(payload?.targetUid) || null;
    targetName = payload?.targetName || '未知联系人';
    peerNameEl.textContent = targetName || '未知联系人';
    if (callState === 'idle') {
        setCallState(mode === 'incoming' ? 'waiting' : 'idle');
    }
    if (mode === 'caller') {
        void startCall();
    }
});

window.electronAPI?.onVoiceSignalIn?.((payload) => {
    void handleSignal(payload);
});

if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
        void populateDevices();
    });
}

void populateDevices();
setCallState('idle');
