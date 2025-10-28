if (localStorage.getItem("currentServer")) {
    currentServer = localStorage.getItem("currentServer");
} else {
    localStorage.setItem("currentServer", "wss://chats.mistium.com");
    currentServer = localStorage.getItem("currentServer");
}

let state = {
    _currentChannel: "general",
    server: {},
    user: null,
    validator: null,
    validator_key: null,
    users: {},
    online_users: {},
    reply_to: {},
    messages: {},
    unread: {},
    channels: {},
    set currentChannel(value) {
        this._currentChannel = value;
        lazier.start();
        if (ws?.readyState === 1) {
            ws.send(
                JSON.stringify({
                    cmd: "messages_get",
                    channel: value,
                }),
            );
        }
    },
    get currentChannel() {
        return this._currentChannel;
    },
};

let ws = null;

function connectWebSocket() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try { if (ws && ws.readyState === 1) ws.close(); } catch { }
    ws = new WebSocket(currentServer);
    ws.onopen = () => console.log("WebSocket connected (post-auth or resume)");
    attachWsHandlers();
}

function escapeHTML(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function roturToken() {
    return localStorage.getItem("rotur_auth_token");
}

const RoturAuth = {
    is_connected: true,
    authenticated: !!roturToken(),

    login_prompt({ STYLE_URL }) {
        if (!this.is_connected) {
            console.error("Not Connected");
            return;
        }
        if (this.authenticated) {
            console.error("Already Logged In");
            return;
        }

        const e = document.createElement("iframe");
        e.id = "rotur-auth";
        e.src = `https://rotur.dev/auth?styles=${encodeURIComponent(STYLE_URL)}`;
        Object.assign(e.style, {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            zIndex: 9999,
            pointerEvents: "auto",
            background: "#111",
        });
        document.body.appendChild(e);

        const _roturAuthHandler = (a) => {
            if (
                "https://rotur.dev" === a.origin &&
                a.data?.type === "rotur-auth-token"
            ) {
                e.remove();
                window.removeEventListener("message", _roturAuthHandler);
                console.log("Rotur Auth Token received", a.data.token);
                this.loginToken({
                    TOKEN: a.data.token,
                    VALIDATOR: localStorage.getItem("validator"),
                });
            }
        };
        window.addEventListener("message", _roturAuthHandler);
        return "Auth window opened";
    },

    async loginToken({ TOKEN }) {
        try {
            if (!TOKEN) throw new Error("Missing Rotur auth token");
            localStorage.setItem("rotur_auth_token", TOKEN);
            localStorage.removeItem("validator");
            this.authenticated = true;
            document.getElementById("authPrompt")?.remove();
            if (state.validator_key && ws?.readyState === 1) {
                await generateValidatorAndAuth(state.validator_key, TOKEN);
            } else {
                connectWebSocket();
            }
        } catch (err) {
            console.error("Token storage error", err);
            const box = document.getElementById("errorBox");
            if (box) {
                box.style.display = "flex";
                document.getElementById("errorMessage").textContent = err.message;
            }
        }
    },
};

function attachWsHandlers() {
    ws.onopen = () => console.log("WebSocket connected; awaiting handshake...");
    ws.onmessage = async (event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch {
            console.warn("Non-JSON message", event.data);
            return;
        }
        console.log("WS message", data);
        switch (data.cmd) {
            case "handshake": {
                const vKey = data?.val?.validator_key;
                if (vKey) state.validator_key = vKey;
                state.server = data?.val?.server || {};
                state.server.url = currentServer;
                document
                    .getElementById("currentServerIcon")
                    ?.setAttribute("src", state.server.icon || "");
                const sName = state.server.name || state.server.title || "Server";
                const header = document.getElementById("serverHeaderName");
                if (header) header.textContent = sName;
                const authTok = roturToken();
                if (authTok && vKey) {
                    try {
                        await generateValidatorAndAuth(vKey, authTok);
                    } catch (e) { showError(e.message); }
                } else if (!authTok) {
                    showError("Not logged in to Rotur. Please authenticate.");
                }
                break;
            }
            case "auth_success": {
                ws.send(JSON.stringify({ cmd: "channels_get" }));
                ws.send(JSON.stringify({ cmd: "users_list" }));
                ws.send(JSON.stringify({ cmd: "users_online" }));
                ws.send(
                    JSON.stringify({
                        cmd: "messages_get",
                        channel: state.currentChannel,
                    }),
                );
                setTimeout(loader.hide, 500);
                const input = document.getElementById("mainTxtAr");
                if (input && !input._listenerAttached) {
                    input.addEventListener("keydown", (ev) => {
                        if (ev.key === "Enter" && !ev.shiftKey) {
                            const payload = {
                                cmd: "message_new",
                                content: input.value,
                                channel: state.currentChannel,
                            };
                            const r = state.reply_to[state.currentChannel];
                            if (r) {
                                payload.reply_to = r.id;
                                state.reply_to[state.currentChannel] = null;
                                hidereplyPrompt();
                            }
                            ws.send(JSON.stringify(payload));
                            ev.preventDefault();
                            input.value = "";
                        }
                    });
                    input._listenerAttached = true;
                }
                break;
            }
            case "ready": {
                state.user = data.user;
                console.log("User ready", state.user);
                updateUserPanel();
                break;
            }
            case "channels_get":
                if (data.val) listChannels(data.val);
                break;
            case "messages_get":
                if (data.messages) listMessages(data.messages);
                break;
            case "message_new":
                addMessage(data);
                handleMessageNotification(data);
                break;
            case "message_delete": {
                const mid = data.id;
                if (mid) {
                    if (state.messages[mid]) delete state.messages[mid];

                    const node = document.querySelector(
                        `.message[data-id="${CSS.escape(mid)}"]`,
                    );
                    if (node) node.remove();

                    document
                        .querySelectorAll(`.reply-excerpt[data-ref="${CSS.escape(mid)}"]`)
                        .forEach((el) => {
                            el.classList.add("missing");
                            el.innerHTML = "Replying to deleted message";
                        });
                }
                break;
            }
            case "message_edit": {
                const mid = data.id;
                if (mid && state.messages[mid]) {
                    state.messages[mid].content = data.content;
                    state.messages[mid].edited = true;
                }
                const node = document.querySelector(
                    `.message[data-id="${CSS.escape(data.id)}"] .content`,
                );
                if (node)
                    node.innerHTML =
                        formatMessageContent(data.content) +
                        '<span class="edited-tag">(edited)</span>';
                if (state.editing && state.editing.id === mid) cancelEdit();
                break;
            }
            case "users_list": {
                const arr = data.users || [];
                for (const u of arr) {
                    if (!u || !u.username) continue;
                    state.users[u.username] = u;
                }
                renderMembers();
                break;
            }
            case "users_online": {
                const arr = data.users || [];
                state.online_users = {};
                for (const u of arr) {
                    if (!u || !u.username) continue;
                    state.online_users[u.username] = u;
                    if (!state.users[u.username]) state.users[u.username] = u;
                }
                renderMembers();
                break;
            }
            case "user_connect": {
                const u = data.user;
                if (u?.username) {
                    state.online_users[u.username] = u;
                    state.users[u.username] = u;
                    renderMembers();
                }
                break;
            }
            case "user_disconnect": {
                const uname = data.username || data.user?.username;
                if (uname && state.online_users[uname]) {
                    delete state.online_users[uname];
                    renderMembers();
                }
                break;
            }
            case "auth_error":
            case "error":
                showError(data.val || data.message || "Unknown error");
                break;
            default:
                console.log("Unhandled", data);
        }
    };
    ws.onerror = (e) => showError("WebSocket error");
    ws.onclose = () => console.log("WebSocket closed");
}

function showError(msg) {
    console.error(msg);
    const box = document.getElementById("errorBox");
    if (box) {
        box.style.display = "flex";
        const em = document.getElementById("errorMessage");
        if (em) em.textContent = msg;
    }
}

function listChannels(channelList) {
    const container = document.getElementById("channels");
    if (!container) return;
    container.innerHTML = "";
    for (let channel of channelList) {
        let newChannel = null;
        if (channel["type"] === "text") {
            if (channel.name) state.channels[channel.name] = channel;
            newChannel = document.createElement("div");
            newChannel.id = `channel_${channel["name"]}`;
            newChannel.classList.add("single_chnl");
            const unread = state.unread[channel["name"]] || 0;
            const safeName = escapeHTML(channel["name"] || "");
            newChannel.innerHTML = `<div class="symb">
                        forum
                    </div>
                    <div class="name">
                        ${safeName}
                    </div>
                    ${unread > 0 ? `<span class=\"badge\"></span>` : ""}
                    `;
            newChannel.setAttribute("active",
                channel["name"] === state.currentChannel
                    ? "true"
                    : "false");
            newChannel.addEventListener("click", () =>
                changeChannel(channel["name"]),
            );
        } else if (channel["type"] === "separator") {
            newChannel = document.createElement("hr");
        }
        if (newChannel) container.appendChild(newChannel);
    }
}


function generateValidatorAndAuth(vKey, authTok) {
    return (async () => {
        const url = `https://social.rotur.dev/generate_validator?key=${encodeURIComponent(vKey)}&auth=${encodeURIComponent(authTok)}`;
        const resp = await fetch(url);
        const j = await resp.json();
        if (j.error) throw new Error(j.error);
        state.validator = j.validator;
        localStorage.setItem("validator", j.validator);
        ws.send(JSON.stringify({ cmd: "auth", validator: j.validator }));
    })();
}

function roturToken() {
    return localStorage.getItem("rotur_auth_token");
}

function userRoles() {
    const u = state.user;
    if (!u) return [];
    return Array.isArray(u.roles)
        ? u.roles.map((r) => String(r).toLowerCase())
        : [];
}
function canSend(channelName) {
    const ch = state.channels[channelName];
    if (!ch) return true;
    if (ch.send === false) return false;
    if (ch.permissions && ch.permissions.send === false) return false;
    const roles = userRoles();
    if (
        Array.isArray(ch.denied_roles) &&
        ch.denied_roles.some((r) => roles.includes(String(r).toLowerCase()))
    )
        return false;
    if (Array.isArray(ch.allowed_roles) && ch.allowed_roles.length) {
        const allow = ch.allowed_roles.map((r) => String(r).toLowerCase());
        if (!roles.some((r) => allow.includes(r))) return false;
    }
    if (
        Array.isArray(ch.required_permissions) &&
        ch.required_permissions.includes("send") &&
        roles.length === 0
    )
        return false;
    return true;
}
function canView(channelName, userObj) {
    const ch = state.channels[channelName];
    if (!ch) return true;
    const required = ch.permissions?.view || ["user"]
    const roles = Array.isArray(userObj?.roles) ? userObj.roles.map(r => String(r).toLowerCase()) : [];
    for (let i = 0; i < required.length; i++) {
        if (roles.includes(required[i])) return true;
    }
    return false;
}

function extractUsername(u) {
    if (!u) return "";
    if (typeof u === "string") return u;
    if (typeof u === "object") {
        return (
            u.username || u.name || u.displayName || u.user || u.id || "[unknown]"
        );
    }
    return String(u);
}

function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
}

function replaceImageLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg))/gi,
        "![]($1)",
    );
}

function formatMessageContent(raw) {
    if (typeof raw !== "string") raw = String(raw ?? "");
    const emojiRegex = /^\p{Extended_Pictographic}$/u;
    if (emojiRegex.test(raw)) return `<span style="font-size:2em;line-height:1">${raw}</span>`;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let out = "";
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(raw))) {
        const [url] = match;
        const idx = match.index;
        if (idx > lastIndex) out += escapeHTML(raw.slice(lastIndex, idx));
        const proxiedUrl = `https://proxy.mistium.com/cors?url=${encodeURIComponent(url)}`;
        const safeHref = escapeHTML(proxiedUrl);
        const safeText = escapeHTML(url);
        if (/\.(webp|png|jpe?g|gif|svg)$/i.test(url)) {
            out += `<img src="${safeHref}" alt="${safeText}">`;
        } else {
            out += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
        }
        lastIndex = idx + url.length;
    }
    if (lastIndex < raw.length) out += escapeHTML(raw.slice(lastIndex));
    out = out.replace(/\r?\n/g, "<br>");
    return out;
}

function renderReplyExcerpt(message) {
    if (!message.reply_to) return "";
    let replyId = null;
    let hintedUser = "";
    if (typeof message.reply_to === "object") {
        replyId = message.reply_to.id || null;
        hintedUser = message.reply_to.user || "";
    }
    if (!replyId) return "";
    lastmsgun = null;
    const ref =
        message.reply_to_message ||
        state.messages[replyId] ||
        findMessageById(replyId);
    if (!ref) {
        if (hintedUser) {
            const color = getUserColor(hintedUser);
            return `<div class="reply-excerpt missing" data-ref="${escapeHTML(replyId)}"><div class="symb rplarrow"></div>Replying to <span class="reply-user" style="color:${color}">@${escapeHTML(hintedUser)}</span></div>`;
        }
        return `<div class="reply-excerpt missing" data-ref="${escapeHTML(replyId)}"><div class="rplarrow"></div>Replying to unknown message</div>`;
    }
    if (!state.messages[replyId]) state.messages[replyId] = ref; // ensure cached
    const preview = escapeHTML(stripHtml(ref.content || "").slice(0, 120));
    const colorRaw = getUserColor(ref.user || hintedUser || "");
    const color = colorRaw;
    const userShown = escapeHTML(ref.user || hintedUser || "unknown");
    return `<div class="reply-excerpt" data-ref="${escapeHTML(replyId)}"><div class="rplarrow"></div>
        <span class="reply-user" style="color:${color}">@${userShown}</span>
        <span class="reply-preview">${preview}</span>
    </div>`;
}

function findMessageById(id) {
    if (!id) return null;
    if (state.messages[id]) return state.messages[id];
    const msgNode = document.querySelector(
        `.message[data-id="${CSS.escape(id)}"]`,
    );
    if (msgNode) {
        const user =
            msgNode.getAttribute("data-user") ||
            msgNode.querySelector(".meta strong")?.textContent ||
            "";
        const contentEl = msgNode.querySelector(".content");
        const content = contentEl?.innerText || contentEl?.textContent || "";
        return { id, user, content };
    }
    return null;
}

function attemptResolveAllMissingReplies() {
    document
        .querySelectorAll(".reply-excerpt.missing[data-ref]")
        .forEach((el) => {
            const refId = el.getAttribute("data-ref");
            if (!refId) return;
            const ref = state.messages[refId] || findMessageById(refId);
            if (ref) {
                const color = getUserColor(ref.user || "");
                const preview = stripHtml(ref.content || "").slice(0, 120);
                el.classList.remove("missing");
                el.innerHTML = `<span class="reply-user" style="color:${color}">@${escapeHTML(ref.user)}</span><span class="reply-preview">${escapeHTML(preview)}</span>`;
            }
        });
}

function attemptResolveMissingRepliesFor(newId) {
    if (!newId) return;
    const waiting = document.querySelectorAll(
        `.reply-excerpt.missing[data-ref="${CSS.escape(newId)}"]`,
    );
    if (!waiting.length) return;
    const ref = state.messages[newId] || findMessageById(newId);
    if (!ref) return;
    const color = getUserColor(ref.user || "");
    const preview = escapeHTML(stripHtml(ref.content || "").slice(0, 120));
    waiting.forEach((el) => {
        el.classList.remove("missing");
        el.innerHTML = `<span class="reply-user" style="color:${color}">@${escapeHTML(ref.user)}</span><span class="reply-preview">${preview}</span>`;
    });
}
function updateChannelUnread(channelName) {
    const link = document.getElementById(`channel_${channelName}`);
    if (!link) return;
    const count = state.unread[channelName] || 0;
    let badge = link.querySelector(".badge");
    if (count <= 0) {
        if (badge) badge.remove();
        return;
    }
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "badge";
        link.appendChild(badge);
    }
}

var lastmsgun = null;
function renderMessage(message) {
    if (message && message.id) {
        const mid = message.id;
        state.messages[mid] = message;
        if (!message.id) message.id = mid;
    }
    const timestamp = message["timestamp"];
    const date = new Date(timestamp * 1000);
    const mdText = formatMessageContent(message["content"]);
    const replyBlock = renderReplyExcerpt(message);
    let html;
    if (message["user"] === lastmsgun) {
        html = `
        <div class="sing_msg extra">
                ${replyBlock}
                <div class="msg_ctnt extra">
            <div class="time" title="${date.toLocaleString()}">${escapeHTML(date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))}</div>
            <div class="data">
                <p>${mdText}</p>${message.edited ? '<span class="edited-tag">(edited)</span>' : ""}
            </div>
            </div>
        </div>
        `.trim();
    } else {
        const userColor = getUserColor(message["user"]);
        html = `
        <div class="sing_msg" data-id="${escapeHTML(message.id || "")}" data-user="${escapeHTML(message["user"])}">
                ${replyBlock}
                <div class="msg_ctnt">
            <img class="pfp" src="https://avatars.rotur.dev/${encodeURIComponent(message["user"])}" alt="${escapeHTML(message["user"])}">
            <div class="data">
                <div class="header">
                    <div class="name" style="color:${userColor}">${escapeHTML(message["user"])}</div>
                    <div class="time" title="${date.toLocaleString()}">${escapeHTML(date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))}</div>
                </div>
                <p>${mdText}</p>${message.edited ? '<span class="edited-tag">(edited)</span>' : ""}
            </div>
            </div>
        </div>
        `.trim();
    }
    lastmsgun = message["user"];
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    let repllkbtns = document.createElement("div");
    repllkbtns.classList.add("msg_actions");
    let replybtn = document.createElement("div");
    replybtn.classList.add("button");
    replybtn.classList.add("symb");
    replybtn.innerText = "reply"
    repllkbtns.appendChild(replybtn);
    replybtn.onclick = () => {
        if (state.editing) cancelEdit();
        state.reply_to[state.currentChannel] = message;
        if (canSend(state.currentChannel)) showreplyPrompt(message);
    }
    const messageDiv = wrapper.firstElementChild;
    messageDiv.appendChild(repllkbtns);
    return messageDiv;
}

function listMessages(messageList) {
    const chatArea = document.getElementById("msgs_list");
    chatArea.innerHTML = "";
    for (let message of messageList) {
        chatArea.appendChild(renderMessage(message));
    }
    chatArea.scrollTop = chatArea.scrollHeight;
    lazier.end();
    attemptResolveAllMissingReplies();
}

function addMessage(messagePacket) {
    const chatArea = document.getElementById("msgs_list");
    if (state.currentChannel == messagePacket["channel"]) {
        const message = messagePacket["message"];
        chatArea.appendChild(renderMessage(message));
        attemptResolveMissingRepliesFor(message.id);
        chatArea.scrollTop = chatArea.scrollHeight;
    } else {
        const ch = messagePacket["channel"];
        if (ch) {
            state.unread[ch] = (state.unread[ch] || 0) + 1;
            updateChannelUnread(ch);
        }
    }
}


function changeChannel(channel) {

    lastmsgun = null;
    state.currentChannel = channel;
    document
        .querySelectorAll(".single_chnl")
        .forEach((el) => {
            if (el.id === `channel_${channel}`) el.classList.add("active");
            else el.classList.remove("active");
        });
    const mainTxtAr = document.getElementById("mainTxtAr");
    if (mainTxtAr) mainTxtAr.placeholder = `Message #${channel}`;
    if (state.unread[channel]) {
        state.unread[channel] = 0;
        updateChannelUnread(channel);
    }
    updatemainTxtArPermissions();
    renderMembers()
}
function getUserColor(username) {
    const hex = state.users?.[username]?.color || "#888888";
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    return `hsl(${Math.round(h)}, 60%, 75%)`;
}


function renderMembers() {
    const root = document.getElementsByClassName("members_lists")[0];
    if (!root) return;
    root.innerHTML = "";

    const owners = [];
    const online = [];
    const offline = [];
    const isOwner = (u) =>
        Array.isArray(u?.roles) &&
        u.roles.some((r) => String(r).toLowerCase() === "owner");

    for (const uname in state.users) {
        const u = state.users[uname];
        if (!u) continue;
        if (!canView(state.currentChannel, u)) continue;
        const isOn = !!state.online_users[uname];
        if (isOwner(u) && isOn) owners.push(u);
        else if (isOn) online.push(u);
        else offline.push(u);
    }

    const sortUsers = (arr) =>
        arr.sort((a, b) =>
            (a.displayName || a.username).localeCompare(b.displayName || b.username),
        );
    sortUsers(owners);
    sortUsers(online);
    sortUsers(offline);

    const section = (title, list, opts = {}) => {
        if (!list.length) return;
        const titleEl = document.createElement("div");
        titleEl.className = "sublist_title";
        titleEl.textContent = `${title.toUpperCase()} - ${list.length}`;
        root.appendChild(titleEl);
        for (const u of list) {
            const uname = u.username;
            const entry = document.createElement("div");
            entry.className = "profile_card" + (opts.offline ? " offline" : "");
            const color = getUserColor(uname);
            const disp = escapeHTML(u.displayName || uname);
            entry.innerHTML = `
        <img src="https://avatars.rotur.dev/${encodeURIComponent(uname)}" alt="${disp}" class="pfp">
         <div class="data">
                            <div class="name" style="color:${color}">${disp} ${isOwner(u) ? '<span class="role-pill symb" title="Owner">crown</span>' : ""}</div>
                        </div>
        <span</span>
        
            `;
            root.appendChild(entry);
        }
    };

    section("Owner", owners);
    section("Online", online);
    section("Offline", offline, { offline: true });
}

function updatemainTxtArPermissions() {
    const input = document.getElementById("mainTxtAr");
    if (!input) return;
    if (!canSend(state.currentChannel)) {
        input.disabled = true;
        input.placeholder = "Unable to message here";
        hidereplyPrompt();
    } else {
        input.disabled = false;
        input.placeholder = `Message #${state.currentChannel}`;
    }
}

updatemainTxtArPermissions();

function updateUserPanel() {
    const avatar = document.getElementById("userAvatar");
    const nameLabel = document.getElementById("usernameLabel");
    if (state.user) {
        const uname = extractUsername(state.user);
        if (avatar)
            avatar.src = `https://avatars.rotur.dev/${encodeURIComponent(uname)}`;
        if (nameLabel) nameLabel.textContent = uname;
    } else {
        if (nameLabel) nameLabel.textContent = "Not logged in";
        if (avatar) avatar.src = "assets/unknown.png";
    }
}

if (roturToken()) {
    document.getElementById("authPrompt")?.remove();
    connectWebSocket();
} else {
    RoturAuth.login_prompt({
        STYLE_URL: location.origin + "/assets/style.css",
    });
}

var loaderElement = document.getElementById("orion")
var loader = {
    show: () => {
        loaderElement.style.display = 'flex';
        loaderElement.style.opacity = '1';
    },
    hide: () => {
        loaderElement.style.opacity = '0';
        loaderElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            loaderElement.style.display = 'none';
        }, 300);
    },
}

var lazier = {
    start: () => {
        document.body.classList.add("lazier_loader")
    },
    end: () => {
        document.body.classList.remove("lazier_loader")
    }
}


function showreplyPrompt(msg) {

    document.querySelectorAll('.replyingto').forEach(el => el.classList.remove('replyingto'))
    const banner = document.getElementById("replyPrompt");
    if (!banner) return;
    if (!canSend(state.currentChannel)) return;
    if (state.editing) cancelEdit();
    console.log(msg)
    document.body.querySelector(`[data-id="${msg.id}"]`).classList.add("replyingto");
    banner.classList.remove("hidden");
    const uname =
        msg.user || (typeof msg === "object" && msg.username) || "unknown";
    banner.innerHTML = `<div>Replying to <div id="replyun">${escapeHTML(uname)}</div>
                    </div><div class="clsbtn symb" id="cancelReplyBtn">close</div>`;
    document.getElementById("cancelReplyBtn").onclick = () => {
        state.reply_to[state.currentChannel] = null;
        hidereplyPrompt(msg);
    };
}
function hidereplyPrompt() {
    const banner = document.getElementById("replyPrompt");
    if (banner) {
        banner.classList.add("hidden");
        banner.innerHTML = "";
    }
    document.querySelectorAll('.replyingto').forEach(el => el.classList.remove('replyingto'))
}