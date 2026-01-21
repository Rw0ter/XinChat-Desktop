const peerNameEl = document.getElementById('peerName');
const statusTextEl = document.getElementById('statusText');
const micSelect = document.getElementById('micSelect');
const speakerSelect = document.getElementById('speakerSelect');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');
const hangupBtn = document.getElementById('hangupBtn');
const closeBtn = document.getElementById('closeBtn');
const remoteAudio = document.getElementById('remoteAudio');

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const CALL_TIMEOUT_MS = 30000;
let callState = 'idle';
let mode = 'idle';
let targetUid = null;
let targetName = 'Unknown';
let incomingOffer = null;
let peer = null;
let localStream = null;
let pendingCandidates = [];
let callTimeout = null;

const setStatus = (text) => {
    statusTextEl.textContent = text;
};

const updateButtons = () => {
    const incoming = callState === 'incoming';
    acceptBtn.style.display = incoming ? 'inline-flex' : 'none';
    rejectBtn.style.display = incoming ? 'inline-flex' : 'none';
    const hangupVisible = callState !== 'idle';
    hangupBtn.style.display = hangupVisible ? 'inline-flex' : 'none';
    hangupBtn.textContent = callState === 'ended' ? 'Close' : 'Hang up';
};

const setCallState = (state) => {
    callState = state;
    if (state === 'calling') setStatus('正在呼叫...');
    if (state === 'incoming') setStatus('来电请求');
    if (state === 'connecting') setStatus('正在连接...');
    if (state === 'in_call') setStatus('通话中');
    if (state === 'ended') setStatus('通话结束');
    if (state === 'idle') setStatus('待机');
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
    window.electronAPI?.sendVoiceSignalOut?.({ targetUid, signal });
};

const closeWindow = () => {
    window.electronAPI?.closeVoiceCall?.();
};

const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
        }
    };
    pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return;
        remoteAudio.srcObject = stream;
    };
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            endCall(false, false);
        }
    };
    if (pendingCandidates.length) {
        pendingCandidates.forEach((candidate) => {
            try {
                pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
        });
        pendingCandidates = [];
    }
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
    return stream;
};

const startCall = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('当前环境不支持语音');
        return;
    }
    setCallState('calling');
    scheduleCallTimeout();
    peer = createPeer();
    const stream = await acquireMicrophone();
    if (!stream) {
        setStatus('麦克风不可用');
        return;
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    const offer = await peer.createOffer({ offerToReceiveAudio: true });
    await peer.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: peer.localDescription });
};

const acceptCall = async () => {
    if (!incomingOffer) return;
    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('当前环境不支持语音');
        endCall(false, false);
        return;
    }
    setCallState('connecting');
    peer = createPeer();
    const stream = await acquireMicrophone();
    if (!stream) {
        setStatus('麦克风不可用');
        endCall(false, false);
        return;
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    const remoteDesc = incomingOffer.sdp || incomingOffer;
    await peer.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendSignal({ type: 'answer', sdp: peer.localDescription });
    incomingOffer = null;
    setCallState('in_call');
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
    if (!targetUid) {
        targetUid = fromUid;
    }
    if (signal.type === 'offer') {
        if (callState !== 'idle') {
            sendSignal({ type: 'busy' });
            return;
        }
        incomingOffer = signal;
        setCallState('incoming');
        return;
    }
    if (signal.type === 'answer') {
        if (!peer || !signal.sdp) return;
        await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallState('in_call');
        if (callTimeout) {
            clearTimeout(callTimeout);
            callTimeout = null;
        }
        return;
    }
    if (signal.type === 'candidate') {
        if (!signal.candidate) return;
        if (!peer) {
            pendingCandidates = [...pendingCandidates, signal.candidate];
            return;
        }
        try {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
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
            option.textContent = device.label || `Microphone ${micSelect.length + 1}`;
            micSelect.appendChild(option);
        });
        speakers.forEach((device) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Speaker ${speakerSelect.length + 1}`;
            speakerSelect.appendChild(option);
        });
        if (!micSelect.value && mics.length) {
            micSelect.value = mics[0].deviceId;
        }
        if (!speakerSelect.value && speakers.length) {
            speakerSelect.value = speakers[0].deviceId;
        }
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

window.addEventListener('beforeunload', () => {
    endCall(true, false);
});

window.electronAPI?.onVoiceCallInit?.((payload) => {
    mode = payload?.mode || 'idle';
    targetUid = Number(payload?.targetUid) || null;
    targetName = payload?.targetName || 'Unknown';
    peerNameEl.textContent = targetName || '未知联系人';
    if (callState === 'idle') {
        setCallState('idle');
    }
    if (mode === 'caller') {
        void startCall();
    } else if (mode === 'incoming' && callState === 'idle') {
        setCallState('incoming');
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
