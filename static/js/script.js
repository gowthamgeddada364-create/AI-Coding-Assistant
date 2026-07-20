const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const themeBtn = document.getElementById("theme-btn");
const voiceBtn = document.getElementById("voice-btn");
const typing = document.getElementById("typing");
const newChatBtn = document.getElementById("new-chat-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const exportBtn = document.getElementById("export-btn");
const logoutBtn = document.getElementById("logout-btn");
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("open");
});

document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768 &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove("open");
    }
});

themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("light");
    themeBtn.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
    if (document.body.classList.contains("light")) {
        document.querySelector('.header-subtitle').textContent = 'Light mode';
    } else {
        document.querySelector('.header-subtitle').textContent = 'Gemini 2.5 Flash';
    }
});

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', function () {
        userInput.value = this.getAttribute('data-prompt') || this.textContent;
        sendMessage();
    });
});

newChatBtn.addEventListener("click", function () {
    chatBox.innerHTML = "";
    const welcome = document.querySelector(".welcome-message");
    if (welcome) {
        chatBox.appendChild(welcome.cloneNode(true));
    } else {
        showWelcomeMessage();
    }
    if (window.innerWidth <= 768) sidebar.classList.remove("open");
});

clearHistoryBtn.addEventListener("click", async function () {
    if (!confirm("Delete all chat history?")) return;
    const response = await fetch("/clear-history", { method: "POST" });
    const data = await response.json();
    if (data.status === "success") {
        chatBox.innerHTML = "";
        showWelcomeMessage();
    }
});

exportBtn.addEventListener("click", async function () {
    const response = await fetch("/export");
    const data = await response.json();
    const blob = new Blob([data.chat], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI_Chat_History.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
});

logoutBtn.addEventListener("click", function () {
    if (confirm("Logout?")) window.location.href = "/logout";
});

voiceBtn.addEventListener("click", function () {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    voiceBtn.textContent = "🎙️";
    recognition.onresult = function (event) {
        userInput.value = event.results[0][0].transcript;
        voiceBtn.textContent = "🎤";
        sendMessage();
    };
    recognition.onerror = function () {
        voiceBtn.textContent = "🎤";
        alert("Voice recognition failed.");
    };
    recognition.onend = function () {
        voiceBtn.textContent = "🎤";
    };
});

function showWelcomeMessage() {
    const div = document.createElement("div");
    div.classList.add("welcome-message");
    div.innerHTML = `
        <div class="welcome-icon">🤖</div>
        <h3>Hello! 👋</h3>
        <p>I'm your AI coding assistant. Ask me anything about code, debugging, or software development.</p>
        <div class="suggestion-chips">
            <div class="chip" data-prompt="Write a Python function to sort a list">Write a Python function to sort a list</div>
            <div class="chip" data-prompt="Explain how REST APIs work">Explain how REST APIs work</div>
            <div class="chip" data-prompt="Debug this: IndexError">Debug this: IndexError</div>
            <div class="chip" data-prompt="Write a SQL query to join two tables">Write a SQL query to join two tables</div>
        </div>
    `;
    chatBox.appendChild(div);
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', function () {
            userInput.value = this.getAttribute('data-prompt') || this.textContent;
            sendMessage();
        });
    });
}

async function loadHistory() {
    try {
        const response = await fetch("/history");
        const chats = await response.json();
        if (chats.length === 0) return;
        chatBox.innerHTML = "";
        chats.forEach(chat => {
            const userMessage = document.createElement("div");
            userMessage.classList.add("user-message");
            userMessage.textContent = chat.user;
            chatBox.appendChild(userMessage);
            const botMessage = document.createElement("div");
            botMessage.classList.add("bot-message");
            botMessage.innerHTML = marked.parse(chat.bot);
            botMessage.querySelectorAll("pre code").forEach((block) => {
                hljs.highlightElement(block);
            });
            botMessage.querySelectorAll("pre").forEach((pre) => {
                const button = document.createElement("button");
                button.innerText = "📋 Copy";
                button.classList.add("copy-btn");
                button.onclick = function () {
                    const code = pre.querySelector("code").innerText;
                    navigator.clipboard.writeText(code);
                    button.innerText = "✅ Copied!";
                    setTimeout(() => { button.innerText = "📋 Copy"; }, 2000);
                };
                pre.prepend(button);
            });
            chatBox.appendChild(botMessage);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) { }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") return;
    const welcomeMsg = document.querySelector(".welcome-message");
    if (welcomeMsg) welcomeMsg.remove();
    const userMessage = document.createElement("div");
    userMessage.classList.add("user-message");
    userMessage.textContent = message;
    chatBox.appendChild(userMessage);
    userInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
    typing.style.display = "flex";
    const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
    });
    const data = await response.json();
    setTimeout(() => {
        typing.style.display = "none";
        const botMessage = document.createElement("div");
        botMessage.classList.add("bot-message");
        botMessage.innerHTML = marked.parse(data.reply);
        botMessage.querySelectorAll("pre code").forEach((block) => {
            hljs.highlightElement(block);
        });
        botMessage.querySelectorAll("pre").forEach((pre) => {
            const button = document.createElement("button");
            button.innerText = "📋 Copy";
            button.classList.add("copy-btn");
            button.onclick = function () {
                const code = pre.querySelector("code").innerText;
                navigator.clipboard.writeText(code);
                button.innerText = "✅ Copied!";
                setTimeout(() => { button.innerText = "📋 Copy"; }, 2000);
            };
            pre.prepend(button);
        });
        chatBox.appendChild(botMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);
}

loadHistory();
