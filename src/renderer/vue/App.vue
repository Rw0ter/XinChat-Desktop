<template>
    <div class="app-shell" :class="{ 'app-enter': isReady }">
        <header class="topbar">
            <div class="brand">
                <div class="brand-mark">R</div>
                <div>
                    <div class="brand-title">信聊 · dgitc</div>
                    <div class="brand-sub">即时消息 · 简约工作流</div>
                </div>
            </div>
            <div class="topbar-center">
                <div class="status-pill">{{ statusText }}</div>
            </div>

            <div class="topbar-right">
                <div class="topbar-right-controls">
                    <div class="topbar-right-spacer"></div>
                    <div class="user-card-wrap">
                        <div class="user-card" @mouseenter="showProfile" @mouseleave="scheduleHideProfile">
                            <div class="user-avatar user-avatar-trigger" @mouseenter="showProfile">
                                <img v-if="auth.avatar" :src="auth.avatar" alt="avatar" />
                                <span v-else>{{ initials }}</span>
                            </div>
                            <div class="user-meta">
                                <div class="user-name">{{ displayName }}</div>
                                <div class="user-id">UID {{ auth.uid || '---' }}</div>
                            </div>
                        </div>
                        <div class="profile-popover" :class="{ 'is-visible': isProfileVisible }"
                            @mouseenter="showProfile" @mouseleave="hideProfile">
                            <div class="profile-head">
                                <div class="profile-avatar">
                                    <img v-if="auth.avatar" :src="auth.avatar" alt="avatar" />
                                    <span v-else>{{ initials }}</span>
                                </div>
                                <div class="profile-meta">
                                    <div class="profile-name">{{ displayName }}</div>
                                    <div class="profile-uid">UID {{ auth.uid || '---' }}</div>
                                    <div class="profile-signature">{{ signature }}</div>
                                    <div class="profile-details">
                                        <div class="profile-detail">性别：{{ auth.gender || '未设置' }}</div>
                                        <div class="profile-detail">生日：{{ auth.birthday || '未设置' }}</div>
                                        <div class="profile-detail">
                                            城市：{{ auth.country || '未设置' }}{{ auth.province ? ` / ${auth.province}` : ''
                                            }}{{ auth.region ? ` / ${auth.region}` : '' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="profile-actions">
                                <button class="profile-btn" type="button" @click="openEditProfile">编辑资料</button>
                                <button class="profile-btn ghost" type="button" @click="handleLogout">
                                    退出登录
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="window-controls">
                        <button class="wc-btn" @click="handleMin" title="最小化">
                            <span class="wc-icon">&#xE921;</span>
                        </button>
                        <button class="wc-btn" @click="handleMax" title="最大化">
                            <span class="wc-icon">&#xE922;</span>
                        </button>
                        <button class="wc-btn close" @click="handleClose" title="关闭">
                            <span class="wc-icon">&#xE8BB;</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <main class="layout">
            <aside class="icon-rail">
                <div class="rail-section">
                    <button class="rail-btn" :class="{ active: activeView === 'chat' }" title="消息"
                        @click="activeView = 'chat'">
                        <span class="rail-icon">&#xE8BD;</span>
                        <span v-if="totalUnread" class="rail-badge">{{ formatUnread(totalUnread) }}</span>
                    </button>
                    <button class="rail-btn" :class="{ active: activeView === 'contacts' }" title="联系人"
                        @click="openContacts">
                        <span class="rail-icon">&#xE77B;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="收藏">
                        <span class="rail-icon">&#xE734;</span>
                    </button>
                    <button class="rail-btn" title="探索">
                        <span class="rail-icon">&#xE80F;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="笔记">
                        <span class="rail-icon">&#xE8A5;</span>
                    </button>
                </div>
                <div class="rail-section rail-bottom">
                    <button class="rail-btn" title="邮箱">
                        <span class="rail-icon">&#xE715;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="设置">
                        <span class="rail-icon">&#xE713;</span>
                    </button>
                    <button class="rail-btn" title="菜单">
                        <span class="rail-icon">&#xE700;</span>
                    </button>
                </div>
            </aside>
            <aside class="sidebar">
                <div v-if="activeView === 'chat'" class="chat-sidebar">
                    <div class="search">
                        <div class="serach_input_box">
                            <input v-model="searchText" class="serach_input" type="text" placeholder="搜索联系人或群组" />
                            <div class="add_friend_icon" @click="openFoundFriend">+</div>
                        </div>

                        <div class="search-hint">好友 {{ filteredFriends.length }}</div>
                    </div>
                    <div class="list">
                        <div class="section-title">私聊列表</div>
                        <button v-for="friend in filteredFriends" :key="friend.uid" class="list-item"
                            :class="{ active: activeFriend?.uid === friend.uid, pinned: isPinned(friend.uid) }"
                            @click="selectFriend(friend)" @contextmenu.prevent="openListMenu(friend, $event)">
                            <div class="avatar">
                                <img v-if="friend.avatar" :src="friend.avatar" alt="avatar" />
                                <span v-else>{{ friend.username?.slice(0, 2).toUpperCase() }}</span>
                            </div>
                            <div class="list-meta">
                                <div class="list-name">{{ friend.username }}</div>
                                <div class="list-sub">UID {{ friend.uid }}</div>
                            </div>
                            <div class="list-badges">
                                <span v-if="isMuted(friend.uid)" class="list-badge mute">免打扰</span>
                                <span v-if="isUnread(friend.uid)" class="list-unread-dot"></span>
                            </div>
                        </button>
                        <div v-if="!filteredFriends.length" class="empty-state">
                            暂无好友，请先添加好友。
                        </div>
                    </div>
                </div>

                <div v-else class="contacts-sidebar">
                    <div class="contacts-search">
                        <div class="contacts-search-box">
                            <span class="search-icon">&#128269;</span>
                            <input type="text" placeholder="搜索" />
                        </div>
                        <button class="friend-manager-btn" @click="openFoundFriend">
                            <span class="manager-icon">&#xE77B;</span>
                            好友管理器
                        </button>
                    </div>
                    <div class="contacts-section">
                        <button class="contacts-item" :class="{ active: contactsNoticeType === 'friend' }"
                            @click="contactsNoticeType = 'friend'">
                            <span>好友通知</span>
                            <span class="chev">&#xE76C;</span>
                        </button>
                        <button class="contacts-item" :class="{ active: contactsNoticeType === 'group' }"
                            @click="contactsNoticeType = 'group'">
                            <span>群通知</span>
                            <span class="badge">2</span>
                            <span class="chev">&#xE76C;</span>
                        </button>
                    </div>
                    <div class="contacts-tabs">
                        <button class="contacts-tab active">好友</button>
                        <button class="contacts-tab">群聊</button>
                    </div>
                    <div class="contacts-list">
                        <div v-for="group in contactGroups" :key="group.key" class="contacts-group">
                            <button class="contacts-row contacts-group-header" type="button"
                                @click="toggleContactGroup(group.key)">
                                <span class="contacts-group-title">{{ group.label }}</span>
                                <span class="contacts-group-meta">
                                    <span class="count">{{ groupCountText(group) }}</span>
                                    <span class="chev" :class="{ open: isContactGroupOpen(group.key) }">&#xE76C;</span>
                                </span>
                            </button>
                            <div v-show="isContactGroupOpen(group.key)" class="contacts-group-items">
                                <button v-for="friend in group.items" :key="friend.uid" class="contacts-friend"
                                    type="button" @click="openContactProfile(friend)">
                                    <span class="contacts-friend-avatar">
                                        <img v-if="friend.avatar" :src="friend.avatar" alt="avatar" />
                                        <span v-else>{{ friend.username?.slice(0, 2).toUpperCase() }}</span>
                                    </span>
                                    <span class="contacts-friend-name">{{ friend.username }}</span>
                                    <span class="contacts-friend-uid">UID {{ friend.uid }}</span>
                                </button>
                                <div v-if="!group.items.length" class="contacts-empty">暂无成员</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <section class="chat">
                <template v-if="activeView === 'chat'">
                    <div class="chat-panel">
                        <div class="chat-header">
                            <div>
                                <div class="chat-title" :class="{ clickable: activeFriend }"
                                    @click.stop="toggleFriendProfile">
                                    {{ activeFriend?.username || '选择一个联系人' }}
                                </div>
                                <div class="chat-sub">
                                    {{ activeFriend ? `私聊 · UID ${activeFriend.uid}` : '等待选择聊天对象' }}
                                </div>
                            </div>
                            <div class="chat-actions">
                                <div class="chat-actions-left">
                                    <button class="chat-action-btn" type="button" title="语音通话" @click="startVoiceCall">
                                        <span class="chat-action-icon">&#xE717;</span>
                                    </button>
                                    <button class="chat-action-btn" type="button" title="视频通话">
                                        <span class="chat-action-icon">&#xE714;</span>
                                    </button>
                                    <button class="chat-action-btn" type="button" title="屏幕分享">
                                        <span class="chat-action-icon">&#xE7F4;</span>
                                    </button>
                                    <div class="chat-action-remote" title="远程控制">
                                        <button class="chat-action-btn" type="button" @click.stop="toggleRemoteMenu">
                                            <span class="chat-action-icon">&#xE8A7;</span>
                                        </button>
                                        <div class="chat-action-menu" :class="{ open: showRemoteMenu }">
                                            <button class="chat-action-menu-item" type="button">
                                                远程控制对方电脑
                                            </button>
                                            <button class="chat-action-menu-item" type="button">
                                                邀请对方远程协助
                                            </button>
                                        </div>
                                    </div>
                                    <button class="chat-action-btn" type="button" title="发起群聊">
                                        <span class="chat-action-icon">&#xE902;</span>
                                    </button>
                                </div>
                                <span class="chip">私聊</span>
                                <span class="chip" :class="{ offline: !activeFriendOnline }">
                                    {{ activeFriendOnline ? '在线' : '离线' }}
                                </span>
                            </div>
                            <div v-if="activeFriend" ref="friendProfileRef" class="friend-profile-popover"
                                :class="{ 'is-visible': isFriendProfileVisible }" @click.stop>
                                <div class="profile-head">
                                    <div class="profile-avatar">
                                        <img v-if="friendProfileSource?.avatar" :src="friendProfileSource?.avatar"
                                            alt="avatar" />
                                        <span v-else>{{ friendInitials }}</span>
                                    </div>
                                    <div class="profile-meta">
                                        <div class="profile-name">{{ friendDisplayName }}</div>
                                        <div class="profile-uid">UID {{ friendProfileSource?.uid || '---' }}</div>
                                        <div class="profile-signature">{{ friendSignature }}</div>
                                        <div class="profile-details">
                                            <div class="profile-detail">性别：{{ friendProfileSource?.gender || '未设置' }}
                                            </div>
                                            <div class="profile-detail">生日：{{ friendProfileSource?.birthday || '未设置' }}
                                            </div>
                                            <div class="profile-detail">
                                                城市：{{ friendProfileSource?.country || '未设置' }}{{
                                                    friendProfileSource?.province ? ` / ${friendProfileSource?.province}` :
                                                        '' }}{{ friendProfileSource?.region ? ` /
                                                ${friendProfileSource?.region}` : '' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="chat-body" ref="chatBodyRef" @scroll="handleChatScroll">
                            <div v-if="loading" class="loading">加载中...</div>
                            <div v-else-if="!messages.length" class="empty-chat">
                                还没有聊天记录，打个招呼吧。
                            </div>
                            <div v-else class="bubble-list">
                                <div v-for="msg in displayMessages" :key="msg.id" class="bubble" :class="{
                                    self: msg.senderUid === auth.uid,
                                    error: msg.error,
                                    'image-only': isImageOnlyMessage(msg),
                                    'file-only': msg.type === 'file'
                                }">
                                    <span v-if="msg.error" class="bubble-error-dot"></span>
                                    <div class="bubble-name">
                                        {{ msg.senderUid === auth.uid ? displayName : activeFriend?.username }}
                                    </div>
                                    <div class="bubble-text">
                                        <template v-if="msg.type === 'image'">
                                            <div class="bubble-image-grid">
                                                <img v-for="(url, index) in getMessageImageUrls(msg)"
                                                    :key="`${msg.id || 'img'}-${index}`" class="bubble-image" :src="url"
                                                    alt="image" @dblclick.stop="openImagePreview(url)" />
                                            </div>
                                            <div v-if="getMessageImageCaption(msg)" class="bubble-caption">
                                                {{ getMessageImageCaption(msg) }}
                                            </div>
                                        </template>
                                        <template v-else-if="msg.type === 'file'">
                                            <div class="bubble-file">
                                                <div class="bubble-file-icon">&#xE8A5;</div>
                                                <div class="bubble-file-meta">
                                                    <div class="bubble-file-name">{{ getMessageFileName(msg) }}</div>
                                                    <div class="bubble-file-size">{{
                                                        formatBytes(getMessageFileSize(msg))
                                                    }}</div>
                                                </div>
                                                <button v-if="getMessageFileUrl(msg) && !isFileExpired(msg)"
                                                    class="bubble-file-link" type="button"
                                                    @click="downloadFileMessage(msg)">
                                                    {{ hasDownloadedFile(msg) ? '打开' : '下载' }}
                                                </button>
                                                <span v-else-if="isFileExpired(msg)" class="bubble-file-expired">
                                                    已过期
                                                </span>
                                                <span v-else class="bubble-file-status">上传中</span>
                                            </div>
                                        </template>
                                        <template v-else-if="msg.type === 'card'">
                                            <div class="card-message">
                                                <div class="card-title">个人名片</div>
                                                <div class="card-main">
                                                    <div class="card-avatar">
                                                        <img v-if="getCardAvatar(msg)" :src="getCardAvatar(msg)"
                                                            alt="avatar" />
                                                        <span v-else>{{ getCardInitials(msg) }}</span>
                                                    </div>
                                                    <div class="card-meta">
                                                        <div class="card-name">{{ getCardName(msg) }}</div>
                                                        <div class="card-uid">UID {{ getCardUid(msg) }}</div>
                                                    </div>
                                                </div>
                                                <div v-if="getCardNote(msg)" class="card-note">
                                                    {{ getCardNote(msg) }}
                                                </div>
                                            </div>
                                        </template>
                                        <span v-else>{{ renderMessage(msg) }}</span>
                                    </div>
                                    <div class="bubble-time">{{ formatTime(msg.createdAt) }}</div>
                                </div>
                                <div v-if="blockNoticeText" class="chat-block-notice">
                                    {{ blockNoticeText }}
                                </div>
                            </div>
                        </div>

                    </div>



                    <div class="composer" :style="{ height: `${composerHeight}px` }">
                        <div class="composer-resize-handle" @mousedown.prevent="startComposerResize"></div>
                        <div class="composer-toolbar">
                            <button ref="emojiButtonRef" class="tool-icon-btn" :class="{ 'is-active': showEmojiPicker }"
                                title="表情" @click.stop="toggleEmojiPicker">
                                <span class="tool-glyph">&#xE170;</span>
                            </button>
                            <teleport to="body">
                                <div v-if="showEmojiPicker" ref="emojiPickerRef" class="emoji-panel"
                                    :style="emojiPanelStyle" @click.stop>
                                    <div class="emoji-tabs">
                                        <button v-for="tab in emojiTabs" :key="tab.id" class="emoji-tab"
                                            :class="{ active: emojiTab === tab.id }" type="button"
                                            @click="emojiTab = tab.id">
                                            {{ tab.label }}
                                        </button>
                                    </div>
                                    <div v-if="currentEmojiList.length" class="emoji-grid">
                                        <button v-for="item in currentEmojiList" :key="`${emojiTab}-${item}`"
                                            class="emoji-btn" type="button" @click="addEmoji(item)">
                                            {{ item }}
                                        </button>
                                    </div>
                                    <div v-else class="emoji-empty">暂无表情</div>
                                </div>
                            </teleport>
                            <button class="tool-icon-btn" title="剪刀">
                                <span class="tool-glyph">&#xE8C6;</span>
                            </button>
                            <button class="tool-icon-btn" title="文件" @click="triggerFileSelect">
                                <span class="tool-glyph">&#xE8A5;</span>
                            </button>
                            <input ref="fileInputRef" class="composer-file-input" type="file"
                                @change="handleFileSelect" />
                            <input ref="imageInputRef" class="composer-image-input" type="file" accept="image/*"
                                multiple @change="handleImageSelect" />
                            <button class="tool-icon-btn" title="图片" @click="triggerImageSelect">
                                <span class="tool-glyph">&#xEB9F;</span>
                            </button>
                            <button class="tool-icon-btn" title="语音" @click="startVoiceCall">
                                <span class="tool-glyph">&#xE720;</span>
                            </button>
                            <div class="tool-spacer"></div>
                            <button class="tool-icon-btn" title="更多" :class="{ 'is-active': showMorePanel }"
                                @click.stop="toggleMorePanel">
                                <span class="tool-glyph">&#xE712;</span>
                            </button>
                        </div>
                        <div class="composer-body">
                            <div class="composer-input">
                                <div v-if="draftImages.length" class="composer-image-list">
                                    <div v-for="(item, index) in draftImages" :key="item.id || `${item.hash}-${index}`"
                                        class="composer-image-preview">
                                        <img :src="item.preview" alt="preview" />
                                    </div>
                                </div>
                                <textarea v-model="draft" ref="composerTextareaRef" placeholder=""
                                    @keydown.enter.exact.prevent="sendMessage" @keydown.enter.shift.stop
                                    @keydown.backspace="handleComposerBackspace"
                                    @paste="handleComposerPaste"></textarea>
                            </div>
                        </div>
                        <div class="composer-actions">
                            <div class="send-group">
                                <button class="send-btn" :disabled="!canSend" @click="sendMessage">
                                    发送
                                </button>
                                <button class="send-drop" title="发送选项" @click.stop="toggleSendMenu">
                                    <span class="tool-glyph">&#xE70D;</span>
                                </button>
                                <div v-if="showSendMenu" class="send-menu">
                                    <div class="send-menu-item">
                                        <span class="send-tip-mark">&#xE73E;</span>
                                        <span>按 Enter 键发送消息</span>
                                    </div>
                                    <div class="send-menu-item">
                                        <span class="send-tip-mark">&#xE73E;</span>
                                        <span>按 Ctrl + Enter 键发送消息</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="showMorePanel" class="chat-side-overlay" @click="closeMorePanel"></div>
                    <aside ref="morePanelRef" class="chat-side-panel" :class="{ open: showMorePanel }" @click.stop>
                        <div class="chat-side-card">
                            <div class="chat-side-row">
                                <span>设为置顶</span>
                                <label class="chat-switch">
                                    <input type="checkbox" :checked="isActivePinned" @change="toggleActivePinned" />
                                    <span class="chat-switch-slider"></span>
                                </label>
                            </div>
                            <div class="chat-side-row">
                                <span>消息免打扰</span>
                                <label class="chat-switch">
                                    <input type="checkbox" :checked="isActiveMuted" @change="toggleActiveMuted" />
                                    <span class="chat-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="chat-side-card">
                            <button class="chat-side-action" type="button" @click="handlePanelAction('block')">
                                {{ blockActionLabel }}
                            </button>
                            <button class="chat-side-action" type="button" @click="handlePanelAction('files')">
                                文件传输列表
                                <span class="chat-side-chev">&#xE76C;</span>
                            </button>
                            <button class="chat-side-action" type="button" @click="handlePanelAction('clear')">
                                删除聊天记录
                            </button>
                        </div>
                        <div class="chat-side-card">
                            <button class="chat-side-danger" type="button" @click="handlePanelAction('remove')">
                                删除好友
                            </button>
                        </div>
                        <button class="chat-side-link" type="button" @click="handlePanelAction('report')">
                            被骚扰了？举报该用户
                        </button>
                    </aside>
                </template>

                <div v-else class="contacts-panel">
                    <div class="contacts-header">
                        <div class="contacts-title">{{ contactsPanelTitle }}</div>
                        <div class="contacts-tools">
                            <button v-if="selectedContact" class="tool-btn" title="返回" @click="clearContactProfile">
                                <span class="tool-icon">&#xE72B;</span>
                            </button>
                            <template v-else>
                                <button class="tool-btn" title="筛选">
                                    <span class="tool-icon">&#xE71C;</span>
                                    <span class="tool-dot"></span>
                                </button>
                                <button class="tool-btn" title="清空">
                                    <span class="tool-icon">&#xE74D;</span>
                                </button>
                            </template>
                        </div>
                    </div>
                    <div class="contacts-body">
                        <div v-if="selectedContact" class="contact-profile">
                            <div v-if="contactProfileLoading" class="loading">加载中...</div>
                            <div v-else class="contact-profile-card">
                                <div class="profile-head">
                                    <div class="profile-avatar">
                                        <img v-if="contactProfileSource?.avatar" :src="contactProfileSource?.avatar"
                                            alt="avatar" />
                                        <span v-else>{{ contactInitials }}</span>
                                    </div>
                                    <div class="profile-meta">
                                        <div class="profile-name">{{ contactDisplayName }}</div>
                                        <div class="profile-uid">UID {{ contactProfileSource?.uid || '---' }}</div>
                                        <div class="profile-signature">{{ contactSignature }}</div>
                                        <div class="profile-details">
                                            <div class="profile-detail">性别：{{ contactProfileSource?.gender || '未设置' }}
                                            </div>
                                            <div class="profile-detail">生日：{{ contactProfileSource?.birthday || '未设置' }}
                                            </div>
                                            <div class="profile-detail">
                                                城市：{{ contactProfileSource?.country || '未设置' }}{{
                                                    contactProfileSource?.province ? ` / ${contactProfileSource?.province}`
                                                        :
                                                        '' }}{{ contactProfileSource?.region ? ` /
                                                ${contactProfileSource?.region}` :
                                                    '' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="contact-profile-meta">
                                    <span class="contact-tag"
                                        :class="{ offline: contactProfileSource?.online === false }">
                                        {{ contactProfileSource?.online === false ? '离线' : '在线' }}
                                    </span>
                                </div>
                                <div class="contact-profile-actions">
                                    <button class="contact-action-btn" type="button" title="分享" @click="openSharePanel">
                                        <span class="contact-action-icon">&#xE72D;</span>
                                        <span class="contact-action-text">分享</span>
                                    </button>
                                    <button class="contact-action-btn" type="button" title="音视频通话"
                                        @click="startVoiceCallFromContact">
                                        <span class="contact-action-icon">&#xE717;</span>
                                        <span class="contact-action-text">音视频通话</span>
                                    </button>
                                    <button class="contact-action-btn primary" type="button" title="发消息"
                                        @click="enterChatFromContact">
                                        <span class="contact-action-icon">&#xE8BD;</span>
                                        <span class="contact-action-text">发消息</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <template v-else>
                            <div v-if="!incomingRequests.length && !outgoingRequests.length" class="empty-chat">
                                暂无好友通知
                            </div>
                            <div v-else class="notify-list">
                                <div v-for="req in incomingRequests" :key="`in-${req.uid}`" class="notify-card">
                                    <div class="notify-avatar">
                                        <img v-if="req.avatar" :src="req.avatar" alt="avatar" />
                                        <span v-else>{{ req.username.slice(0, 2).toUpperCase() }}</span>
                                    </div>
                                    <div class="notify-main">
                                        <div class="notify-title">
                                            <span class="notify-name">{{ req.username }}</span>
                                            <span class="notify-text">请求加为好友</span>
                                        </div>
                                        <div class="notify-sub">UID {{ req.uid }}</div>
                                    </div>
                                    <div class="notify-actions">
                                        <button class="notify-accept" @click="handleRequestAction(req.uid, 'accept')">
                                            同意
                                        </button>
                                        <button class="notify-reject" @click="handleRequestAction(req.uid, 'reject')">
                                            拒绝
                                        </button>
                                    </div>
                                </div>
                                <div v-for="req in outgoingRequests" :key="`out-${req.uid}`" class="notify-card">
                                    <div class="notify-avatar">
                                        <img v-if="req.avatar" :src="req.avatar" alt="avatar" />
                                        <span v-else>{{ req.username.slice(0, 2).toUpperCase() }}</span>
                                    </div>
                                    <div class="notify-main">
                                        <div class="notify-title">
                                            <span class="notify-name">{{ req.username }}</span>
                                            <span class="notify-text">等待验证</span>
                                        </div>
                                        <div class="notify-sub">UID {{ req.uid }}</div>
                                    </div>
                                    <div class="notify-actions">
                                        <span class="notify-status" :class="`status-${req.status}`">
                                            {{ req.status === 'rejected' ? '已拒绝' : '等待验证' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </section>
        </main>
        <div v-if="showListMenu" ref="listMenuRef" class="list-context-menu"
            :style="{ top: `${listMenuPosition.y}px`, left: `${listMenuPosition.x}px` }" @click.stop>
            <button class="list-context-item" type="button" @click="pinFriendFromMenu">
                {{ isPinned(listMenuFriend?.uid) ? '取消置顶' : '置顶' }}
            </button>
            <button class="list-context-item" type="button" @click="copyUidFromMenu">复制UID</button>
            <button class="list-context-item" type="button" @click="toggleUnreadFromMenu">
                {{ isUnread(listMenuFriend?.uid) ? '标记已读' : '标记未读' }}
            </button>
            <button class="list-context-item" type="button" @click="openDetachedChatFromMenu">打开独立聊天窗口</button>
            <button class="list-context-item" type="button" @click="toggleMuteFromMenu">设置免打扰</button>
            <button class="list-context-item danger" type="button" @click="removeFromListFromMenu">
                从消息列表中移除
            </button>
        </div>
        <transition name="profile-modal" appear>
            <div v-show="isEditOpen" class="profile-modal">
                <div class="profile-modal__backdrop" @click="closeEditProfile"></div>
                <div class="profile-modal__panel">
                    <div class="profile-modal__header">
                        <div class="profile-modal__title">编辑资料</div>
                        <button class="profile-modal__close" type="button" @click="closeEditProfile">×</button>
                    </div>
                    <div class="profile-modal__body">
                        <div class="profile-modal__avatar">
                            <img v-if="editForm.avatar" :src="editForm.avatar" alt="avatar" />
                            <span v-else>{{ initials }}</span>
                        </div>
                        <div class="profile-modal__upload">
                            <input ref="avatarInputRef" class="profile-modal__file" type="file" accept="image/*"
                                @change="handleAvatarChange" />
                            <button class="profile-btn ghost" type="button" @click="triggerAvatarSelect">
                                上传头像
                            </button>
                            <button v-if="editForm.avatar" class="profile-btn ghost" type="button" @click="clearAvatar">
                                移除
                            </button>
                        </div>

                        <label class="profile-field" :class="{ 'is-invalid': nicknameInvalid }">
                            <span class="profile-field__label">昵称</span>
                            <div class="profile-field__control">
                                <input v-model.trim="editForm.nickname" type="text" maxlength="36"
                                    placeholder="请输入昵称" />
                                <span class="profile-field__count">{{ nicknameCount }}/36</span>
                            </div>
                        </label>

                        <label class="profile-field">
                            <span class="profile-field__label">个签</span>
                            <div class="profile-field__control">
                                <input v-model.trim="editForm.signature" type="text" maxlength="80"
                                    placeholder="编辑个签，展示我的独特态度" />
                                <span class="profile-field__count">{{ signatureCount }}/80</span>
                            </div>
                        </label>

                        <label class="profile-field">
                            <span class="profile-field__label">性别</span>
                            <SelectField v-model="editForm.gender" :options="genderOptions" autoScroll />
                        </label>

                        <label class="profile-field">
                            <span class="profile-field__label">生日</span>
                            <DateSelect v-model="editForm.birthday" />
                        </label>

                        <label class="profile-field">
                            <span class="profile-field__label">国家</span>
                            <SelectField v-model="editForm.country" :options="countryOptions" autoScroll />
                        </label>

                        <div v-if="editForm.country === '中国'" class="profile-field profile-field--split">
                            <label>
                                <span class="profile-field__label">省份</span>
                                <SelectField v-model="editForm.province" :options="provinceOptions" autoScroll />
                            </label>
                            <label>
                                <span class="profile-field__label">城市</span>
                                <SelectField v-model="editForm.region" :options="cityOptions"
                                    :disabled="!cityOptions.length" autoScroll />
                            </label>
                        </div>
                    </div>
                    <div class="profile-modal__footer">
                        <button class="profile-btn" type="button" @click="saveProfile">保存</button>
                        <button class="profile-btn ghost" type="button" @click="closeEditProfile">取消</button>
                    </div>
                </div>
            </div>
        </transition>
        <transition name="profile-modal" appear>
            <div v-show="isCropOpen" class="crop-modal">
                <div class="profile-modal__backdrop" @click="closeCropper"></div>
                <div class="crop-modal__panel">
                    <div class="profile-modal__header">
                        <div class="profile-modal__title">裁切头像</div>
                        <button class="profile-modal__close" type="button" @click="closeCropper">×</button>
                    </div>
                    <div class="crop-modal__body">
                        <div class="crop-frame" @pointerdown.prevent="startCropDrag">
                            <img v-if="cropSource" class="crop-image" :src="cropSource" :style="cropImageStyle"
                                alt="crop" draggable="false" />
                        </div>
                        <div class="crop-controls">
                            <label class="crop-zoom">
                                <span>缩放</span>
                                <input type="range" min="1" max="3" step="0.01" v-model.number="cropScale" />
                            </label>
                        </div>
                    </div>
                    <div class="profile-modal__footer">
                        <button class="profile-btn" type="button" @click="applyCrop">确定</button>
                        <button class="profile-btn ghost" type="button" @click="closeCropper">取消</button>
                    </div>
                </div>
            </div>
        </transition>
        <transition name="profile-modal" appear>
            <div v-show="showSharePanel" class="share-modal">
                <div class="profile-modal__backdrop" @click="closeSharePanel"></div>
                <div class="share-panel">
                    <div class="share-left">
                        <div class="share-search">
                            <span class="search-icon">&#128269;</span>
                            <input v-model.trim="shareQuery" type="text" placeholder="搜索" />
                        </div>
                        <button class="share-create-btn" type="button">创建群聊并转发</button>
                        <div class="share-section-title">最近聊天</div>
                        <div class="share-list">
                            <button v-for="friend in shareTargets" :key="`share-${friend.uid}`" class="share-item"
                                type="button" @click="shareTargetUid = friend.uid">
                                <span class="share-radio" :class="{ selected: shareTargetUid === friend.uid }"></span>
                                <span class="share-avatar">
                                    <img v-if="friend.avatar" :src="friend.avatar" alt="avatar" />
                                    <span v-else>{{ friend.username?.slice(0, 2).toUpperCase() }}</span>
                                </span>
                                <span class="share-name">{{ friend.nickname || friend.username }}</span>
                            </button>
                            <div v-if="!shareTargets.length" class="share-empty">暂无最近聊天</div>
                        </div>
                    </div>
                    <div class="share-right">
                        <div class="share-header">分享至：</div>
                        <div class="share-target-name">{{ shareTargetName || '请选择好友' }}</div>
                        <div class="share-card">
                            <div class="share-card-title">名片</div>
                            <div class="share-card-main">
                                <div class="share-card-avatar">
                                    <img v-if="shareCardAvatar" :src="shareCardAvatar" alt="avatar" />
                                    <span v-else>{{ shareCardInitials }}</span>
                                </div>
                                <div class="share-card-meta">
                                    <div class="share-card-name">{{ shareCardName }}</div>
                                    <div class="share-card-uid">UID {{ shareCardUid }}</div>
                                </div>
                            </div>
                        </div>
                        <div class="share-note">
                            <textarea v-model.trim="shareNote" placeholder="留言"></textarea>
                        </div>
                        <div class="share-actions">
                            <button class="share-confirm" type="button" :disabled="!shareTargetUid"
                                @click="confirmShareCard">
                                确定
                            </button>
                            <button class="share-cancel" type="button" @click="closeSharePanel">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
        <transition name="file-modal" appear>
            <div v-show="isFileModalOpen" class="file-modal">
                <div class="file-modal__backdrop" @click="closeFileModal"></div>
                <div class="file-modal__panel">
                    <div class="file-modal__header">
                        <div class="file-modal__title">
                            发送给 {{ activeFriend?.username || '好友' }}
                        </div>
                        <button class="file-modal__close" type="button" @click="closeFileModal">×</button>
                    </div>
                    <div class="file-modal__body">
                        <div class="file-modal__card">
                            <div class="file-modal__icon">&#xE8A5;</div>
                            <div class="file-modal__meta">
                                <div class="file-modal__name">{{ fileDraft?.name || '未命名文件' }}</div>
                                <div class="file-modal__size">{{ formatBytes(fileDraft?.size) }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="file-modal__footer">
                        <button class="file-modal__send" type="button" :disabled="!canSendFile"
                            @click="sendFileMessage">
                            发送(1)
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue';
import SelectField from './components/SelectField.vue';
import DateSelect from './components/DateSelect.vue';
import { COUNTRIES, CHINA_PROVINCES, CHINA_CITIES_BY_PROVINCE } from './utils/geo';
import { API_BASE } from './utils/api.js';
const NOTIFY_SOUND_URL = `${API_BASE}/resource/messagenotify.wav`;

const auth = ref({
    token: '',
    uid: null,
    username: '',
    nickname: '',
    signature: '',
    avatar: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});
const isReady = ref(false);
const isProfileVisible = ref(false);
const isEditOpen = ref(false);
const nicknameInvalid = ref(false);
const friends = ref([]);
const activeFriend = ref(null);
const messages = ref([]);
const localMessages = ref([]);
const unreadByUid = ref({});
const chatBodyRef = ref(null);
const wsRef = ref(null);
const draft = ref('');
const loading = ref(false);
const searchText = ref('');
const statusText = ref('在线');
const activeView = ref('chat');
const contactsNoticeType = ref('friend');
const contactGroupOpen = ref({});
const showListMenu = ref(false);
const listMenuPosition = ref({ x: 0, y: 0 });
const listMenuFriend = ref(null);
const listMenuRef = ref(null);
const pinnedUids = ref([]);
const mutedUids = ref([]);
const unreadUids = ref([]);
const hiddenUids = ref([]);
const blockedUids = ref([]);
const blockedAtByUid = ref({});
const recentChatMap = ref({});
const pendingChatUid = ref(null);
const incomingRequests = ref([]);
const outgoingRequests = ref([]);
const showSendMenu = ref(false);
const showEmojiPicker = ref(false);
const showMorePanel = ref(false);
const showRemoteMenu = ref(false);
const showSharePanel = ref(false);
const emojiTab = ref('recent');
const recentEmojis = ref([]);
const isFriendProfileVisible = ref(false);
const friendProfileRef = ref(null);
const friendProfile = ref(null);
const friendProfileLoading = ref(false);
const selectedContact = ref(null);
const contactProfile = ref(null);
const contactProfileLoading = ref(false);
const blockNotice = ref({ uid: null, text: '' });
const shareQuery = ref('');
const shareTargetUid = ref(null);
const shareNote = ref('');
const shareCardSource = ref(null);
const emojiPickerRef = ref(null);
const emojiButtonRef = ref(null);
const morePanelRef = ref(null);
const emojiPanelStyle = ref({});
const composerHeight = ref(210);
const isResizingComposer = ref(false);
const composerResizeStart = ref({ y: 0, height: 0 });
const composerTextareaRef = ref(null);
const avatarInputRef = ref(null);
const imageInputRef = ref(null);
const fileInputRef = ref(null);
const draftImages = ref([]);
const imageUploadCache = new Map();
const MESSAGE_PAGE_SIZE = 50;
const isLoadingMore = ref(false);
const hasMoreMessages = ref(true);
const oldestMessageId = ref('');
const UPLOAD_CONCURRENCY = 3;
const pendingImageHashes = new Map();
const fileDraft = ref(null);
const isFileModalOpen = ref(false);
const downloadedFileByUrl = ref({});
const checkedFileUrls = new Set();
const isCropOpen = ref(false);
const cropSource = ref('');
const cropScale = ref(1);
const cropOffset = ref({ x: 0, y: 0 });
const cropImage = ref({ width: 0, height: 0 });
const cropBaseScale = ref(1);
const cropDragging = ref(false);
const cropStart = ref({ x: 0, y: 0 });
const cropStartOffset = ref({ x: 0, y: 0 });
let wsReconnectTimer = null;
let wsReconnectAttempts = 0;
let wsHeartbeatTimer = null;
const HEARTBEAT_INTERVAL_MS = 15000;
let wsPresenceTimer = null;
const PRESENCE_REQUEST_INTERVAL_MS = 10000;
const presenceOverrides = new Map();
let messageIdSet = new Set();
const lastFriendSignature = ref('');
const lastMessageSignature = ref('');
const voiceSignalQueue = ref([]);

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();
const openFoundFriend = () => window.electronAPI?.openFoundFriend?.();
const flashWindow = () => window.electronAPI?.windowFlash?.();
let profileHideTimer = null;
const editForm = ref({
    nickname: '',
    signature: '',
    avatar: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});
const genderOptions = ['男', '女', '保密'];
const countryOptions = COUNTRIES;
const provinceOptions = computed(() => {
    return editForm.value.country === '中国' ? CHINA_PROVINCES : [];
});
const cityOptions = computed(() => {
    if (editForm.value.country !== '中国') return [];
    return CHINA_CITIES_BY_PROVINCE[editForm.value.province] || [];
});

const handleLogout = () => {
    try {
        localStorage.removeItem('vp_username');
        localStorage.removeItem('vp_signature');
    } catch {}
    closeWebSocket();
    if (auth.value.token) {
        fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: authHeader()
        }).catch(() => {});
    }
    window.electronAPI?.logout?.();
};

const MAX_AVATAR_BYTES = 20 * 1024 * 1024;
const CROP_SIZE = 240;
const MAX_CHAT_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024;
const FILE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const LIST_MENU_WIDTH = 220;
const LIST_MENU_HEIGHT = 6 * 38;
const LIST_MENU_MARGIN = 12;

const loadUidList = (key) => {
    try {
        const raw = localStorage.getItem(key);
        const list = JSON.parse(raw || '[]');
        return Array.isArray(list) ? list.map((item) => Number(item)).filter(Number.isFinite) : [];
    } catch {
        return [];
    }
};

const saveUidList = (key, list) => {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch {}
};

const loadUidMap = (key) => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = JSON.parse(raw || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const saveUidMap = (key, map) => {
    try {
        localStorage.setItem(key, JSON.stringify(map || {}));
    } catch {}
};

const loadDownloadMap = () => {
    try {
        const raw = localStorage.getItem('vp_downloaded_files');
        const parsed = JSON.parse(raw || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const saveDownloadMap = (map) => {
    try {
        localStorage.setItem('vp_downloaded_files', JSON.stringify(map || {}));
    } catch {}
};

const loadFriendPreferences = () => {
    pinnedUids.value = loadUidList('vp_pinned_uids');
    mutedUids.value = loadUidList('vp_muted_uids');
    hiddenUids.value = loadUidList('vp_hidden_uids');
    blockedUids.value = loadUidList('vp_blocked_uids');
    blockedAtByUid.value = loadUidMap('vp_blocked_at');
    recentChatMap.value = loadUidMap('vp_recent_chats');
};

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Avatar read failed.'));
        reader.readAsDataURL(file);
    });

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Avatar load failed.'));
        img.src = src;
    });

const computeFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
};

const imageWorkerState = {
    worker: null,
    pending: new Map(),
    seq: 0
};

const getImageWorker = () => {
    if (imageWorkerState.worker) return imageWorkerState.worker;
    const worker = new Worker(new URL('./workers/imageWorker.js', import.meta.url), {
        type: 'module'
    });
    worker.onmessage = (event) => {
        const { id, hash, error } = event.data || {};
        const entry = imageWorkerState.pending.get(id);
        if (!entry) return;
        imageWorkerState.pending.delete(id);
        if (error) {
            entry.reject(new Error(error));
            return;
        }
        entry.resolve({ hash });
    };
    worker.onerror = (error) => {
        imageWorkerState.pending.forEach((entry) => entry.reject(error));
        imageWorkerState.pending.clear();
    };
    imageWorkerState.worker = worker;
    return worker;
};

const runImageWorker = (file) =>
    new Promise((resolve, reject) => {
        const worker = getImageWorker();
        const id = `img-${Date.now()}-${imageWorkerState.seq++}`;
        imageWorkerState.pending.set(id, { resolve, reject });
        worker.postMessage({ id, file });
    });

const processImageFile = async (file) => {
    try {
        return await runImageWorker(file);
    } catch {
        const hash = await computeFileHash(file);
        return { hash };
    }
};

const releaseDraftImage = (item) => {
    if (item?.preview) {
        try {
            URL.revokeObjectURL(item.preview);
        } catch {}
    }
    if (item?.id) {
        pendingImageHashes.delete(item.id);
    }
};

const runWithConcurrency = async (tasks, limit) => {
    const results = new Array(tasks.length);
    let nextIndex = 0;
    const runners = Array.from({ length: Math.min(limit, tasks.length) }).map(async () => {
        while (nextIndex < tasks.length) {
            const current = nextIndex++;
            results[current] = await tasks[current]();
        }
    });
    await Promise.all(runners);
    return results;
};

const uploadImageBinary = async (file, hash) => {
    const ext = file.type?.startsWith('image/')
        ? file.type.split('/')[1]?.toLowerCase()
        : '';
    const res = await fetch(`${API_BASE}/api/chat/upload/image`, {
        method: 'POST',
        headers: {
            ...authHeader(),
            'Content-Type': 'application/octet-stream',
            'X-File-Ext': ext || 'png',
            'X-File-Hash': hash
        },
        body: file
    });
    const result = await res.json();
    if (!res.ok || !result?.success) {
        throw new Error(result?.message || '图片上传失败');
    }
    return result.data?.url || '';
};

const uploadFileBinary = async (file) => {
    const res = await fetch(`${API_BASE}/api/chat/upload/file`, {
        method: 'POST',
        headers: {
            ...authHeader(),
            'Content-Type': 'application/octet-stream',
            'X-File-Name': file.name || 'file',
            'X-File-Type': file.type || 'application/octet-stream'
        },
        body: file
    });
    const result = await res.json();
    if (!res.ok || !result?.success) {
        throw new Error(result?.message || '文件上传失败');
    }
    return result.data;
};

const getImageExtFromDataUrl = (dataUrl) => {
    const match = /^data:image\/(png|jpe?g|gif|webp);base64,/i.exec(dataUrl || '');
    if (!match) return '';
    const ext = match[1].toLowerCase();
    return ext === 'jpeg' ? 'jpg' : ext;
};

const triggerAvatarSelect = () => {
    avatarInputRef.value?.click?.();
};

const triggerImageSelect = () => {
    imageInputRef.value?.click?.();
};

const triggerFileSelect = () => {
    fileInputRef.value?.click?.();
};

const clearDraftImages = () => {
    draftImages.value.forEach(releaseDraftImage);
    draftImages.value = [];
    if (imageInputRef.value) {
        imageInputRef.value.value = '';
    }
};

const clearFileDraft = () => {
    fileDraft.value = null;
    isFileModalOpen.value = false;
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
};

const handleComposerBackspace = (event) => {
    if (!draftImages.value.length) return;
    if (draft.value.length > 0) return;
    const last = draftImages.value[draftImages.value.length - 1];
    releaseDraftImage(last);
    draftImages.value = draftImages.value.slice(0, -1);
    event.preventDefault();
};

const startComposerResize = (event) => {
    isResizingComposer.value = true;
    composerResizeStart.value = { y: event.clientY, height: composerHeight.value };
    document.body.style.userSelect = 'none';
};

const handleComposerResizeMove = (event) => {
    if (!isResizingComposer.value) return;
    const delta = composerResizeStart.value.y - event.clientY;
    const next = composerResizeStart.value.height + delta;
    composerHeight.value = Math.min(360, Math.max(140, next));
};

const stopComposerResize = () => {
    if (!isResizingComposer.value) return;
    isResizingComposer.value = false;
    document.body.style.userSelect = '';
};

const clearAvatar = () => {
    editForm.value.avatar = '';
    if (avatarInputRef.value) {
        avatarInputRef.value.value = '';
    }
};

const isPinned = (uid) => pinnedUids.value.includes(uid);
const isMuted = (uid) => mutedUids.value.includes(uid);
const isUnread = (uid) => unreadUids.value.includes(uid);
const isHidden = (uid) => hiddenUids.value.includes(uid);
const isBlocked = (uid) => blockedUids.value.includes(uid);
const getBlockedAt = (uid) => {
    if (!uid) return null;
    const raw = blockedAtByUid.value?.[uid];
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
};

const updateHidden = (uid) => {
    if (hiddenUids.value.includes(uid)) {
        hiddenUids.value = hiddenUids.value.filter((item) => item !== uid);
    } else {
        hiddenUids.value = [...hiddenUids.value, uid];
    }
    saveUidList('vp_hidden_uids', hiddenUids.value);
};

const showInChatList = (uid) => {
    if (!uid || !hiddenUids.value.includes(uid)) return;
    hiddenUids.value = hiddenUids.value.filter((item) => item !== uid);
    saveUidList('vp_hidden_uids', hiddenUids.value);
};

const updateBlocked = (uid) => {
    if (blockedUids.value.includes(uid)) {
        blockedUids.value = blockedUids.value.filter((item) => item !== uid);
        const next = { ...blockedAtByUid.value };
        delete next[uid];
        blockedAtByUid.value = next;
        saveUidMap('vp_blocked_at', next);
    } else {
        blockedUids.value = [...blockedUids.value, uid];
        const next = { ...blockedAtByUid.value, [uid]: Date.now() };
        blockedAtByUid.value = next;
        saveUidMap('vp_blocked_at', next);
    }
    saveUidList('vp_blocked_uids', blockedUids.value);
};

const updateRecentChat = (uid) => {
    if (!uid) return;
    const next = { ...recentChatMap.value, [uid]: Date.now() };
    recentChatMap.value = next;
    saveUidMap('vp_recent_chats', next);
};

const resetSharePanelState = () => {
    shareQuery.value = '';
    shareNote.value = '';
    shareTargetUid.value = null;
    shareCardSource.value = null;
};

const clampListMenuPosition = (x, y) => {
    const maxX = Math.max(LIST_MENU_MARGIN, window.innerWidth - LIST_MENU_WIDTH - LIST_MENU_MARGIN);
    const maxY = Math.max(LIST_MENU_MARGIN, window.innerHeight - LIST_MENU_HEIGHT - LIST_MENU_MARGIN);
    return {
        x: Math.min(maxX, Math.max(LIST_MENU_MARGIN, x)),
        y: Math.min(maxY, Math.max(LIST_MENU_MARGIN, y))
    };
};

const openListMenu = (friend, event) => {
    if (!friend || !event) return;
    listMenuFriend.value = friend;
    listMenuPosition.value = clampListMenuPosition(event.clientX, event.clientY);
    showListMenu.value = true;
};

const closeListMenu = () => {
    showListMenu.value = false;
    listMenuFriend.value = null;
};

const updatePinned = (uid) => {
    if (!uid) return;
    if (pinnedUids.value.includes(uid)) {
        pinnedUids.value = pinnedUids.value.filter((item) => item !== uid);
    } else {
        pinnedUids.value = [uid, ...pinnedUids.value];
    }
    saveUidList('vp_pinned_uids', pinnedUids.value);
};

const updateMuted = (uid) => {
    if (!uid) return;
    if (mutedUids.value.includes(uid)) {
        mutedUids.value = mutedUids.value.filter((item) => item !== uid);
    } else {
        mutedUids.value = [...mutedUids.value, uid];
    }
    saveUidList('vp_muted_uids', mutedUids.value);
};

const removePinned = (uid) => {
    if (!uid || !pinnedUids.value.includes(uid)) return;
    pinnedUids.value = pinnedUids.value.filter((item) => item !== uid);
    saveUidList('vp_pinned_uids', pinnedUids.value);
};

const removeMuted = (uid) => {
    if (!uid || !mutedUids.value.includes(uid)) return;
    mutedUids.value = mutedUids.value.filter((item) => item !== uid);
    saveUidList('vp_muted_uids', mutedUids.value);
};

const markUnread = (uid) => {
    if (!uid || unreadUids.value.includes(uid)) return;
    unreadUids.value = [...unreadUids.value, uid];
};

const clearUnread = (uid) => {
    if (!uid) return;
    if (unreadUids.value.includes(uid)) {
        unreadUids.value = unreadUids.value.filter((item) => item !== uid);
    }
};

const copyText = async (text) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {}
    try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
    } catch {
        return false;
    }
};

const pinFriendFromMenu = () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    updatePinned(uid);
    closeListMenu();
};

const copyUidFromMenu = async () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    const ok = await copyText(String(uid));
    statusText.value = ok ? 'UID 已复制' : '复制失败';
    closeListMenu();
};

const toggleUnreadFromMenu = () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    if (unreadUids.value.includes(uid)) {
        clearUnread(uid);
    } else {
        markUnread(uid);
    }
    closeListMenu();
};

const openDetachedChatFromMenu = () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    window.electronAPI?.openChatWindow?.({ uid });
    closeListMenu();
};

const toggleMuteFromMenu = () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    updateMuted(uid);
    closeListMenu();
};

const removeFromListFromMenu = () => {
    const uid = listMenuFriend.value?.uid;
    if (!uid) return;
    updateHidden(uid);
    closeListMenu();
};

const handleAvatarChange = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
        statusText.value = '请上传图片格式文件';
        event.target.value = '';
        return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
        statusText.value = '头像大小需小于 20MB';
        event.target.value = '';
        return;
    }
    try {
        const dataUrl = await readFileAsDataUrl(file);
        if (typeof dataUrl === 'string') {
            const img = await loadImage(dataUrl);
            if (img.width === img.height) {
                editForm.value.avatar = dataUrl;
            } else {
                openCropper(dataUrl, img.width, img.height);
            }
        }
    } catch {
        statusText.value = '头像读取失败';
    }
};

const setDraftFile = async (file) => {
    if (!activeFriend.value?.uid) {
        statusText.value = '请先选择好友';
        return;
    }
    if (file.size > MAX_CHAT_FILE_BYTES) {
        statusText.value = '文件大小需小于 20MB';
        return;
    }
    fileDraft.value = {
        name: file.name || '未命名文件',
        size: file.size,
        type: file.type || 'application/octet-stream',
        file
    };
    isFileModalOpen.value = true;
};

const setDraftImage = async (file) => {
    if (!file.type?.startsWith('image/')) {
        statusText.value = '请上传图片格式文件';
        return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
        statusText.value = '图片大小需小于 20MB';
        return;
    }
    const preview = URL.createObjectURL(file);
    const id = `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item = {
        id,
        hash: '',
        preview,
        file,
        pending: true
    };
    draftImages.value = [...draftImages.value, item];
    const hashPromise = processImageFile(file)
        .then((result) => {
            const hash = result?.hash || '';
            if (!hash) {
                throw new Error('hash_failed');
            }
            draftImages.value = draftImages.value.map((entry) =>
                entry.id === id ? { ...entry, hash, pending: false } : entry
            );
            return hash;
        })
        .catch(() => {
            draftImages.value = draftImages.value.map((entry) =>
                entry.id === id ? { ...entry, pending: false } : entry
            );
            statusText.value = '图片处理失败';
            return '';
        })
        .finally(() => {
            pendingImageHashes.delete(id);
        });
    pendingImageHashes.set(id, hashPromise);
};

const handleFileSelect = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
        await setDraftFile(file);
    } catch {
        statusText.value = '文件读取失败';
    } finally {
        if (event.target) {
            event.target.value = '';
        }
    }
};

const handleImageSelect = async (event) => {
    const files = Array.from(event.target?.files || []);
    if (!files.length) return;
    try {
        for (const file of files) {
            await setDraftImage(file);
        }
    } catch {
        statusText.value = '图片读取失败';
    } finally {
        if (event.target) {
            event.target.value = '';
        }
    }
};

const handleComposerPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    let handled = false;
    for (const item of items) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (!file) continue;
        handled = true;
        try {
            if (item.type?.startsWith('image/')) {
                await setDraftImage(file);
            } else {
                await setDraftFile(file);
            }
        } catch {
            statusText.value = item.type?.startsWith('image/') ? '图片读取失败' : '文件读取失败';
        }
    }
    if (handled) {
        event.preventDefault();
    }
};

const openCropper = (dataUrl, width, height) => {
    cropSource.value = dataUrl;
    cropImage.value = { width, height };
    cropBaseScale.value = Math.max(CROP_SIZE / width, CROP_SIZE / height);
    cropScale.value = 1;
    cropOffset.value = { x: 0, y: 0 };
    isCropOpen.value = true;
};

const closeCropper = () => {
    isCropOpen.value = false;
    cropSource.value = '';
    if (cropDragging.value) {
        stopCropDrag();
    }
};

const closeFileModal = () => {
    clearFileDraft();
};

const clampCropOffset = (offset, scale) => {
    const width = cropImage.value.width;
    const height = cropImage.value.height;
    const scaledW = width * scale;
    const scaledH = height * scale;
    const maxX = Math.max(0, (scaledW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - CROP_SIZE) / 2);
    return {
        x: Math.min(maxX, Math.max(-maxX, offset.x)),
        y: Math.min(maxY, Math.max(-maxY, offset.y))
    };
};

const startCropDrag = (event) => {
    if (!isCropOpen.value) return;
    cropDragging.value = true;
    cropStart.value = { x: event.clientX, y: event.clientY };
    cropStartOffset.value = { ...cropOffset.value };
    window.addEventListener('pointermove', handleCropDrag);
    window.addEventListener('pointerup', stopCropDrag);
};

const handleCropDrag = (event) => {
    if (!cropDragging.value) return;
    const dx = event.clientX - cropStart.value.x;
    const dy = event.clientY - cropStart.value.y;
    const scale = cropBaseScale.value * cropScale.value;
    cropOffset.value = clampCropOffset(
        { x: cropStartOffset.value.x + dx, y: cropStartOffset.value.y + dy },
        scale
    );
};

const stopCropDrag = () => {
    cropDragging.value = false;
    window.removeEventListener('pointermove', handleCropDrag);
    window.removeEventListener('pointerup', stopCropDrag);
};

const applyCrop = async () => {
    try {
        const img = await loadImage(cropSource.value);
        const scale = cropBaseScale.value * cropScale.value;
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const imgLeft = (CROP_SIZE - scaledW) / 2 + cropOffset.value.x;
        const imgTop = (CROP_SIZE - scaledH) / 2 + cropOffset.value.y;
        const sSize = CROP_SIZE / scale;
        let sx = -imgLeft / scale;
        let sy = -imgTop / scale;
        sx = Math.min(Math.max(sx, 0), Math.max(0, img.width - sSize));
        sy = Math.min(Math.max(sy, 0), Math.max(0, img.height - sSize));
        const canvas = document.createElement('canvas');
        canvas.width = CROP_SIZE;
        canvas.height = CROP_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            statusText.value = '裁切失败';
            return;
        }
        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, CROP_SIZE, CROP_SIZE);
        editForm.value.avatar = canvas.toDataURL('image/png');
        closeCropper();
        if (avatarInputRef.value) {
            avatarInputRef.value.value = '';
        }
    } catch {
        statusText.value = '裁切失败';
    }
};

const openEditProfile = () => {
    editForm.value = {
        nickname: auth.value.nickname || auth.value.username || '',
        signature: auth.value.signature || '',
        avatar: auth.value.avatar || '',
        gender: auth.value.gender || '',
        birthday: auth.value.birthday || '',
        country: auth.value.country || '',
        province: auth.value.province || '',
        region: auth.value.region || ''
    };
    nicknameInvalid.value = false;
    isEditOpen.value = true;
};

const closeEditProfile = () => {
    isEditOpen.value = false;
    nicknameInvalid.value = false;
};

const saveProfile = async () => {
    if (!auth.value.token) return;
    const nickname = sanitizeText(editForm.value.nickname).trim();
    if (!nickname) {
        statusText.value = '昵称为必填项';
        nicknameInvalid.value = true;
        return;
    }
    nicknameInvalid.value = false;
    const payload = {
        nickname,
        signature: sanitizeText(editForm.value.signature).trim(),
        gender: editForm.value.gender || '',
        birthday: editForm.value.birthday || '',
        country: editForm.value.country || '',
        province: editForm.value.province || '',
        region: editForm.value.region || '',
        avatar: editForm.value.avatar || ''
    };
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            auth.value = {
                ...auth.value,
                ...data.user
            };
            try {
                localStorage.setItem('vp_username', auth.value.username || '');
                localStorage.setItem('vp_nickname', auth.value.nickname || '');
                localStorage.setItem('vp_signature', auth.value.signature || '');
            } catch {}
            isEditOpen.value = false;
        }
    } catch {}
};

const showProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = true;
};

const hideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = false;
};

const scheduleHideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
    }
    profileHideTimer = setTimeout(() => {
        isProfileVisible.value = false;
        profileHideTimer = null;
    }, 120);
};

watch(
    () => editForm.value.province,
    (next, prev) => {
        if (next !== prev) {
            editForm.value.region = '';
        }
    }
);

watch(
    () => activeFriend.value?.uid,
    () => {
        isFriendProfileVisible.value = false;
        friendProfile.value = null;
    }
);
const buildWsUrl = () => {
    const base = new URL(API_BASE);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = '/ws';
    base.searchParams.set('token', auth.value.token || '');
    return base.toString();
};

const closeWebSocket = () => {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (wsHeartbeatTimer) {
        clearInterval(wsHeartbeatTimer);
        wsHeartbeatTimer = null;
    }
    if (wsPresenceTimer) {
        clearInterval(wsPresenceTimer);
        wsPresenceTimer = null;
    }
    if (wsRef.value) {
        wsRef.value.onopen = null;
        wsRef.value.onclose = null;
        wsRef.value.onmessage = null;
        wsRef.value.onerror = null;
        wsRef.value.close();
        wsRef.value = null;
    }
};

const scheduleReconnect = () => {
    if (wsReconnectTimer || !auth.value.token) {
        return;
    }
    const delay = Math.min(1000 * 2 ** wsReconnectAttempts, 15000);
    wsReconnectAttempts += 1;
    wsReconnectTimer = setTimeout(() => {
        wsReconnectTimer = null;
        connectWebSocket();
    }, delay);
};

const handleWsMessage = (payload) => {
    let message = null;
    try {
        message = JSON.parse(payload);
    } catch {
        return;
    }
    if (!message?.type) {
        return;
    }
    if (message.type === 'friends') {
        loadFriends({ silent: true });
        return;
    }
    if (message.type === 'requests') {
        loadRequests({ silent: true });
        loadFriends({ silent: true });
        return;
    }
    if (message.type === 'presence' && message.data) {
        applyPresenceUpdate(message.data);
        return;
    }
    if (message.type === 'presence_snapshot' && Array.isArray(message.data)) {
        message.data.forEach((entry) => applyPresenceUpdate(entry));
        return;
    }
    if (message.type === 'voice_signal_status' && message.data) {
        const status = message.data.status;
        if (status === 'offline') {
            statusText.value = '对方当前不在线，无法接听';
        } else if (status === 'not_friend') {
            statusText.value = '对方不是好友，无法呼叫';
        }
        return;
    }
    if (message.type === 'voice_signal' && message.data) {
        handleVoiceSignalFromServer(message.data);
        return;
    }
    if (message.type !== 'chat' || !message.data) {
        return;
    }
    const entry = message.data;
    if (!entry.id || messageIdSet.has(entry.id)) {
        return;
    }
    messageIdSet.add(entry.id);
    const activeUid = activeFriend.value?.uid;
    if (entry.targetType === 'private') {
        const otherUid =
            entry.senderUid === auth.value.uid ? entry.targetUid : entry.senderUid;
        if (entry.senderUid !== auth.value.uid) {
            const blockedAt = getBlockedAt(entry.senderUid);
            const createdAt = entry.createdAt ? Date.parse(entry.createdAt) : 0;
            if (blockedAt && createdAt && createdAt > blockedAt) {
                return;
            }
        }
        updateRecentChat(otherUid);
    }
    if (entry.senderUid !== auth.value.uid) {
        if (!mutedUids.value.includes(entry.senderUid)) {
            playNotifySound();
            flashWindow();
        }
        if (entry.targetType === 'private' && entry.senderUid !== activeUid) {
            markUnread(entry.senderUid);
        }
    }
    if (
        entry.targetType === 'private' &&
        activeUid &&
        ((entry.senderUid === auth.value.uid && entry.targetUid === activeUid) ||
            (entry.senderUid === activeUid && entry.targetUid === auth.value.uid))
    ) {
        messages.value = [...messages.value, entry];
        nextTick(() => {
            scrollToBottom();
        });
    } else if (entry.targetType === 'private' && entry.senderUid !== auth.value.uid) {
        const isViewingChat = activeView.value === 'chat';
        const isActiveSender = activeUid && entry.senderUid === activeUid;
        if (!isViewingChat || !isActiveSender) {
            incrementUnread(entry.senderUid);
        }
    }
};

const connectWebSocket = () => {
    if (!auth.value.token) {
        return;
    }
    closeWebSocket();
    const ws = new WebSocket(buildWsUrl());
    wsRef.value = ws;
    ws.onopen = () => {
        wsReconnectAttempts = 0;
        wsHeartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, HEARTBEAT_INTERVAL_MS);
        wsPresenceTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'presence_request' }));
            }
        }, PRESENCE_REQUEST_INTERVAL_MS);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
            ws.send(JSON.stringify({ type: 'presence_request' }));
        }
        if (voiceSignalQueue.value.length) {
            const queued = [...voiceSignalQueue.value];
            voiceSignalQueue.value = [];
            queued.forEach((payload) => {
                ws.send(
                    JSON.stringify({
                        type: 'voice_signal',
                        data: payload
                    })
                );
            });
        }
        loadFriends({ silent: true });
        loadRequests({ silent: true });
    };
    ws.onmessage = (event) => handleWsMessage(event.data);
    ws.onerror = () => {
        scheduleReconnect();
    };
    ws.onclose = () => {
        if (wsHeartbeatTimer) {
            clearInterval(wsHeartbeatTimer);
            wsHeartbeatTimer = null;
        }
        if (wsPresenceTimer) {
            clearInterval(wsPresenceTimer);
            wsPresenceTimer = null;
        }
        scheduleReconnect();
    };
};
const openContacts = async () => {
    activeView.value = 'contacts';
    await loadRequests({ silent: true });
};

const getUnreadCount = (uid) => {
    const key = String(uid ?? '');
    return unreadByUid.value[key] || 0;
};

const setUnreadCount = (uid, count) => {
    const key = String(uid ?? '');
    const next = { ...unreadByUid.value };
    if (!count) {
        delete next[key];
    } else {
        next[key] = count;
    }
    unreadByUid.value = next;
};

const incrementUnread = (uid) => {
    if (!uid) return;
    const current = getUnreadCount(uid);
    setUnreadCount(uid, current + 1);
};

const totalUnread = computed(() => {
    return Object.values(unreadByUid.value).reduce((sum, count) => sum + count, 0);
});

const formatUnread = (count) => {
    if (!count) return '';
    return count > 99 ? '99+' : String(count);
};
const toggleSendMenu = () => {
    showSendMenu.value = !showSendMenu.value;
};

const toggleMorePanel = () => {
    showMorePanel.value = !showMorePanel.value;
};

const toggleRemoteMenu = () => {
    showRemoteMenu.value = !showRemoteMenu.value;
};

const closeMorePanel = () => {
    showMorePanel.value = false;
};

const toggleActivePinned = () => {
    const uid = activeFriend.value?.uid;
    if (!uid) return;
    updatePinned(uid);
};

const toggleActiveMuted = () => {
    const uid = activeFriend.value?.uid;
    if (!uid) return;
    updateMuted(uid);
};

const clearActiveChat = () => {
    if (!activeFriend.value?.uid) return;
    messages.value = [];
    localMessages.value = [];
    messageIdSet = new Set();
    lastMessageSignature.value = '';
};

const handlePanelAction = (type) => {
    const uid = activeFriend.value?.uid;
    if (!uid && type !== 'report') return;
    if (type === 'block') {
        updateBlocked(uid);
        if (blockedUids.value.includes(uid)) {
            blockNotice.value = { uid, text: '你已屏蔽来自该好友的消息' };
        } else {
            blockNotice.value = { uid, text: '你已允许接受该好友的消息' };
        }
        closeMorePanel();
        return;
    }
    if (type === 'clear') {
        clearActiveChat();
        closeMorePanel();
        return;
    }
    const labelMap = {
        files: '文件传输列表',
        remove: '删除好友',
        report: '举报该用户'
    };
    if (labelMap[type]) {
        statusText.value = `${labelMap[type]}功能未接入`;
    }
    closeMorePanel();
};

const emojiTabs = [
    { id: 'recent', label: '最近' },
    { id: 'smileys', label: '表情' },
    { id: 'gestures', label: '手势' },
    { id: 'nature', label: '自然' },
    { id: 'food', label: '美食' },
    { id: 'objects', label: '物品' }
];

const emojiCatalog = {
    smileys: [
        '😀',
        '😁',
        '😂',
        '🤣',
        '😅',
        '😊',
        '😍',
        '😘',
        '😜',
        '🤪',
        '🤩',
        '😎',
        '🥳',
        '😇',
        '🙂',
        '🙃',
        '😌',
        '😴',
        '🤔',
        '😮',
        '😱',
        '😤',
        '😭',
        '😡',
        '🤯',
        '😬',
        '😷',
        '🤒',
        '🤕',
        '🤢',
        '😈',
        '👿'
    ],
    gestures: [
        '👍',
        '👎',
        '👌',
        '✌️',
        '🤞',
        '🤟',
        '🤘',
        '🤙',
        '👋',
        '🤚',
        '🖐️',
        '👏',
        '🙏',
        '💪',
        '🫶',
        '👐',
        '🤝',
        '☝️',
        '👇',
        '👉',
        '👈',
        '🙌'
    ],
    nature: [
        '🐶',
        '🐱',
        '🐻',
        '🐼',
        '🦊',
        '🐯',
        '🦁',
        '🐮',
        '🐷',
        '🐵',
        '🐸',
        '🐔',
        '🐧',
        '🐦',
        '🦄',
        '🐝',
        '🐢',
        '🐬',
        '🐳',
        '🌸',
        '🌻',
        '🌙',
        '⭐',
        '⚡',
        '🔥',
        '🌈'
    ],
    food: [
        '🍎',
        '🍉',
        '🍊',
        '🍓',
        '🍒',
        '🍑',
        '🥭',
        '🍍',
        '🥑',
        '🍅',
        '🥕',
        '🌽',
        '🍞',
        '🥐',
        '🧀',
        '🍔',
        '🍟',
        '🍕',
        '🍜',
        '🍣',
        '🍰',
        '🍫',
        '🍿',
        '🍩'
    ],
    objects: [
        '🎉',
        '🎁',
        '🎈',
        '🎀',
        '📌',
        '📎',
        '✏️',
        '🖊️',
        '📷',
        '🎧',
        '🎮',
        '💻',
        '📱',
        '📚',
        '🧸',
        '🕯️',
        '🧩',
        '🪄',
        '🗂️',
        '🛎️',
        '🔔',
        '💡',
        '🧷',
        '🧻'
    ]
};

const currentEmojiList = computed(() => {
    if (emojiTab.value === 'recent') {
        if (recentEmojis.value.length) {
            return recentEmojis.value;
        }
        return emojiCatalog.smileys.slice(0, 24);
    }
    return emojiCatalog[emojiTab.value] || [];
});

const updateEmojiPanelPosition = async () => {
    await nextTick();
    const picker = emojiPickerRef.value;
    const trigger = emojiButtonRef.value;
    if (!picker || !trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const margin = 10;
    let left = triggerRect.left + triggerRect.width / 2 - pickerRect.width / 2;
    let top = triggerRect.top - pickerRect.height - margin;
    if (top < margin) {
        top = triggerRect.bottom + margin;
    }
    if (left + pickerRect.width > window.innerWidth - margin) {
        left = window.innerWidth - pickerRect.width - margin;
    }
    if (left < margin) {
        left = margin;
    }
    emojiPanelStyle.value = {
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`
    };
};

const contactGroupDefs = [
    { key: 'devices', label: '我的设备' },
    { key: 'bots', label: '机器人' },
    { key: 'star', label: '特别关心' },
    { key: 'friends', label: '我的好友' },
    { key: 'friends_group', label: '朋友' },
    { key: 'family', label: '家人' },
    { key: 'classmates', label: '同学' },
    { key: 'cute', label: '么么哒' }
];

const isContactGroupOpen = (key) => {
    if (typeof contactGroupOpen.value[key] === 'boolean') {
        return contactGroupOpen.value[key];
    }
    return false;
};

const toggleContactGroup = (key) => {
    contactGroupOpen.value = {
        ...contactGroupOpen.value,
        [key]: !isContactGroupOpen(key)
    };
};

const groupCountText = (group) => {
    if (!group) return '0/0';
    return `${group.online}/${group.total}`;
};

const contactGroups = computed(() => {
    const map = new Map(contactGroupDefs.map((def) => [def.key, []]));
    friends.value.forEach((friend) => {
        map.get('friends')?.push(friend);
    });
    return contactGroupDefs.map((def) => {
        const items = map.get(def.key) || [];
        const online = items.filter((item) => item.online === true).length;
        return {
            ...def,
            items,
            total: items.length,
            online
        };
    });
});

const toggleEmojiPicker = async () => {
    showEmojiPicker.value = !showEmojiPicker.value;
    if (showEmojiPicker.value) {
        await updateEmojiPanelPosition();
    }
};

const closeEmojiPicker = () => {
    showEmojiPicker.value = false;
};

const insertAtCursor = (emoji) => {
    const el = composerTextareaRef.value;
    if (!el) {
        draft.value += emoji;
        return;
    }
    const start = Number.isInteger(el.selectionStart)
        ? el.selectionStart
        : draft.value.length;
    const end = Number.isInteger(el.selectionEnd) ? el.selectionEnd : start;
    const current = draft.value;
    draft.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    nextTick(() => {
        el.focus();
        const nextPos = start + emoji.length;
        el.setSelectionRange(nextPos, nextPos);
    });
};

const addEmoji = (emoji) => {
    insertAtCursor(emoji);
    const next = [emoji, ...recentEmojis.value.filter((item) => item !== emoji)];
    recentEmojis.value = next.slice(0, 32);
};

const handleDocumentClick = (event) => {
    if (showSendMenu.value) {
        showSendMenu.value = false;
    }
    if (showListMenu.value) {
        const menu = listMenuRef.value;
        if (!menu || !menu.contains(event.target)) {
            closeListMenu();
        }
    }
    if (showEmojiPicker.value) {
        const picker = emojiPickerRef.value;
        const trigger = emojiButtonRef.value;
        if (
            picker &&
            trigger &&
            !picker.contains(event.target) &&
            !trigger.contains(event.target)
        ) {
            closeEmojiPicker();
        }
    }
    if (showRemoteMenu.value) {
        const remote = event.target?.closest?.('.chat-action-remote');
        if (!remote) {
            showRemoteMenu.value = false;
        }
    }
    if (showMorePanel.value) {
        const panel = morePanelRef.value;
        if (!panel || !panel.contains(event.target)) {
            closeMorePanel();
        }
    }
    if (
        isFriendProfileVisible.value &&
        friendProfileRef.value &&
        !friendProfileRef.value.contains(event.target)
    ) {
        isFriendProfileVisible.value = false;
    }
};

const displayName = computed(() => {
    return auth.value.nickname || auth.value.username || `用户${auth.value.uid || ''}`;
});

const initials = computed(() => {
    const name = auth.value.username || 'ME';
    return name.slice(0, 2).toUpperCase();
});

const signature = computed(() => {
    return auth.value.signature || '这个人很神秘，暂未填写签名';
});

const friendDisplayName = computed(() => {
    if (!friendProfileSource.value) return '';
    return (
        friendProfileSource.value.nickname ||
        friendProfileSource.value.username ||
        `用户${friendProfileSource.value.uid || ''}`
    );
});

const friendInitials = computed(() => {
    const base =
        friendProfileSource.value?.username || friendDisplayName.value || '??';
    return String(base).slice(0, 2).toUpperCase();
});

const friendSignature = computed(() => {
    return friendProfileSource.value?.signature || '这个人很神秘，暂未填写签名';
});

const friendProfileSource = computed(() => friendProfile.value || activeFriend.value);

const contactProfileSource = computed(() => contactProfile.value || selectedContact.value);

const contactDisplayName = computed(() => {
    if (!contactProfileSource.value) return '';
    return (
        contactProfileSource.value.nickname ||
        contactProfileSource.value.username ||
        `用户${contactProfileSource.value.uid || ''}`
    );
});

const contactInitials = computed(() => {
    const base =
        contactProfileSource.value?.username || contactDisplayName.value || '??';
    return String(base).slice(0, 2).toUpperCase();
});

const contactSignature = computed(() => {
    return contactProfileSource.value?.signature || '这个人很神秘，暂未填写签名';
});
const isActivePinned = computed(() => {
    const uid = activeFriend.value?.uid;
    return uid ? isPinned(uid) : false;
});

const isActiveMuted = computed(() => {
    const uid = activeFriend.value?.uid;
    return uid ? isMuted(uid) : false;
});

const isActiveBlocked = computed(() => {
    const uid = activeFriend.value?.uid;
    return uid ? isBlocked(uid) : false;
});

const blockNoticeText = computed(() => {
    if (!blockNotice.value?.uid) return '';
    if (blockNotice.value.uid !== activeFriend.value?.uid) return '';
    return blockNotice.value.text || '';
});

const blockActionLabel = computed(() =>
    isActiveBlocked.value ? '取消屏蔽此人' : '屏蔽此人'
);

const shareTargets = computed(() => {
    const query = shareQuery.value.trim().toLowerCase();
    const list = friends.value || [];
    const entries = list
        .filter((item) => recentChatMap.value?.[item.uid])
        .sort((a, b) => {
            const aTime = Number(recentChatMap.value?.[a.uid]) || 0;
            const bTime = Number(recentChatMap.value?.[b.uid]) || 0;
            return bTime - aTime;
        });
    if (!query) return entries;
    return entries.filter(
        (item) =>
            item.username?.toLowerCase().includes(query) ||
            item.nickname?.toLowerCase().includes(query) ||
            String(item.uid).includes(query)
    );
});

const shareTargetName = computed(() => {
    const target = shareTargets.value.find((item) => item.uid === shareTargetUid.value);
    return target?.nickname || target?.username || '';
});

const shareCardName = computed(() => {
    const source = shareCardSource.value;
    if (!source) return '';
    return source.nickname || source.username || `用户${source.uid || ''}`;
});

const shareCardUid = computed(() => shareCardSource.value?.uid || '');

const shareCardAvatar = computed(() => shareCardSource.value?.avatar || '');

const shareCardInitials = computed(() => {
    const source = shareCardSource.value;
    const base = source?.username || shareCardName.value || '??';
    return String(base).slice(0, 2).toUpperCase();
});

const nicknameCount = computed(() => editForm.value.nickname.length);
const signatureCount = computed(() => editForm.value.signature.length);

const cropImageStyle = computed(() => {
    if (!cropSource.value) return {};
    const scale = cropBaseScale.value * cropScale.value;
    return {
        width: `${cropImage.value.width}px`,
        height: `${cropImage.value.height}px`,
        transform: `translate(-50%, -50%) translate(${cropOffset.value.x}px, ${cropOffset.value.y}px) scale(${scale})`
    };
});

watch(
    () => editForm.value.nickname,
    (value) => {
        if (nicknameInvalid.value && value?.trim()) {
            nicknameInvalid.value = false;
        }
    }
);

watch(
    () => cropScale.value,
    () => {
        const scale = cropBaseScale.value * cropScale.value;
        cropOffset.value = clampCropOffset(cropOffset.value, scale);
    }
);

const filteredFriends = computed(() => {
    const query = searchText.value.trim().toLowerCase();
    const base = !query
        ? friends.value.filter((item) => !isHidden(item.uid))
        : friends.value.filter(
              (item) =>
                  item.username?.toLowerCase().includes(query) ||
                  String(item.uid).includes(query)
          );
    if (!pinnedUids.value.length) return base;
    const pinnedSet = new Set(pinnedUids.value);
    const pinned = [];
    const rest = [];
    base.forEach((item) => {
        if (pinnedSet.has(item.uid)) {
            pinned.push(item);
        } else {
            rest.push(item);
        }
    });
    return [...pinned, ...rest];
});

const canSend = computed(() => {
    return (
        !!auth.value.token &&
        !!activeFriend.value?.uid &&
        (draft.value.trim().length > 0 || draftImages.value.length > 0)
    );
});

const canSendFile = computed(() => {
    return (
        !!auth.value.token &&
        !!activeFriend.value?.uid &&
        !!fileDraft.value?.file
    );
});

const activeFriendOnline = computed(() => {
    if (!activeFriend.value) return false;
    return activeFriend.value.online === true;
});

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (value) => {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    const num = size / Math.pow(1024, index);
    return `${num.toFixed(num >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const renderMessage = (msg) => {
    if (msg.type === 'text') {
        return sanitizeText(msg.data?.content || '');
    }
    if (msg.type === 'image') return '[图片消息]';
    if (msg.type === 'video') return '[视频消息]';
    if (msg.type === 'voice') return '[语音消息]';
    if (msg.type === 'gif') return '[GIF 表情]';
    if (msg.type === 'file') return '[文件]';
    if (msg.type === 'card') return '[名片]';
    return '[未知消息]';
};

const getCardPayload = (msg) => {
    if (msg?.type !== 'card') return {};
    const card = msg.data?.card;
    return card && typeof card === 'object' ? card : {};
};

const getCardName = (msg) => {
    const card = getCardPayload(msg);
    const name = card.nickname || card.username || `用户${card.uid || ''}`;
    return sanitizeText(name);
};

const getCardUid = (msg) => {
    const card = getCardPayload(msg);
    return card.uid || '---';
};

const getCardAvatar = (msg) => {
    const card = getCardPayload(msg);
    return typeof card.avatar === 'string' ? card.avatar : '';
};

const getCardInitials = (msg) => {
    const card = getCardPayload(msg);
    const base = card.username || card.nickname || '??';
    return String(base).slice(0, 2).toUpperCase();
};

const getCardNote = (msg) => {
    const note = msg?.data?.note;
    return typeof note === 'string' ? sanitizeText(note) : '';
};

const getMessageFile = (msg) => {
    if (msg?.type !== 'file') return {};
    return msg.data || {};
};

const getMessageFileName = (msg) => {
    const name = getMessageFile(msg).name;
    return sanitizeText(typeof name === 'string' ? name : '未知文件');
};

const getMessageFileSize = (msg) => {
    const size = getMessageFile(msg).size;
    return Number.isFinite(Number(size)) ? Number(size) : 0;
};

const getMessageFileUrl = (msg) => {
    const url = getMessageFile(msg).url;
    return typeof url === 'string' ? url.trim() : '';
};

const getDownloadedPath = (msg) => {
    const url = getMessageFileUrl(msg);
    if (!url) return '';
    return downloadedFileByUrl.value[url] || '';
};

const hasDownloadedFile = (msg) => !!getDownloadedPath(msg);

const isFileExpired = (msg) => {
    if (msg?.type !== 'file') return false;
    const expiresAt = msg.data?.expiresAt;
    if (expiresAt) {
        const parsed = Date.parse(expiresAt);
        return Number.isFinite(parsed) && parsed <= Date.now();
    }
    const uploadedAt = msg.data?.uploadedAt;
    if (uploadedAt) {
        const parsed = Date.parse(uploadedAt);
        return Number.isFinite(parsed) && parsed + FILE_TTL_MS <= Date.now();
    }
    return false;
};

const refreshDownloadStatus = async (msg) => {
    const url = getMessageFileUrl(msg);
    if (!url || !window.electronAPI?.checkDownloadedFile) return;
    if (isFileExpired(msg)) return;
    const name = getMessageFileName(msg);
    const currentPath = downloadedFileByUrl.value[url] || '';
    try {
        const result = await window.electronAPI.checkDownloadedFile({
            name,
            path: currentPath
        });
        if (result?.path) {
            const next = {
                ...downloadedFileByUrl.value,
                [url]: result.path
            };
            downloadedFileByUrl.value = next;
            saveDownloadMap(next);
        } else if (currentPath) {
            const next = { ...downloadedFileByUrl.value };
            delete next[url];
            downloadedFileByUrl.value = next;
            saveDownloadMap(next);
        }
    } catch {}
};

const downloadFileMessage = async (msg) => {
    const url = getMessageFileUrl(msg);
    if (!url) return;
    if (isFileExpired(msg)) {
        statusText.value = '文件已过期';
        return;
    }
    const name = getMessageFileName(msg);
    const existingPath = getDownloadedPath(msg);
    if (existingPath && window.electronAPI?.openPath) {
        try {
            await window.electronAPI.openPath(existingPath);
        } catch {
            const next = { ...downloadedFileByUrl.value };
            delete next[url];
            downloadedFileByUrl.value = next;
            saveDownloadMap(next);
            statusText.value = '文件打开失败，已重新下载';
        }
        if (getDownloadedPath(msg)) return;
    }
    if (window.electronAPI?.downloadFile) {
        try {
            statusText.value = '正在下载文件...';
            const result = await window.electronAPI.downloadFile({ url, name });
            if (result?.path) {
                const next = {
                    ...downloadedFileByUrl.value,
                    [url]: result.path
                };
                downloadedFileByUrl.value = next;
                saveDownloadMap(next);
            }
            statusText.value = '文件已保存到下载文件夹';
        } catch {
            statusText.value = '文件下载失败';
        }
        return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = name || '';
    link.rel = 'noopener';
    link.click();
};

const updateVoiceDomain = async () => {
    if (!auth.value.token) return;
    const domain = window.location.host || '';
    if (!domain) return;
    try {
        await fetch(`${API_BASE}/api/voice/domain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({ domain })
        });
    } catch {}
};

const fetchVoiceContact = async (uid) => {
    if (!auth.value.token || !uid) return null;
    try {
        const res = await fetch(`${API_BASE}/api/voice/contact?uid=${uid}`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.data) {
            return data.data;
        }
    } catch {}
    return null;
};

const sendVoiceSignalToServer = (payload) => {
    const ws = wsRef.value;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        voiceSignalQueue.value = [...voiceSignalQueue.value, payload];
        return;
    }
    ws.send(
        JSON.stringify({
            type: 'voice_signal',
            data: payload
        })
    );
};

const openVoiceCallWindow = (payload) => {
    window.electronAPI?.openVoiceCall?.(payload);
};

const startVoiceCall = async () => {
    if (!activeFriend.value?.uid) {
        statusText.value = '请先选择好友';
        return;
    }
    const targetUid = activeFriend.value.uid;
    await fetchVoiceContact(targetUid);
    openVoiceCallWindow({
        mode: 'caller',
        targetUid,
        targetName: activeFriend.value.username || `UID ${targetUid}`
    });
};

const handleVoiceSignalFromServer = (data) => {
    const fromUid = Number(data?.fromUid);
    const signal = data?.signal;
    if (!Number.isInteger(fromUid) || !signal?.type) return;
    if (signal.type === 'offer') {
        const friend = friends.value.find((item) => item.uid === fromUid);
        openVoiceCallWindow({
            mode: 'incoming',
            targetUid: fromUid,
            targetName: friend?.username || `UID ${fromUid}`
        });
    }
    window.electronAPI?.forwardVoiceSignal?.({ fromUid, signal });
};

const getMessageImageUrls = (msg) => {
    if (msg?.type !== 'image') return [];
    if (Array.isArray(msg.data?.urls)) {
        return msg.data.urls.filter((item) => typeof item === 'string' && item.trim());
    }
    const url = msg.data?.url || msg.data?.content || '';
    return typeof url === 'string' && url.trim() ? [url] : [];
};

const getMessageImageCaption = (msg) => {
    if (msg?.type !== 'image') return '';
    const caption = msg.data?.content || '';
    return sanitizeText(caption).trim();
};

const isImageOnlyMessage = (msg) => {
    if (msg?.type !== 'image') return false;
    return !getMessageImageCaption(msg);
};

const openImagePreview = (url) => {
    if (!url) return;
    window.electronAPI?.openImagePreview?.(url);
};

const selectFriendByUid = async (uid) => {
    if (!uid) return false;
    const friend = friends.value.find((item) => item.uid === uid);
    if (!friend) return false;
    activeView.value = 'chat';
    await selectFriend(friend);
    return true;
};

const handleOpenChatPayload = async (payload) => {
    const uid = Number(payload?.uid);
    if (!Number.isFinite(uid)) return;
    pendingChatUid.value = uid;
    if (await selectFriendByUid(uid)) {
        pendingChatUid.value = null;
    }
};

if (window.electronAPI?.onOpenChat) {
    window.electronAPI.onOpenChat((payload) => {
        handleOpenChatPayload(payload);
    });
}

const displayMessages = computed(() => {
    const targetUid = activeFriend.value?.uid;
    const localForTarget = targetUid
        ? localMessages.value.filter((item) => item.targetUid === targetUid)
        : [];
    const combined = [...messages.value, ...localForTarget];
    const blockedAt = getBlockedAt(targetUid);
    const filtered = blockedAt
        ? combined.filter((item) => {
              if (item.senderUid !== targetUid) return true;
              const createdAt = item.createdAt ? Date.parse(item.createdAt) : 0;
              return !createdAt || createdAt <= blockedAt;
          })
        : combined;
    return filtered.slice().sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return aTime - bTime;
    });
});

const noticeTitle = computed(() =>
    contactsNoticeType.value === 'group' ? '群通知' : '好友通知'
);

const contactsPanelTitle = computed(() => {
    if (selectedContact.value) {
        return contactDisplayName.value || '好友资料';
    }
    return noticeTitle.value;
});

const loadRequests = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/requests`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            incomingRequests.value = data.incoming || [];
            outgoingRequests.value = data.outgoing || [];
        }
    } catch (err) {
        if (!silent) {
            statusText.value = '好友通知加载失败';
        }
    }
};

const handleRequestAction = async (uid, action) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({ requesterUid: uid, action })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            await loadFriends({ silent: true });
            await loadRequests({ silent: true });
        } else {
            statusText.value = data?.message || '处理失败';
        }
    } catch (err) {
        statusText.value = '处理失败';
    }
};

const authHeader = () => {
    if (!auth.value.token) return {};
    return { Authorization: `Bearer ${auth.value.token}` };
};

const playNotifySound = () => {
    try {
        const audio = new Audio(NOTIFY_SOUND_URL);
        audio.play().catch(() => {});
    } catch {}
};

const loadProfile = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            const next = {
                uid: data.user.uid || auth.value.uid,
                username: data.user.username || auth.value.username,
                nickname: data.user.nickname || auth.value.nickname,
                signature: data.user.signature || auth.value.signature,
                avatar: data.user.avatar || auth.value.avatar,
                gender: data.user.gender || auth.value.gender,
                birthday: data.user.birthday || auth.value.birthday,
                country: data.user.country || auth.value.country,
                province: data.user.province || auth.value.province,
                region: data.user.region || auth.value.region
            };
            const changed = Object.keys(next).some(
                (key) => next[key] !== auth.value[key]
            );
            if (changed) {
                auth.value = {
                    ...auth.value,
                    ...next
                };
                try {
                    localStorage.setItem('vp_username', auth.value.username || '');
                    localStorage.setItem('vp_nickname', auth.value.nickname || '');
                    localStorage.setItem('vp_signature', auth.value.signature || '');
                } catch {}
            }
        }
    } catch (error) {
        if (!silent) {
            console.warn('Profile refresh failed', error);
        }
    }
};
const loadAuth = async () => {
    const info = await window.electronAPI?.getAuthToken?.();
    if (info?.token) {
        auth.value = {
            token: info.token,
            uid: info.uid,
            username: info.username || '',
            nickname: info.nickname || '',
            signature: info.signature || '',
            avatar: info.avatar || '',
            gender: info.gender || '',
            birthday: info.birthday || '',
            country: info.country || '',
            province: info.province || '',
            region: info.region || ''
        };
    } else {
        const fallback = localStorage.getItem('vp_username');
        const fallbackNickname = localStorage.getItem('vp_nickname');
        const fallbackSignature = localStorage.getItem('vp_signature');
        auth.value = {
            token: '',
            uid: null,
            username: fallback || '',
            nickname: fallbackNickname || '',
            signature: fallbackSignature || '',
            avatar: '',
            gender: '',
            birthday: '',
            country: '',
            province: '',
            region: ''
        };
    }
};

const buildFriendSignature = (items) => {
    return items
        .map((item) => `${item.uid}-${item.username}-${item.online ? 1 : 0}`)
        .join('|');
};

const applyPresenceUpdate = (entry) => {
    const uid = Number(entry?.uid);
    if (!Number.isInteger(uid)) return;
    const online = entry?.online === true;
    presenceOverrides.set(uid, online);
    const index = friends.value.findIndex((item) => item.uid === uid);
    if (index === -1) {
        return;
    }
    if (friends.value[index].online === online) return;
    const next = friends.value.slice();
    next[index] = { ...next[index], online };
    friends.value = next;
    lastFriendSignature.value = buildFriendSignature(next);
    if (activeFriend.value?.uid === uid) {
        activeFriend.value = next[index];
    }
};

const buildMessageSignature = (items) => {
    if (!items.length) return '';
    const last = items[items.length - 1];
    return `${items.length}-${last.id}-${last.createdAt}`;
};

const loadFriends = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/list`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.friends || [];
            if (presenceOverrides.size) {
                next.forEach((item) => {
                    if (presenceOverrides.has(item.uid)) {
                        item.online = presenceOverrides.get(item.uid) === true;
                    }
                });
            }
            const signature = buildFriendSignature(next);
            if (signature !== lastFriendSignature.value) {
                friends.value = next;
                lastFriendSignature.value = signature;
            }
            if (activeFriend.value) {
                const refreshed = next.find((item) => item.uid === activeFriend.value.uid);
                if (refreshed && refreshed !== activeFriend.value) {
                    activeFriend.value = refreshed;
                }
            } else if (friends.value.length) {
                selectFriend(friends.value[0]);
            }
            const knownUids = new Set(next.map((item) => item.uid));
            if (pinnedUids.value.some((uid) => !knownUids.has(uid))) {
                pinnedUids.value = pinnedUids.value.filter((uid) => knownUids.has(uid));
                saveUidList('vp_pinned_uids', pinnedUids.value);
            }
            if (mutedUids.value.some((uid) => !knownUids.has(uid))) {
                mutedUids.value = mutedUids.value.filter((uid) => knownUids.has(uid));
                saveUidList('vp_muted_uids', mutedUids.value);
            }
            if (hiddenUids.value.some((uid) => !knownUids.has(uid))) {
                hiddenUids.value = hiddenUids.value.filter((uid) => knownUids.has(uid));
                saveUidList('vp_hidden_uids', hiddenUids.value);
            }
            if (blockedUids.value.some((uid) => !knownUids.has(uid))) {
                blockedUids.value = blockedUids.value.filter((uid) => knownUids.has(uid));
                saveUidList('vp_blocked_uids', blockedUids.value);
            }
            const blockedAtEntries = Object.keys(blockedAtByUid.value || {});
            if (blockedAtEntries.some((uid) => !knownUids.has(Number(uid)))) {
                const next = {};
                blockedAtEntries.forEach((uid) => {
                    const num = Number(uid);
                    if (knownUids.has(num)) {
                        next[uid] = blockedAtByUid.value[uid];
                    }
                });
                blockedAtByUid.value = next;
                saveUidMap('vp_blocked_at', next);
            }
            const recentEntries = Object.keys(recentChatMap.value || {});
            if (recentEntries.some((uid) => !knownUids.has(Number(uid)))) {
                const next = {};
                recentEntries.forEach((uid) => {
                    const num = Number(uid);
                    if (knownUids.has(num)) {
                        next[uid] = recentChatMap.value[uid];
                    }
                });
                recentChatMap.value = next;
                saveUidMap('vp_recent_chats', next);
            }
            if (pendingChatUid.value) {
                const target = next.find((item) => item.uid === pendingChatUid.value);
                if (target) {
                    pendingChatUid.value = null;
                    selectFriend(target);
                }
            }
        }
    } catch (err) {
        if (!silent) {
            statusText.value = '好友加载失败';
        }
    }
};

const loadMessages = async (targetUid, { silent, forceScroll, appendOlder } = {}) => {
    if (!auth.value.token || !targetUid) return;
    if (!silent && !appendOlder) {
        loading.value = true;
    }
    try {
        const beforeId = appendOlder ? oldestMessageId.value : '';
        const url = `${API_BASE}/api/chat/get?targetType=private&targetUid=${targetUid}&limit=${MESSAGE_PAGE_SIZE}${
            beforeId ? `&beforeId=${encodeURIComponent(beforeId)}` : ''
        }`;
        const res = await fetch(url, { headers: authHeader() });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.data || [];
            if (appendOlder) {
                if (!next.length) {
                    hasMoreMessages.value = false;
                    return;
                }
                const chatBody = chatBodyRef.value;
                const prevScrollHeight = chatBody?.scrollHeight || 0;
                const prevScrollTop = chatBody?.scrollTop || 0;
                const deduped = next.filter((item) => !messageIdSet.has(item.id));
                if (deduped.length) {
                    messages.value = [...deduped, ...messages.value];
                    deduped.forEach((item) => messageIdSet.add(item.id));
                }
                oldestMessageId.value = messages.value[0]?.id || oldestMessageId.value;
                hasMoreMessages.value = next.length >= MESSAGE_PAGE_SIZE;
                lastMessageSignature.value = buildMessageSignature(messages.value);
                await nextTick();
                if (chatBody) {
                    const nextScrollHeight = chatBody.scrollHeight;
                    chatBody.scrollTop = nextScrollHeight - prevScrollHeight + prevScrollTop;
                }
                return;
            }
            const signature = buildMessageSignature(next);
            const shouldStick = forceScroll ? true : isAtBottom();
            messages.value = next;
            messageIdSet = new Set(next.map((item) => item.id).filter(Boolean));
            lastMessageSignature.value = signature;
            oldestMessageId.value = next[0]?.id || '';
            hasMoreMessages.value = next.length >= MESSAGE_PAGE_SIZE;
            if (shouldStick) {
                await nextTick();
                scheduleScrollToBottom();
            }
            if (forceScroll && signature === lastMessageSignature.value) {
                await nextTick();
                scheduleScrollToBottom();
            }
        } else {
            if (!silent && !appendOlder) {
                messages.value = [];
                messageIdSet = new Set();
                lastMessageSignature.value = '';
                oldestMessageId.value = '';
                hasMoreMessages.value = false;
            }
        }
    } catch (err) {
        if (!silent && !appendOlder) {
            messages.value = [];
            messageIdSet = new Set();
            lastMessageSignature.value = '';
            oldestMessageId.value = '';
            hasMoreMessages.value = false;
        }
    } finally {
        if (!silent && !appendOlder) {
            loading.value = false;
        }
    }
};

const handleChatScroll = async () => {
    if (isLoadingMore.value || !hasMoreMessages.value) return;
    const el = chatBodyRef.value;
    if (!el || el.scrollTop > 24) return;
    if (!activeFriend.value?.uid) return;
    isLoadingMore.value = true;
    try {
        await loadMessages(activeFriend.value.uid, { appendOlder: true, silent: true });
    } finally {
        isLoadingMore.value = false;
    }
};

const selectFriend = async (friend) => {
    activeFriend.value = friend;
    setUnreadCount(friend.uid, 0);
    clearUnread(friend?.uid);
    updateRecentChat(friend?.uid);
    closeListMenu();
    await loadMessages(friend.uid, { forceScroll: true });
    await nextTick();
    scheduleScrollToBottom();
};

const openContactProfile = async (friend) => {
    if (!friend) return;
    selectedContact.value = friend;
    if (contactProfile.value?.uid !== friend.uid) {
        contactProfile.value = null;
    }
    loadContactProfile(friend.uid);
};

const clearContactProfile = () => {
    selectedContact.value = null;
    contactProfile.value = null;
};

const enterChatFromContact = async () => {
    const target = selectedContact.value;
    if (!target?.uid) return;
    showInChatList(target.uid);
    activeView.value = 'chat';
    await selectFriend(target);
};

const startVoiceCallFromContact = async () => {
    const target = contactProfileSource.value || selectedContact.value;
    if (!target?.uid) {
        statusText.value = '请先选择好友';
        return;
    }
    showInChatList(target.uid);
    activeView.value = 'chat';
    await selectFriend(target);
    await startVoiceCall();
};

const openSharePanel = () => {
    const source = contactProfileSource.value || selectedContact.value;
    if (!source?.uid) return;
    shareCardSource.value = source;
    shareQuery.value = '';
    shareNote.value = '';
    const list = shareTargets.value;
    shareTargetUid.value = list.length ? list[0].uid : null;
    showSharePanel.value = true;
};

const closeSharePanel = () => {
    showSharePanel.value = false;
    resetSharePanelState();
};

const confirmShareCard = async () => {
    const targetUid = shareTargetUid.value;
    const source = shareCardSource.value;
    if (!targetUid || !source?.uid) {
        statusText.value = '请选择分享对象';
        return;
    }
    const card = {
        uid: source.uid,
        username: source.username || '',
        nickname: source.nickname || '',
        avatar: source.avatar || ''
    };
    const note = sanitizeText(shareNote.value).trim();
    const ok = await sendChatEntryTo({
        type: 'card',
        targetUid,
        data: { card, note },
        payload: { card, note }
    });
    if (ok) {
        updateRecentChat(targetUid);
        statusText.value = '名片已分享';
        closeSharePanel();
    }
};

const sendChatEntryTo = async ({ type, data, payload, targetUid }) => {
    if (!targetUid) return false;
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localEntry = {
        id: localId,
        type,
        senderUid: auth.value.uid,
        targetUid,
        targetType: 'private',
        data,
        createdAt: new Date().toISOString(),
        pending: true,
        error: false
    };
    localMessages.value = [...localMessages.value, localEntry];
    try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({
                senderUid: auth.value.uid,
                targetUid,
                targetType: 'private',
                type,
                ...payload
            })
        });
        const result = await res.json();
        if (res.ok && result?.success) {
            if (result.data?.id && !messageIdSet.has(result.data.id)) {
                messageIdSet.add(result.data.id);
                if (activeFriend.value?.uid === targetUid) {
                    messages.value = [...messages.value, result.data];
                }
            }
            if (activeFriend.value?.uid === targetUid) {
                await nextTick();
                scrollToBottom();
            }
            localMessages.value = localMessages.value.filter((item) => item.id !== localId);
            updateRecentChat(targetUid);
            return true;
        }
        localMessages.value = localMessages.value.map((item) =>
            item.id === localId ? { ...item, pending: false, error: true } : item
        );
        statusText.value = result?.message || '发送失败';
        return false;
    } catch (err) {
        localMessages.value = localMessages.value.map((item) =>
            item.id === localId ? { ...item, pending: false, error: true } : item
        );
        statusText.value = '发送失败';
        return false;
    }
};

const sendChatEntry = async ({ type, data, payload }) => {
    const targetUid = activeFriend.value?.uid;
    if (!targetUid) return false;
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localEntry = {
        id: localId,
        type,
        senderUid: auth.value.uid,
        targetUid,
        targetType: 'private',
        data,
        createdAt: new Date().toISOString(),
        pending: true,
        error: false
    };
    localMessages.value = [...localMessages.value, localEntry];
    try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({
                senderUid: auth.value.uid,
                targetUid,
                targetType: 'private',
                type,
                ...payload
            })
        });
        const result = await res.json();
        if (res.ok && result?.success) {
            if (result.data?.id && !messageIdSet.has(result.data.id)) {
                messageIdSet.add(result.data.id);
                messages.value = [...messages.value, result.data];
            }
            await nextTick();
            scrollToBottom();
            localMessages.value = localMessages.value.filter((item) => item.id !== localId);
            updateRecentChat(targetUid);
            return true;
        }
        localMessages.value = localMessages.value.map((item) =>
            item.id === localId ? { ...item, pending: false, error: true } : item
        );
        statusText.value = result?.message || '发送失败';
        return false;
    } catch (err) {
        localMessages.value = localMessages.value.map((item) =>
            item.id === localId ? { ...item, pending: false, error: true } : item
        );
        statusText.value = '发送失败';
        return false;
    }
};

const sendFileMessage = async () => {
    if (!canSendFile.value || !fileDraft.value) return;
    try {
        const upload = await uploadFileBinary(fileDraft.value.file);
        const payload = {
            name: fileDraft.value.name,
            size: fileDraft.value.size,
            mime: fileDraft.value.type,
            url: upload.url
        };
        const data = {
            name: fileDraft.value.name,
            size: fileDraft.value.size,
            mime: fileDraft.value.type,
            url: upload.url
        };
        const ok = await sendChatEntry({
            type: 'file',
            data,
            payload
        });
        if (ok) {
            clearFileDraft();
        }
    } catch (error) {
        statusText.value = error?.message || '文件上传失败';
    }
};

const sendMessage = async () => {
    if (!canSend.value) return;
    showSendMenu.value = false;
    const content = sanitizeText(draft.value).trim();
    const hasText = content.length > 0;
    const hasImages = draftImages.value.length > 0;
    if (!hasText && !hasImages) return;
    if (hasImages) {
        if (pendingImageHashes.size) {
            await Promise.all([...pendingImageHashes.values()]);
        }
        const hashToUrl = new Map();
        const uploads = [];
        draftImages.value.forEach((item) => {
            if (!item.hash) {
                return;
            }
            const cached = imageUploadCache.get(item.hash) || {};
            if (cached.url) {
                hashToUrl.set(item.hash, cached.url);
                return;
            }
            if (!item.file) {
                return;
            }
            if (hashToUrl.has(item.hash)) {
                return;
            }
            uploads.push(async () => {
                const url = await uploadImageBinary(item.file, item.hash);
                hashToUrl.set(item.hash, url);
                imageUploadCache.set(item.hash, { ...cached, url });
            });
        });
        if (uploads.length) {
            try {
                await runWithConcurrency(uploads, UPLOAD_CONCURRENCY);
            } catch (error) {
                statusText.value = error?.message || '图片上传失败';
                return;
            }
        }
        const urls = draftImages.value.map((item) => {
            if (!item.hash) {
                return '';
            }
            const cached = imageUploadCache.get(item.hash) || {};
            return cached.url || hashToUrl.get(item.hash) || '';
        });
        const payload = {
            urls: urls.filter((url) => typeof url === 'string' && url.trim()),
            content: hasText ? content : ''
        };
        if (!payload.urls.length) {
            statusText.value = '图片上传失败';
            return;
        }
        const ok = await sendChatEntry({
            type: 'image',
            data: payload,
            payload
        });
        if (ok) {
            const latest = messages.value[messages.value.length - 1];
            const urlsFromServer = Array.isArray(latest?.data?.urls) ? latest.data.urls : [];
            urlsFromServer.forEach((url) => {
                const match = /\/uploads\/images\/([a-f0-9]+)\.(png|jpe?g|gif|webp)/i.exec(url || '');
                if (!match) return;
                const hash = match[1];
                const cached = imageUploadCache.get(hash) || {};
                imageUploadCache.set(hash, { ...cached, url });
            });
            clearDraftImages();
            if (hasText) {
                draft.value = '';
            }
        }
        return;
    }
    if (hasText) {
        const ok = await sendChatEntry({
            type: 'text',
            data: { content },
            payload: { content }
        });
        if (ok) {
            draft.value = '';
        }
    }
};

const isAtBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
};

const scrollToBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
};

const toggleFriendProfile = () => {
    if (!activeFriend.value) return;
    if (!isFriendProfileVisible.value) {
        loadFriendProfile(activeFriend.value.uid);
    }
    isFriendProfileVisible.value = !isFriendProfileVisible.value;
};

const closeFriendProfile = () => {
    isFriendProfileVisible.value = false;
};

const loadFriendProfile = async (uid) => {
    if (!auth.value.token || !uid) return;
    if (friendProfileLoading.value && friendProfile.value?.uid === uid) return;
    friendProfileLoading.value = true;
    try {
        const res = await fetch(`${API_BASE}/api/friends/profile?uid=${uid}`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            friendProfile.value = data.user;
        }
    } catch {}
    friendProfileLoading.value = false;
};

const loadContactProfile = async (uid) => {
    if (!auth.value.token || !uid) return;
    if (contactProfileLoading.value && contactProfile.value?.uid === uid) return;
    contactProfileLoading.value = true;
    try {
        const res = await fetch(`${API_BASE}/api/friends/profile?uid=${uid}`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            contactProfile.value = data.user;
        }
    } catch {}
    contactProfileLoading.value = false;
};

const scheduleScrollToBottom = () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(scrollToBottom);
    });
};

const sanitizeText = (value) => {
    return String(value ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[<>]/g, '');
};

onMounted(async () => {
    requestAnimationFrame(() => {
        isReady.value = true;
    });
    await loadAuth();
    loadFriendPreferences();
    downloadedFileByUrl.value = loadDownloadMap();
    await loadProfile();
    updateVoiceDomain();
    await loadFriends();
    await loadRequests();
    connectWebSocket();
    if (window.electronAPI?.onVoiceSignalOut) {
        window.electronAPI.onVoiceSignalOut((payload) => {
            if (!payload?.targetUid || !payload?.signal) return;
            sendVoiceSignalToServer(payload);
        });
    }
    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('mousemove', handleComposerResizeMove);
    window.addEventListener('mouseup', stopComposerResize);
});

watch(
    () => auth.value.token,
    (nextToken, prevToken) => {
        if (nextToken && nextToken !== prevToken) {
            loadFriends({ silent: true });
            loadRequests({ silent: true });
            connectWebSocket();
            updateVoiceDomain();
        }
    }
);

watch(
    displayMessages,
    (items) => {
        items.forEach((msg) => {
            if (msg.type !== 'file') return;
            const url = getMessageFileUrl(msg);
            if (!url || checkedFileUrls.has(url)) return;
            checkedFileUrls.add(url);
            void refreshDownloadStatus(msg);
        });
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    window.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('mousemove', handleComposerResizeMove);
    window.removeEventListener('mouseup', stopComposerResize);
    closeWebSocket();
    if (cropDragging.value) {
        stopCropDrag();
    }
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
});
</script>

<style scoped>
.app-shell {
    height: 100vh;
    background: radial-gradient(circle at top left, #f5fbff, #eef5ff 45%, #e8f1ff);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transition: opacity 280ms ease;
}

.app-shell.app-enter {
    opacity: 1;
}

.app-shell::before,
.app-shell::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(0px);
    opacity: 0.7;
}

.app-shell::before {
    width: 380px;
    height: 380px;
    background: rgba(59, 213, 255, 0.18);
    top: -120px;
    right: -60px;
}

.app-shell::after {
    width: 520px;
    height: 520px;
    background: rgba(72, 147, 214, 0.16);
    bottom: -220px;
    left: -120px;
}

.topbar {
    height: var(--titlebar-h);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 10px;
    position: relative;
    z-index: 2;
    -webkit-app-region: drag;
    user-select: none;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-weight: 700;
    display: grid;
    place-items: center;
    box-shadow: var(--shadow);
    font-size: 16px;
}

.brand-title {
    font-weight: 700;
    font-size: 14px;
}

.brand-sub {
    font-size: 11px;
    color: var(--ink-soft);
}

.topbar-center {
    display: flex;
    justify-content: center;
    user-select: none;
    -webkit-app-region: drag;
}


.status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.14);
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    user-select: none;
}

.topbar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    user-select: none;
    -webkit-app-region: drag;
}

.topbar-right-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    -webkit-app-region: drag;
}

.topbar-right-spacer {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag;
}

.user-card-wrap {
    position: relative;
    -webkit-app-region: no-drag;
    user-select: none;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 0 0 12px 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
}

.user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: #1f4c7a;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    display: grid;
    place-items: center;
    -webkit-app-region: no-drag;
    overflow: hidden;
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-meta {
    display: grid;
    gap: 2px;
}

.profile-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
    height: auto;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 18px 48px rgba(22, 32, 52, 0.16);
    border: 1px solid rgba(31, 65, 120, 0.12);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 180ms ease, transform 220ms ease;
    pointer-events: none;
    z-index: 20;
    -webkit-app-region: no-drag;
}

.profile-popover.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.profile-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 8px;
}

.profile-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 16px;
    overflow: hidden;
}

.profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-meta {
    display: grid;
    gap: 6px;
}

.profile-name {
    font-size: 18px;
    font-weight: 700;
    color: #1c2436;
}

.profile-uid {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.6);
}

.profile-signature {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.7);
    line-height: 1.4;
}

.profile-details {
    display: grid;
    gap: 4px;
    margin-top: 2px;
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

input:focus::placeholder {
    color: transparent;
}

.profile-detail {
    line-height: 1.4;
}

.profile-actions {
    margin-top: auto;
    display: flex;
    gap: 12px;
    justify-content: center;
    padding-bottom: 8px;
    -webkit-app-region: no-drag;
}

.profile-btn {
    border: none;
    border-radius: 12px;
    padding: 10px 18px;
    background: #1d4ed8;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.profile-btn.ghost {
    background: rgba(29, 78, 216, 0.12);
    color: #1d4ed8;
}

.profile-btn.ghost:hover {
    background: rgba(220, 38, 38, 0.16);
    color: #dc2626;
}

.profile-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
    opacity: 1;
}

.profile-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(6px);
    transition: opacity 140ms ease-out, backdrop-filter 140ms ease-out;
}

.profile-modal__panel {
    position: relative;
    width: 520px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 64px);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 255, 0.98));
    border-radius: 18px;
    border: 1px solid rgba(72, 147, 214, 0.2);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
    padding: 20px 22px 18px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    -webkit-app-region: no-drag;
    transform-origin: center;
    transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 200ms ease-out;
    transition-delay: 80ms;
}

.profile-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.profile-modal__title {
    font-size: 16px;
    font-weight: 700;
    color: #1c2436;
}

.profile-modal__close {
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
}

.profile-modal__body {
    display: grid;
    gap: 12px;
    overflow-y: auto;
    padding-right: 6px;
    flex: 1;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
}

.profile-modal__avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 20px;
    margin: 0 auto 6px;
    overflow: hidden;
}

.profile-modal__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-modal__upload {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 6px;
}

.profile-modal__file {
    display: none;
}

.profile-field {
    display: grid;
    gap: 6px;
    padding-left: 6px;
}

.profile-field__label {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.profile-field__control {
    position: relative;
}

.profile-field__control input {
    width: 100%;
}

.profile-field__count {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: rgba(28, 36, 54, 0.5);
}

.profile-field select,
.profile-field input[type="date"] {
    width: 100%;
}



.profile-modal input {
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #fff;
    padding: 10px 12px;
    font-size: 13px;
    color: #1c2436;
    font-family: inherit;
}

.profile-field.is-invalid .profile-field__label {
    color: #dc2626;
}

.profile-field.is-invalid input {
    border-color: rgba(220, 38, 38, 0.65);
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.profile-modal input:focus,
.profile-modal select:focus {
    outline: none;
    border-color: rgba(72, 147, 214, 0.5);
    box-shadow: 0 0 0 3px rgba(72, 147, 214, 0.15);
}

input:focus,
textarea:focus,
select:focus {
    outline: none;
    box-shadow: none;
}

.profile-modal .select-menu {
    box-shadow: none;
    scrollbar-width: none;
}

.profile-modal .select-menu::-webkit-scrollbar {
    display: none;
}

.profile-field--split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.profile-modal__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.crop-modal {
    position: fixed;
    inset: 0;
    z-index: 2100;
    display: grid;
    place-items: center;
    opacity: 1;
}

.crop-modal__panel {
    position: relative;
    width: 420px;
    max-width: calc(100vw - 32px);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 255, 0.98));
    border-radius: 18px;
    border: 1px solid rgba(72, 147, 214, 0.2);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
    padding: 20px 22px 18px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    -webkit-app-region: no-drag;
}

.crop-modal__body {
    display: grid;
    gap: 14px;
    justify-items: center;
    padding-bottom: 6px;
}

.crop-frame {
    width: 240px;
    height: 240px;
    border-radius: 18px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.06);
    position: relative;
    cursor: grab;
    user-select: none;
}

.crop-frame:active {
    cursor: grabbing;
}

.crop-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: center;
}

.crop-controls {
    width: 100%;
    display: grid;
    gap: 6px;
}

.crop-zoom {
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.crop-zoom input[type="range"] {
    width: 100%;
}

.file-modal {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 4000;
}

.file-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(12px);
}

.file-modal__panel {
    position: relative;
    width: min(460px, 92vw);
    border-radius: 18px;
    background: #3a3a3a;
    color: #f9fafb;
    box-shadow: 0 24px 60px rgba(17, 24, 39, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 1;
}

.file-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    font-weight: 600;
}

.file-modal__title {
    font-size: 16px;
}

.file-modal__close {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    font-size: 20px;
    cursor: pointer;
}

.file-modal__body {
    padding: 6px 20px 18px;
}

.file-modal__card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
}

.file-modal__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(37, 99, 235, 0.25);
    color: #dbeafe;
    display: grid;
    place-items: center;
    font-family: "Segoe MDL2 Assets";
    font-size: 18px;
}

.file-modal__meta {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.file-modal__name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-modal__size {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
}

.file-modal__footer {
    padding: 0 20px 18px;
}

.file-modal__send {
    width: 100%;
    border: none;
    border-radius: 14px;
    padding: 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    background: #0a6cff;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(10, 108, 255, 0.35);
}

.file-modal__send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
}

.profile-modal-enter-active,
.profile-modal-leave-active {
    transition: opacity 160ms ease-out;
}

.profile-modal-enter-from,
.profile-modal-leave-to {
    opacity: 0;
}

.profile-modal-enter-from .profile-modal__panel,
.profile-modal-leave-to .profile-modal__panel {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
}

.profile-modal-leave-to .profile-modal__panel {
    transition-delay: 0ms;
}

.profile-modal-enter-from .profile-modal__backdrop,
.profile-modal-leave-to .profile-modal__backdrop {
    opacity: 0;
    backdrop-filter: blur(2px);
}

.file-modal-enter-active,
.file-modal-leave-active {
    transition: opacity 0.2s ease;
}

.file-modal-enter-from,
.file-modal-leave-to {
    opacity: 0;
}

.file-modal-enter-from .file-modal__panel,
.file-modal-leave-to .file-modal__panel {
    transform: translateY(10px) scale(0.98);
}

.user-name {
    font-size: 12px;
    font-weight: 600;
}

.user-id {
    font-size: 10px;
    color: var(--ink-soft);
}

.window-controls {
    display: flex;
    -webkit-app-region: no-drag;
    user-select: none;
}

.wc-btn {
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s;
}

.wc-btn:hover {
    background: rgba(27, 28, 32, 0.08);
}

.wc-btn.close:hover {
    background: #d04732;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 9px;
}

.layout {
    height: calc(100vh - var(--titlebar-h));
    display: grid;
    grid-template-columns: 70px 300px 1fr;
    gap: 0px;
    padding: 8px 2px 0px;
    position: relative;
    z-index: 1;
}

.icon-rail {
    border-radius: 28px;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    -webkit-app-region: no-drag;
    user-select: none;
    max-height: 90vh;
}

.rail-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
}

.rail-bottom {
    gap: 12px;
}

.rail-btn {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.12);
    color: #1f2937;
    display: grid;
    place-items: center;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s var(--ease), background 0.2s, border 0.2s;
    box-shadow: 0 4px 8px rgba(15, 23, 42, 0.12);
}

.rail-btn:hover {
    transform: translateY(-2px);
    background: rgba(15, 23, 42, 0.12);
    border-color: rgba(15, 23, 42, 0.18);
}

.rail-btn.active {
    background: #2b6cb0;
    border-color: rgba(43, 108, 176, 0.4);
    color: #fff;
    box-shadow: 0 10px 18px rgba(25, 85, 160, 0.35);
}

.rail-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.rail-dot {
    position: absolute;
    right: 8px;
    top: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
}

.rail-badge {
    position: absolute;
    right: -2px;
    top: -6px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #ff5a3c;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    box-shadow: 0 6px 12px rgba(255, 90, 60, 0.35);
}

.sidebar {
    background: var(--panel-soft);
    border: 1px solid var(--line);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: var(--shadow);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 260ms ease 60ms, transform 320ms ease 60ms;
}

.chat-sidebar,
.contacts-sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 85vh;
    min-height: 0;
}

.contacts-search {
    display: grid;
    gap: 12px;
}

.contacts-search-box {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    padding: 0px 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    width: 270px;
}

.contacts-search-box input {
    border: none;
    background: transparent;
    font-size: 13px;
}

.contacts-search-box input:focus {
    outline: none;
}

.contacts-add-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    background: rgba(43, 108, 176, 0.2);
    color: #1d4ed8;
    font-weight: 700;
    cursor: pointer;
}

.friend-manager-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(31, 41, 55, 0.08);
    border-radius: 16px;
    padding: 7px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1f2937;
    font-weight: 600;
    cursor: pointer;
    width: 270px;
}

.manager-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
}

.contacts-section {
    display: grid;
    gap: 10px;
}

.contacts-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid rgba(15, 23, 42, 0.1);
    font-weight: 600;
    cursor: pointer;
}

.contacts-item.active {
    background: rgba(29, 78, 216, 0.16);
    color: #1d4ed8;
}

.contacts-item .badge {
    background: #ff5a3c;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 999px;
    margin-left: 140px;

}

.chev {
    font-family: "Segoe MDL2 Assets";
    font-size: 12px;
    color: #6b7280;
}

.contacts-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: rgba(17, 24, 39, 0.08);
    border-radius: 14px;
    padding: 1px;
    gap: 6px;
}

.contacts-tab {
    border: none;
    background: transparent;
    padding: 8px 0;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
}

.contacts-tab.active {
    background: #1d4ed8;
    color: #fff;
}

.contacts-list {
    display: grid;
    gap: 5px;
    overflow-y: auto;
    padding-right: 4px;
    flex: 1;
    min-height: 0;
}

.contacts-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(15, 23, 42, 0.08);
    cursor: pointer;
    font-weight: 600;
}

.contacts-row .count {
    color: #6b7280;
    font-weight: 600;
}

.contacts-group {
    display: grid;
    gap: 8px;
}

.contacts-group-meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.contacts-group-header .chev {
    transition: transform 0.2s ease;
    transform: rotate(0deg);
}

.contacts-group-header .chev.open {
    transform: rotate(90deg);
}

.contacts-group-items {
    display: grid;
    gap: 6px;
    padding: 0 6px 6px 6px;
}

.contacts-friend {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    cursor: pointer;
}

.contacts-friend-avatar {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: #1f4c7a;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    display: grid;
    place-items: center;
    overflow: hidden;
}

.contacts-friend-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.contacts-friend-name {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.contacts-friend-uid {
    color: #6b7280;
}

.contacts-empty {
    font-size: 12px;
    color: #9ca3af;
    padding: 6px 10px 10px;
}

.search {
    display: grid;
    gap: 8px;
}

.search-icon {
    color: #64748b;
    font-size: 14px;
}

.search-hint {
    font-size: 11px;
    color: var(--ink-soft);
    text-align: right;
    user-select: none;
}

.list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    user-select: none;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    height: 4vh;
}

.list-item {
    display: grid;
    grid-template-columns: 42px 1fr auto;
    gap: 12px;
    align-items: center;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 10px;
    background: #fff;
    transition: transform 0.2s var(--ease), border 0.2s;
    cursor: pointer;
    width: 100%;
    height: 70px;
}

.list-item:hover {
    transform: translateY(-2px);
    border-color: rgba(72, 147, 214, 0.5);
}

.list-item.active {
    border-color: rgba(72, 147, 214, 0.6);
    box-shadow: 0 12px 20px rgba(72, 147, 214, 0.18);
}

.list-item.pinned {
    background: rgba(31, 76, 122, 0.08);
    border-color: rgba(31, 76, 122, 0.2);
}

.avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: #1f4c7a;
    color: #fff;
    font-weight: 600;
    display: grid;
    place-items: center;
    font-size: 13px;
    overflow: hidden;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.list-meta {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.list-name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.list-sub {
    font-size: 12px;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.list-badge {
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: #ff5a3c;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 12px rgba(255, 90, 60, 0.25);

}

.list-badges {
    display: flex;
    align-items: center;
    gap: 8px;
}

.list-badge.mute {
    background: rgba(15, 23, 42, 0.08);
    color: #334155;
}

.list-unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ef4444;
}

.list-context-menu {
    position: fixed;
    z-index: 3000;
    width: 180px;
    padding: 10px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid rgba(72, 147, 214, 0.2);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
    display: grid;
    gap: 1px;
    background-color: white;
}

.list-context-item {
    border: none;
    border-radius: 10px;
    padding: 9px 12px;
    background: transparent;
    color: #1e3a8a;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
}

.list-context-item:hover {
    background: #e5e7eb;
    color: #111827;
}

.list-context-item.danger {
    color: #b91c1c;
}

.list-context-item.danger:hover {
    background: #e5e7eb;
    color: #991b1b;
}


.empty-state {
    font-size: 12px;
    color: var(--ink-soft);
    text-align: center;
    padding: 20px 0;
}

.chat {
    background: var(--panel);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: var(--shadow);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 280ms ease 120ms, transform 360ms ease 120ms;
}

.chat-panel,
.contacts-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
}

.contacts-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.contacts-title {
    font-size: 20px;
    font-weight: 700;
}

.contacts-tools {
    display: flex;
    gap: 12px;
}

.tool-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: none;
    background: rgba(15, 23, 42, 0.08);
    cursor: pointer;
    position: relative;
}

.tool-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    color: #1f2937;
}

.tool-dot {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
}

.contacts-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.9), rgba(255, 255, 255, 0.95));
}

.contact-profile {
    display: grid;
    gap: 12px;
}

.contact-profile-card {
    background: #ffffff;
    border-radius: 18px;
    padding: 18px;
    border: 1px solid rgba(72, 147, 214, 0.18);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.contact-profile-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
}

.contact-profile-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
}

.contact-action-btn {
    height: 34px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #111827;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s, border 0.2s, color 0.2s, transform 0.2s;
}

.contact-action-btn:hover {
    transform: translateY(-1px);
    background: #f3f4f6;
}

.contact-action-btn.primary {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #ffffff;
}

.contact-action-btn.primary:hover {
    background: #1e40af;
}

.contact-action-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    line-height: 1;
}

.contact-action-text {
    line-height: 1;
}

.contact-tag {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.12);
    color: #1d4ed8;
}

.contact-tag.offline {
    background: rgba(148, 163, 184, 0.2);
    color: #64748b;
}

.notify-list {
    display: grid;
    gap: 16px;
}

.notify-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 16px 18px;
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid rgba(72, 147, 214, 0.18);
    color: #1f2937;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.notify-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 600;
}

.notify-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.notify-main {
    display: grid;
    gap: 6px;
}

.notify-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
}

.notify-name {
    color: #2563eb;
}

.notify-text {
    color: #1f2937;
}

.notify-sub {
    font-size: 12px;
    color: #6b7280;
}

.notify-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notify-accept,
.notify-reject {
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(15, 23, 42, 0.06);
    color: #1f2937;
    padding: 6px 14px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
}

.notify-accept {
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
}

.notify-status {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
}

.notify-status.status-rejected {
    color: #f87171;
}

.chat-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
}

.app-shell.app-enter .sidebar,
.app-shell.app-enter .chat {
    opacity: 1;
    transform: translateY(0);
}

.chat-title {
    font-size: 18px;
    font-weight: 700;
    user-select: none;
}

.chat-title.clickable {
    cursor: pointer;
}

.chat-title.clickable:hover {
    color: #1d4ed8;
}

.chat-sub {
    font-size: 12px;
    color: var(--ink-soft);
    user-select: none;
}

.chat-actions {
    display: flex;
    gap: 8px;
    user-select: none;
    -webkit-app-region: drag;

}

.chat-actions-left {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    -webkit-app-region: no-drag;
}

.chat-action-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #ffffff;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: #374151;
    transition: background 0.2s, border 0.2s, color 0.2s;
    -webkit-app-region: no-drag;
}

.chat-action-btn:hover {
    background: rgba(15, 23, 42, 0.06);
    color: #111827;
}

.chat-action-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
}

.chat-action-remote {
    position: relative;
    display: inline-flex;
    align-items: center;
    -webkit-app-region: no-drag;
}

.chat-action-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: -20px;
    min-width: 180px;
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 16px 24px rgba(15, 23, 42, 0.14);
    padding: 6px;
    display: grid;
    gap: 4px;
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 6;
    -webkit-app-region: no-drag;
}

.chat-action-menu.open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.chat-action-menu-item {
    border: none;
    background: transparent;
    text-align: left;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: #1f2937;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.chat-action-menu-item:hover {
    background: rgba(15, 23, 42, 0.06);
}

.chip {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.16);
    color: #1d4ed8;
}

.chip.offline {
    background: rgba(148, 163, 184, 0.2);
    color: #64748b;
}

.friend-profile-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 22px;
    width: 320px;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 18px 48px rgba(22, 32, 52, 0.16);
    border: 1px solid rgba(31, 65, 120, 0.12);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 180ms ease, transform 220ms ease;
    pointer-events: none;
    z-index: 5;
}

.friend-profile-popover.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.chat-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.8), rgba(255, 255, 255, 0.95));
}

.chat-block-notice {
    align-self: center;
    background: #f3f4f6;
    color: #9ca3af;
    font-size: 12px;
    padding: 6px 14px;
    border-radius: 999px;
    text-align: center;
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.bubble-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.bubble {
    max-width: 50%;
    width: fit-content;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f3f7ff;
    box-shadow: 0 8px 18px rgba(27, 28, 32, 0.08);
    display: grid;
    gap: 6px;
    position: relative;
}

.bubble.image-only {
    padding: 0;
    background: transparent;
    box-shadow: none;
}

.bubble.file-only {
    padding: 0;
    background: unset !important;
    box-shadow: none;
    color: inherit !important;
}

.bubble.self {
    align-self: flex-end;
    background: #2b6cb0;
    color: #fff;
}

.bubble.image-only.self {
    background: transparent;
    color: inherit;
}

.bubble.error {
    border: 1px solid rgba(255, 90, 60, 0.4);
}

.bubble-error-dot {
    position: absolute;
    left: -8px;
    top: 10px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
    box-shadow: 0 0 0 3px rgba(255, 90, 60, 0.2);
}

.bubble-name {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
}

.bubble-text {
    font-size: 14px;
    line-height: 1.5;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
}

.bubble-image {
    max-width: 90%;
    max-height: 24vh;
    border-radius: 12px;
    display: block;
}

.bubble-file {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(30, 30, 30, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    box-shadow: 4px 8px 8px 4px rgba(0, 0, 0, 0.15);
}

.bubble.self .bubble-file {
    width: 200px;
    height: 80px;
    background: rgba(30, 30, 30, 0.6);
    border-color: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
}

.bubble-file-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(59, 130, 246, 0.15);
    color: #1d4ed8;
    display: grid;
    place-items: center;
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.bubble.self .bubble-file-icon {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
}

.bubble-file-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
}

.bubble-file-name {
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: white !important;
}

.bubble-file-size,
.bubble-file-status {
    font-size: 11px;
    color: #6b7280;
}

.bubble.self .bubble-file-size,
.bubble.self .bubble-file-status {
    color: rgba(255, 255, 255, 0.7);
}

.bubble-file-link {
    font-size: 12px;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
}

.bubble-file-expired {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
}

.bubble.self .bubble-file-link {
    color: #ffffff;
}

.bubble-image-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bubble-caption {
    margin-top: 8px;
}

.card-message {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.1);
    color: #111827;
}

.card-title {
    font-size: 11px;
    color: #9ca3af;
}

.card-main {
    display: grid;
    grid-template-columns: 42px 1fr;
    gap: 10px;
    align-items: center;
}

.card-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 600;
    overflow: hidden;
}

.card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-meta {
    display: grid;
    gap: 4px;
}

.card-name {
    font-size: 13px;
    font-weight: 600;
}

.card-uid {
    font-size: 11px;
    color: #6b7280;
}

.card-note {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.4;
}

.serach_input_box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    user-select: none;
}


.bubble-time {
    font-size: 10px;
    opacity: 0.6;
    text-align: right;
}

.composer {
    padding: 16px 22px 18px;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 0px;
    flex: 0 0 auto;
    max-height: 360px;
    overflow: hidden;
    overscroll-behavior: contain;
    position: relative;
    z-index: 2;
}

.composer-resize-handle {
    position: absolute;
    top: -6px;
    left: 0;
    right: 0;
    height: 12px;
    cursor: row-resize;
    z-index: 3;
}

.composer-resize-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 5px;
    width: 44px;
    height: 3px;
    transform: translateX(-50%);
    border-radius: 999px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.composer-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px 2px;
    position: relative;
    user-select: none;
}

.tool-icon-btn {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: #4b5563;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.2s, border 0.2s, color 0.2s;
}

.tool-icon-btn:hover {
    background: rgba(15, 23, 42, 0.06);
    border-color: rgba(15, 23, 42, 0.12);
    color: #1f2937;
}

.tool-icon-btn.is-active {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.3);
    color: #1d4ed8;
}

.chat-side-overlay {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 18;
}

.chat-side-panel {
    position: fixed;
    top: 70px;
    right: 0px;
    width: 260px;
    max-height: calc(100vh - 0px);
    overflow-y: auto;
    display: grid;
    gap: 38px;
    padding: 8px;
    opacity: 0;
    transform: translateX(12px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 19;
    background-color: #f2f2f2;
    box-shadow: -4px 10px 10px 2px #cccccc;
    border-radius: 10px;
}

.chat-side-panel.open {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

.chat-side-card {
    background: #ffffff;
    border-radius: 14px;
    padding: 12px;
    display: grid;
    gap: 10px;
}

.chat-side-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #111827;
}

.chat-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 40px;
    height: 22px;
}

.chat-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.chat-switch-slider {
    position: absolute;
    inset: 0;
    background: #e5e7eb;
    border-radius: 999px;
    transition: background 0.2s ease;
}

.chat-switch-slider::before {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
    transition: transform 0.2s ease;
}

.chat-switch input:checked+.chat-switch-slider {
    background: #60a5fa;
}

.chat-switch input:checked+.chat-switch-slider::before {
    transform: translateX(18px);
}

.chat-side-action {
    width: 100%;
    border: none;
    background: #ffffff;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 13px;
    color: #111827;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.chat-side-action:hover {
    background: #f3f4f6;
}

.chat-side-chev {
    font-family: "Segoe MDL2 Assets";
    font-size: 12px;
    color: #9ca3af;
}

.chat-side-danger {
    width: 100%;
    border: none;
    background: #fff5f5;
    color: #ef4444;
    font-weight: 600;
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.chat-side-danger:hover {
    background: #fee2e2;
}

.chat-side-link {
    border: none;
    background: transparent;
    color: #2563eb;
    font-size: 12px;
    cursor: pointer;
    text-align: center;
    padding: 6px 0;
}

.tool-glyph {
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.emoji-panel {
    position: fixed;
    width: 360px;
    background: linear-gradient(180deg, #f9fcff 0%, #ffffff 100%);
    border-radius: 18px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
    padding: 12px;
    z-index: 50;

}

.emoji-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.emoji-tab {
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.9);
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
    cursor: pointer;
    color: #334155;
    font-weight: 600;
}

.emoji-tab.active {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.28);
    color: #1d4ed8;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
}

.emoji-btn {
    width: 36px;
    height: 34px;
    border-radius: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 18px;
    transition: background 0.2s;
}

.emoji-btn:hover {
    background: rgba(15, 23, 42, 0.08);
}

.emoji-empty {
    font-size: 12px;
    color: rgba(15, 23, 42, 0.5);
    padding: 16px 0;
    text-align: center;
}

.tool-spacer {
    flex: 1;
}

.composer-body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

.composer-input {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex-direction: column;
}

.composer-image-list {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: flex-start;
    max-width: 80%;
}

.composer textarea {
    min-height: 70px;
    resize: none;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
    border-radius: 12px;
    border: unset;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.9);
    outline: none;
    flex: 1;
}

.composer textarea::-webkit-scrollbar {
    display: none;
}



.composer textarea:focus {
    box-shadow: unset;
}

.composer-image-input {
    display: none;
}

.composer-file-input {
    display: none;
}

.composer-image-preview {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #fff;
}

.composer-image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.composer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
}

.send-tip-mark {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    color: #1d4ed8;
}

.send-group {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-radius: 14px;
    overflow: visible;
    box-shadow: 0 10px 18px rgba(72, 147, 214, 0.25);
    position: relative;
    user-select: none;
}

.send-btn {
    border: none;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s var(--ease);
    padding: 10px 22px;
    background: transparent;
}

.send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.send-btn:not(:disabled):hover {
    transform: translateY(-2px);
}

.send-drop {
    width: 36px;
    height: 100%;
    border: none;
    background: unset;
    color: #fff;
    cursor: pointer;
    display: grid;
    place-items: center;
}

.send-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 18px 30px rgba(15, 23, 42, 0.16);
    padding: 8px 10px;
    display: grid;
    gap: 6px;
    min-width: 220px;
    z-index: 5;
}

.send-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #374151;
    padding: 6px 8px;
    border-radius: 8px;
}

.send-menu-item:hover {
    background: rgba(15, 23, 42, 0.06);
}

.loading,
.empty-chat {
    font-size: 13px;
    color: var(--ink-soft);
    text-align: center;
}

.contacts-panel .empty-chat {
    color: #64748b;
}

.serach_input {
    width: 80%;
    border-radius: 8px;
}


.add_friend_icon {
    width: 46px;
    height: 46px;
    border-radius: 8px;
    cursor: pointer;
    margin: 5px;
    margin-left: 10px;
    color: #1d4ed8;
    background-color: #eaf2ff;
    border: 1px solid rgba(72, 147, 214, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

.share-modal {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
}

.share-panel {
    width: 720px;
    max-width: calc(100vw - 40px);
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 30px 60px rgba(15, 23, 42, 0.2);
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
    position: fixed;
}

.share-left {
    padding: 18px;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    display: grid;
    gap: 12px;
}

.share-search {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px;
    background: #f3f4f6;
    border-radius: 12px;
    padding: 6px 10px;
    font-size: 13px;
}

.share-search input {
    border: none;
    background: transparent;
    font-size: 13px;
}

.share-search input:focus {
    outline: none;
}

.share-create-btn {
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #ffffff;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    color: #111827;
}

.share-section-title {
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
}

.share-list {
    display: grid;
    gap: 8px;
    max-height: 360px;
    overflow-y: auto;
    padding-right: 4px;
}

.share-item {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 10px;
    border: none;
    background: transparent;
    padding: 6px 8px;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
}

.share-item:hover {
    background: rgba(15, 23, 42, 0.04);
}

.share-radio {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    display: grid;
    place-items: center;
}

.share-radio.selected {
    border-color: #60a5fa;
    box-shadow: inset 0 0 0 4px #60a5fa;
}

.share-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    font-size: 11px;
    display: grid;
    place-items: center;
    overflow: hidden;
}

.share-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.share-name {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.share-empty {
    font-size: 12px;
    color: #9ca3af;
    padding: 12px 4px;
}

.share-right {
    padding: 18px;
    display: grid;
    gap: 12px;
    align-content: start;
}

.share-header {
    font-size: 13px;
    color: #6b7280;
}

.share-target-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
}

.share-card {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 14px;
    padding: 12px;
    display: grid;
    gap: 10px;
    background: #f9fafb;
}

.share-card-title {
    font-size: 12px;
    color: #9ca3af;
}

.share-card-main {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 10px;
    align-items: center;
}

.share-card-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    overflow: hidden;
    font-weight: 600;
}

.share-card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.share-card-meta {
    display: grid;
    gap: 4px;
}

.share-card-name {
    font-weight: 600;
    font-size: 13px;
}

.share-card-uid {
    font-size: 11px;
    color: #6b7280;
}

.share-note textarea {
    width: 100%;
    min-height: 80px;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    padding: 10px;
    resize: none;
    font-size: 12px;
    background: #ffffff;
}

.share-note textarea:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.4);
}

.share-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.share-confirm,
.share-cancel {
    border: none;
    border-radius: 12px;
    padding: 8px 18px;
    font-size: 12px;
    cursor: pointer;
}

.share-confirm {
    background: #60a5fa;
    color: #fff;
}

.share-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.share-cancel {
    background: #f3f4f6;
    color: #374151;
}
</style>
