const img = document.getElementById('previewImage');
const shell = document.querySelector('.preview-shell');
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.1;

const applyTransform = () => {
    if (!img) return;
    img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    img.style.cursor = scale > 1 ? 'grab' : 'default';
};

const setImage = (url) => {
    if (!img || !url) return;
    img.src = url;
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransform();
};

window.electronAPI?.onImagePreview?.((url) => {
    setImage(url);
});

document.addEventListener('dblclick', () => {
    window.close();
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

shell?.addEventListener(
    'wheel',
    (event) => {
        if (!img) return;
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        const next = scale + direction * ZOOM_STEP;
        scale = clamp(next, MIN_SCALE, MAX_SCALE);
        if (scale <= 1) {
            offsetX = 0;
            offsetY = 0;
        }
        applyTransform();
    },
    { passive: false }
);

shell?.addEventListener('mousedown', (event) => {
    if (!img || scale <= 1) return;
    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartOffsetX = offsetX;
    dragStartOffsetY = offsetY;
    img.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    offsetX = dragStartOffsetX + deltaX;
    offsetY = dragStartOffsetY + deltaY;
    applyTransform();
});

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    applyTransform();
});
