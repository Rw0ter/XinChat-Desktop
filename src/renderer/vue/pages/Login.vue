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
            <h2 class="top_title">信聊</h2>

            <div class="form">
                <input v-model.trim="form.username" style="margin-bottom: 9px;" type="text" placeholder="用户名/信聊号/邮箱" />
                <input v-model.trim="form.password" style="margin-top: 0px; margin-bottom: 9px;" type="password" placeholder="输入信聊密码" />
                <input
                    v-if="mode === 'register'"
                    v-model.trim="form.confirmPassword"
                    type="password"
                    placeholder="确认密码" tyle="margin-top: 0px;"
                />
            </div>

             <label class="agreement">
        <input v-model="agree" type="checkbox" />
        <span class="radio"></span>
        <span class="a-text">
          已阅读并同意
          <a href="#" draggable="false" @dragstart.prevent @click.prevent>服务协议</a>和<a href="#" draggable="false" @dragstart.prevent @click.prevent>信技隐私保护指引</a>
        </span>
      </label>

            <button class="submit-btn" type="button" @click="handleSubmit">
                {{ mode === 'login' ? '登录' : '注册' }}
            </button>

            <p class="note">{{ message }}</p>


              <!-- 底部链接 -->
      <div class="bottom-links">
        <a href="#" draggable="false" @dragstart.prevent @click.prevent>扫码登录</a>
        <span class="sep">|</span>
        <a href="#" draggable="false" @dragstart.prevent @click.prevent="toggleMode">
          {{ mode === 'login' ? '注册账号' : '返回登录' }}
        </a>
      </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { API_BASE } from '../utils/api.js';

const mode = ref('login');
const message = ref('');

const agree = ref(false);
const form = reactive({
    username: '',
    password: '',
    confirmPassword: ''
});


const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();

const toggleMode = () => {
  message.value = "";
  mode.value = mode.value === "login" ? "register" : "login";
  if (mode.value === "register") {
    form.confirmPassword = "";
  }
};

const handleSubmit = async () => {
    message.value = '';

    if (!agree.value) {
  message.value = '请先勾选同意协议。';
  return;
}


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
            const response = await fetch(`${API_BASE}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: form.username,
                    password: form.password
                })
            });
            const result = await response.json();
            message.value = result?.message || '注册成功，请登录。';
            if (response.ok && result?.success) {
                mode.value = 'login';
                form.confirmPassword = '';
            }
            return;
        }

        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: form.username,
                password: form.password
            })
        });
        const result = await response.json();

        if (response.ok && result?.success) {
            if (result?.token) {
                await window.electronAPI?.setAuthToken?.({
                    token: result.token,
                    tokenExpiresAt: result.tokenExpiresAt,
                    uid: result.uid,
                    username: form.username,
                    nickname: result.nickname,
                    signature: result.signature,
                    gender: result.gender,
                    birthday: result.birthday,
                    country: result.country,
                    province: result.province,
                    region: result.region
                });
                try {
                    localStorage.setItem('vp_username', form.username);
                    if (typeof result.nickname === 'string') {
                        localStorage.setItem('vp_nickname', result.nickname);
                    }
                    if (typeof result.signature === 'string') {
                        localStorage.setItem('vp_signature', result.signature);
                    }
                } catch {}
            }
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
.login-root a {
    text-decoration: none;
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


.top_title {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 24px;
    position: fixed;
    top: 55px;
    text-align: center;
    user-select: none;
}

.card {
    padding: 20px;
    padding-top: 90px;
    width: 320px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 2;
    justify-content: space-around;
    user-select: none;
}

h2 {
    margin: 0 0 12px 0;
    font-weight: 600;
}

input::placeholder{
    color: rgb(168, 168, 168);
    text-align: center;
    font-size: 16px;
}
input:focus::placeholder{
    color: transparent;
}


input {
    outline: none;
    width: 240px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid #203044;
    background: #ffffff1a;
    color: #ffffff;
    padding: 5px;
border-radius: 8px;
margin-left: 20px;
margin-bottom: 20px;
text-align: center;
font-size: 20px;
padding-left: 20px;
padding-right: 20px;
    user-select: text;
}

.submit-btn {
    width: 80vw;
    padding: 10px;
    border-radius: 12px;
    border: none;
    background: #2563eb;
    color: white;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 22px;
    user-select: none;
}

.note{
  margin-top: 10px;
  font-size: 12px;
  color: #9fb3d4;
  text-align: center;

  min-height: 20px;
  user-select: none;
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

.agreement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  user-select: none;
  cursor: pointer;
}
.agreement input {
  display: none;
}
.radio {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1.8px solid rgba(255, 255, 255, 0.35);
  position: relative;
  flex: 0 0 auto;
}
.agreement input:checked + .radio {
  border-color: #2f7cff;
}
.agreement input:checked + .radio::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  background: #2f7cff;
}

.a-text a {
  color: #64a8ff;
  text-decoration: none;
}
.a-text a:hover {
  text-decoration: underline;
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

/* 底部 “扫码登录 | 注册账号” */
.bottom-links {
    position: fixed;
    bottom: 15px;
    left: 93px;
  text-align: center;
  font-size: 14px;
  user-select: none;
}
.bottom-links a {
  color: #64a8ff;
  text-decoration: none;
  font-weight: 600;
}
.bottom-links a:hover {
  text-decoration: underline;
}

.sep {
  margin: 0 10px;
  color: rgba(255, 255, 255, 0.35);
}

.form {
    width: 100%;
}
</style>
