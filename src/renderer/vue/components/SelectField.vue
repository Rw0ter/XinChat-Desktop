<template>
    <div ref="rootRef" class="select-field" :class="{ disabled }">
        <button
            class="select-trigger"
            type="button"
            :disabled="disabled"
            @click.stop="toggleOpen"
        >
            <span :class="{ placeholder: !displayLabel }">
                {{ displayLabel || placeholder }}
            </span>
            <span class="select-arrow">&#xE70D;</span>
        </button>
        <div v-if="isOpen" class="select-menu" @mouseleave="clearPreview" @click.stop>
            <button
                v-for="option in normalizedOptions"
                :key="option.value"
                class="select-option"
                :class="{ active: option.value === modelValue }"
                type="button"
                @mousedown.prevent="selectOption(option.value)"
                @mouseenter="setPreview(option.label)"
            >
                {{ option.label }}
            </button>
            <div v-if="!normalizedOptions.length" class="select-empty">
                暂无选项
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    options: {
        type: Array,
        default: () => []
    },
    placeholder: {
        type: String,
        default: '请选择'
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:modelValue']);
const isOpen = ref(false);
const rootRef = ref(null);
const previewLabel = ref('');

const normalizedOptions = computed(() =>
    props.options.map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
            return { label: String(item), value: item };
        }
        return { label: item.label ?? String(item.value), value: item.value };
    })
);

const selectedLabel = computed(() => {
    const match = normalizedOptions.value.find(
        (item) => item.value === props.modelValue
    );
    return match ? match.label : '';
});

const displayLabel = computed(() => {
    return previewLabel.value || selectedLabel.value;
});

const toggleOpen = () => {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
};

const close = () => {
    isOpen.value = false;
};

const selectOption = (value) => {
    emit('update:modelValue', value);
    close();
};

const setPreview = (label) => {
    previewLabel.value = label;
};

const clearPreview = () => {
    previewLabel.value = '';
};

const handleClickOutside = (event) => {
    if (!rootRef.value) return;
    if (!rootRef.value.contains(event.target)) {
        close();
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.select-field {
    position: relative;
    width: 100%;
}

.select-field.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.select-trigger {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #fff;
    padding: 10px 12px;
    font-size: 13px;
    color: #1c2436;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
}

.select-trigger:focus {
    outline: none;
    border-color: rgba(72, 147, 214, 0.5);
    box-shadow: 0 0 0 3px rgba(72, 147, 214, 0.15);
}

.select-trigger .placeholder {
    color: rgba(28, 36, 54, 0.5);
}

.select-arrow {
    font-family: "Segoe MDL2 Assets";
    font-size: 12px;
    color: #6b7280;
}

.select-menu {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 12px;
    box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
    max-height: 260px;
    overflow-y: auto;
    padding: 6px;
    z-index: 10;
}

.select-option {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    color: #1c2436;
    cursor: pointer;
}

.select-option:hover {
    background: rgba(15, 23, 42, 0.06);
}

.select-option.active {
    background: rgba(29, 78, 216, 0.12);
    color: #1d4ed8;
    font-weight: 600;
}

.select-empty {
    padding: 10px 12px;
    color: #9ca3af;
    font-size: 12px;
    text-align: center;
}
</style>
