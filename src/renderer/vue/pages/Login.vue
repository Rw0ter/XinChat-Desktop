<template>
    <div class="login-root">
        <div class="bg" aria-hidden="true">
            <div class="circle1"></div>
            <div class="circle2"></div>
            <div class="circle3"></div>
        </div>

        <div id="titlebar">
            <div id="title"></div>
            <div id="window-controls">
                <button class="wc-btn" id="btn-min" title="最小化" @click="handleMin">
                    <span class="wc-icon">&#xE921;</span>
                </button>
                <button class="wc-btn" id="btn-max" title="最大化" @click="handleMax">
                    <span class="wc-icon">&#xE922;</span>
                </button>
                <button class="wc-btn close" id="btn-close" title="关闭" @click="handleClose">
                    <span class="wc-icon">&#xE8BB;</span>
                </button>
            </div>
        </div>

        <div class="card">
            <h2>QQ</h2>
            <img class="user-image" src="/img/user.jpg" alt="用户头像" />
            <p id="UserName">Rw0ter.NT</p>

            <div class="mode-toggle">
                <button
                    type="button"
                    class="mode-btn"
                    :class="{ active: mode === 'login' }"
                    @click="mode = 'login'"
                >
                    登录
                </button>
                <button
                    type="button"
                    class="mode-btn"
                    :class="{ active: mode === 'register' }"
                    @click="mode = 'register'"
                >
                    注册
                </button>
            </div>

            <div class="form">
                <input v-model.trim="form.username" type="text" placeholder="用户名" />
                <input v-model.trim="form.password" type="password" placeholder="密码" />
                <input
                    v-if="mode === 'register'"
                    v-model.trim="form.confirmPassword"
                    type="password"
                    placeholder="确认密码"
                />
            </div>

            <button class="submit-btn" type="button" @click="handleSubmit">
                {{ mode === 'login' ? '登录' : '注册' }}
            </button>

            <p class="note" v-if="message">{{ message }}</p>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref } from 'vue';

const mode = ref('login');
const message = ref('');
const form = reactive({
    username: '',
    password: '',
    confirmPassword: ''
});

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();

const handleSubmit = async () => {
    message.value = '';

    if (!form.username || !form.password) {
        message.value = '请输入用户名和密码。';
        return;
    }

    if (mode.value === 'register' && form.password !== form.confirmPassword) {
        message.value = '两次输入的密码不一致。';
        return;
    }

    try {
        if (mode.value === 'register') {
            const result = await window.electronAPI?.authRegister?.({
                username: form.username,
                password: form.password
            });
            message.value = result?.message || '注册成功，请登录。';
            if (result?.success) {
                mode.value = 'login';
                form.confirmPassword = '';
            }
            return;
        }

        const result = await window.electronAPI?.authLogin?.({
            username: form.username,
            password: form.password
        });

        if (result?.success) {
            await window.electronAPI?.loginSuccess?.();
            return;
        }

        message.value = result?.message || '登录失败，请重试。';
    } catch (error) {
        message.value = '操作失败，请稍后重试。';
    }
};
</script>

<style scoped>
:global(:root) {
    --titlebar-h: 36px;
    --titlebar-bg: rgba(16, 18, 28, 0.45);
    --glass-blur: 14px;
    --glass-border: rgba(255, 255, 255, 0.14);
}

:global(html, body) {
    height: 100%;
    margin: 0;
}

:global(body) {
    font-family: Arial, Helvetica, sans-serif;
    background: #070a12;
    color: #e6eef8;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
    position: relative;
}

.login-root {
    position: relative;
    width: 100%;
    height: 100%;
}

.bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
}

.bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
        radial-gradient(80% 60% at 50% 30%, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0) 60%),
        linear-gradient(127deg, rgba(246, 183, 198, 0.18), rgba(124, 72, 194, 0.18), rgba(206, 98, 188, 0.18));
    opacity: 0.9;
}

@keyframes circle1Path {
    0% {
        transform: translate(0vw, 0vh);
        width: 30vw;
        height: 30vw;
    }

    100% {
        transform: translate(0vw, -35vh);
        width: 80vw;
        height: 80vw;
    }
}

@keyframes circle2Path {
    0% {
        transform: translate(0vw, 0vh);
        width: 20vw;
        height: 20vw;
    }

    100% {
        transform: translate(-45vw, -40vh);
        width: 80vw;
        height: 80vw;
    }
}

@keyframes circle3Path {
    0% {
        transform: translate(0vw, 0vh);
        width: 20vw;
        height: 20vw;
    }

    100% {
        transform: translate(-55vw, -80vh);
        width: 120vw;
        height: 120vw;
    }
}

@keyframes fadeCircleIn {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

.circle1,
.circle2,
.circle3 {
    position: absolute;
    border-radius: 100vw;
    will-change: transform, width, height, opacity;
    filter: blur(0px);
    opacity: 1;
}

.circle1 {
    left: 30vw;
    top: 35vh;
    animation: circle1Path 12s infinite alternate ease-in-out, fadeCircleIn 1332ms ease-out;
    background: radial-gradient(50% 50% at 50% 50%, rgba(12, 119, 255, 0.30) 15.62%, rgba(12, 119, 255, 0) 100%);
}

.circle2 {
    left: 20vw;
    top: 55vh;
    animation: circle2Path 11.5s infinite alternate ease-in-out, fadeCircleIn 1332ms ease-out;
    background: radial-gradient(50% 50% at 50% 50%, rgba(0, 56, 255, 0.30) 15.62%, rgba(12, 119, 255, 0) 100%);
}

.circle3 {
    left: 60vw;
    top: 55vh;
    animation: circle3Path 15s infinite alternate ease-in-out, fadeCircleIn 1332ms ease-out;
    background: radial-gradient(50% 50% at 50% 50%, rgba(65, 56, 210, 0.50) 15.62%, rgba(65, 56, 210, 0) 100%);
}

.card {
    padding: 20px;
    width: 320px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 2;
    justify-content: space-around;
}

h2 {
    margin: 0 0 12px 0;
    font-weight: 600;
}

input {
    width: 100%;
    padding: 8px 10px;
    margin: 8px 0;
    border-radius: 4px;
    border: 1px solid #203044;
    background: #071018;
    color: #e6eef8;
}

.submit-btn {
    width: 90%;
    padding: 10px;
    border-radius: 12px;
    border: none;
    background: #2563eb;
    color: white;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 12px;
}

.note {
    margin-top: 10px;
    font-size: 12px;
    color: #9fb3d4;
    text-align: center;
}

#titlebar {
    position: fixed;
    inset: 0 0 auto 0;
    height: var(--titlebar-h);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    display: flex;
    align-items: center;
    justify-content: space-between;
    -webkit-app-region: drag;
    user-select: none;
    z-index: 1000;
}

#title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 10px;
    font-size: 12px;
}

#window-controls {
    display: flex;
    -webkit-app-region: no-drag;
}

.wc-btn {
    width: 46px;
    height: var(--titlebar-h);
    background: transparent;
    border: none;
    color: #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    border-radius: 0px;
}

.wc-btn:hover {
    background: rgba(255, 255, 255, 0.08);
}

.wc-btn.close:hover {
    background: #c42b1c;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 8px;
}

.user-image {
    border-radius: 50%;
    border: 3px solid #ffffff;
    width: 90px;
    height: 90px;
    margin-top: 11vh;
}

#UserName {
    font-size: 21px;
    font-weight: 700;
    margin-bottom: 6vh;
    margin-top: 3vh;
}

.mode-toggle {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-bottom: 6px;
}

.mode-btn {
    flex: 1;
    padding: 6px 0;
    border-radius: 12px;
    border: 1px solid #203044;
    background: transparent;
    color: #9fb3d4;
    cursor: pointer;
    font-size: 12px;
}

.mode-btn.active {
    background: rgba(37, 99, 235, 0.2);
    color: #e6eef8;
    border-color: rgba(37, 99, 235, 0.5);
}

.form {
    width: 100%;
}
</style>
