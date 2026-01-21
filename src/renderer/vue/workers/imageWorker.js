self.onmessage = async (event) => {
    const { id, file } = event.data || {};
    if (!id || !file) return;
    try {
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
        self.postMessage({ id, hash });
    } catch (error) {
        self.postMessage({ id, error: error?.message || 'worker_failed' });
    }
};
