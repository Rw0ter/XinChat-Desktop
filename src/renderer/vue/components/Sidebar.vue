<template>
    <div id="leftCard">
        <a v-for="tab in store.tabs" :key="tab.id" href="#" :class="{ active: store.activeTab === tab.id }"
            @click.prevent="store.switchTab(tab.id)">
            <span class="tab-icon" v-html="tab.icon"></span>
            <span class="tab-text">{{ tab.label }}</span>
        </a>

        <div class="user-card">
            <img src="/img/user.jpg" alt="user" />
            <div class="userinfo">
                <div class="name">Rw0ter</div>
                <div class="mail">fbccgpt@gmail.com</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useAppStore } from '../store/app.js';

const store = useAppStore();
</script>

<style scoped>
#leftCard {
    position: fixed;
    top: var(--titlebar-h);
    left: 0;
    bottom: var(--statusbar-h);
    width: var(--sidebar-w);
    background: var(--bg-sidebar);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    padding: 6px 0;
    -webkit-app-region: no-drag;
}

#leftCard a {
    height: 36px;
    margin: 2px 8px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    font-size: 13px;
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-decoration: none;
    gap: 10px;
    transition: background-color 0.18s var(--ease), transform 0.15s var(--ease), color 0.15s;
}

#leftCard a:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(2px);
}

html[data-theme="light"] #leftCard a:hover {
    background: rgba(0, 0, 0, 0.06);
}

html[data-theme="light"] #leftCard a.active:hover {
    background: linear-gradient(135deg, rgba(0, 122, 204, 0.85), rgba(0, 160, 255, 0.85));
}


#leftCard a.active {
    background: linear-gradient(135deg, rgba(0, 122, 204, 0.85), rgba(0, 160, 255, 0.85));
    color: #fff;
    box-shadow: 0 6px 18px rgba(0, 122, 204, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    position: relative;
    padding-left: 18px;
}

#leftCard a.active::before {
    content: "";
    position: absolute;
    left: 8px;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(170, 220, 255, 0.95), rgba(255, 170, 220, 0.9));
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 20px rgba(0, 0, 0, 0.25), 0 0 18px rgba(170, 220, 255, 0.25);
    pointer-events: none;
}

.tab-icon {
    width: 18px;
    min-width: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    line-height: 1;
    opacity: 0.95;
}

#leftCard a.active .tab-icon {
    opacity: 1;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25));
}

.tab-text {
    flex: 1;
}

/* User Card */
.user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    position: fixed;
    bottom: 2vh;
    width: calc(var(--sidebar-w) - 16px);
    margin: 0 8px;
    background: rgb(190 182 240 / 32%);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

html[data-theme="light"] .user-card {
    background: rgb(255 220 249 / 80%);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(0, 0, 0, 0.05);
}

.user-card img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.userinfo {
    flex: 1;
    min-width: 0;
}

.user-card .name {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
}

.user-card .mail {
    font-size: 12px;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

html[data-theme="light"] .user-card .name {
    color: #333;
}

html[data-theme="light"] .user-card .mail {
    color: #666;
}
</style>
