const HEARTBEAT_TIMEOUT_MS = 45 * 1000;
const HEARTBEAT_CHECK_MS = 5 * 1000;

const lastHeartbeatAt = new Map();
const onlineState = new Map();
let statusChangeHandler = null;
let timeoutHandler = null;
let heartbeatTimer = null;

const setStatusChangeHandler = (handler) => {
  statusChangeHandler = typeof handler === 'function' ? handler : null;
};

const setTimeoutHandler = (handler) => {
  timeoutHandler = typeof handler === 'function' ? handler : null;
};

const touchHeartbeat = (uid) => {
  if (!Number.isInteger(uid)) return false;
  lastHeartbeatAt.set(uid, Date.now());
  if (onlineState.get(uid) !== true) {
    onlineState.set(uid, true);
    if (statusChangeHandler) {
      statusChangeHandler(uid, true);
    }
    return true;
  }
  return false;
};

const markDisconnected = (uid) => {
  if (!Number.isInteger(uid)) return;
  lastHeartbeatAt.delete(uid);
  if (onlineState.get(uid) !== false) {
    onlineState.set(uid, false);
    if (statusChangeHandler) {
      statusChangeHandler(uid, false);
    }
  }
};

const isUserOnline = (user) => {
  if (!user || !Number.isInteger(user.uid)) return false;
  if (onlineState.has(user.uid)) {
    return onlineState.get(user.uid) === true;
  }
  return user.online === true;
};

const startHeartbeatMonitor = () => {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
    for (const [uid, ts] of lastHeartbeatAt.entries()) {
      if (ts < cutoff) {
        lastHeartbeatAt.delete(uid);
        if (onlineState.get(uid) !== false) {
          onlineState.set(uid, false);
          if (statusChangeHandler) {
            statusChangeHandler(uid, false);
          }
        }
        if (timeoutHandler) {
          timeoutHandler(uid);
        }
      }
    }
  }, HEARTBEAT_CHECK_MS);
};

const stopHeartbeatMonitor = () => {
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

export {
  HEARTBEAT_TIMEOUT_MS,
  setStatusChangeHandler,
  setTimeoutHandler,
  touchHeartbeat,
  markDisconnected,
  isUserOnline,
  startHeartbeatMonitor,
  stopHeartbeatMonitor,
};
