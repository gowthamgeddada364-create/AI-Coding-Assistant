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

sendBtn.addEventListener("click", sendMessage);

themeBtn.addEventListener("click", function () {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeBtn.textContent = "☀️";
    } else {
        themeBtn.textContent = "🌙";
    }

});

newChatBtn.addEventListener("click", function () {

    chatBox.innerHTML = "";

    const welcome = document.createElement("div");
    welcome.classList.add("bot-message");
    welcome.textContent = "Hello 👋 Welcome to AI Chatbot.";

    chatBox.appendChild(welcome);

});

clearHistoryBtn.addEventListener("click", async function () {

    const confirmDelete = confirm(
        "⚠️ Are you sure you want to delete all chat history?"
    );

    if (!confirmDelete) {
        return;
    }

    const response = await fetch("/clear-history", {
        method: "POST"
    });

    const data = await response.json();

    if (data.status === "success") {

        chatBox.innerHTML = "";

        const welcome = document.createElement("div");
        welcome.classList.add("bot-message");
        welcome.textContent = "Hello 👋 Welcome to AI Chatbot.";

        chatBox.appendChild(welcome);

        alert("✅ Chat history deleted successfully!");

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

    if (confirm("Are you sure you want to logout?")) {

        window.location.href = "/logout";

    }

});


voiceBtn.addEventListener("click", function () {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

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

userInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }

});

async function loadHistory() {
    try{
        const response = await fetch("/history");
        const chats = await response.json();

        chatBox.innerHTML = "";

        chats.forEach(chat => {

        // User Message
        const userMessage = document.createElement("div");
        userMessage.classList.add("user-message");
        userMessage.textContent = chat.user;
        chatBox.appendChild(userMessage);

        // Bot Message
        const botMessage = document.createElement("div");
        botMessage.classList.add("bot-message");
        botMessage.innerHTML = marked.parse(chat.bot);

        // Highlight Code
        botMessage.querySelectorAll("pre code").forEach((block) => {
            hljs.highlightElement(block);
        });

        // Copy Button
        botMessage.querySelectorAll("pre").forEach((pre) => {

            const button = document.createElement("button");
            button.innerText = "📋 Copy";
            button.classList.add("copy-btn");

            button.onclick = function () {

                const code = pre.querySelector("code").innerText;

                navigator.clipboard.writeText(code);

                button.innerText = "✅ Copied!";

                setTimeout(() => {
                    button.innerText = "📋 Copy";
                }, 2000);

            };

            pre.prepend(button);

        });

        chatBox.appendChild(botMessage);

    });

    chatBox.scrollTop = chatBox.scrollHeight;

} catch(error){}
}
async function sendMessage() {

    const message = userInput.value.trim();

    if (message === "") {
        return;
    }

    // User Message
    const userMessage = document.createElement("div");
    userMessage.classList.add("user-message");
    userMessage.textContent = message;
    chatBox.appendChild(userMessage);

    userInput.value = "";

    chatBox.scrollTop = chatBox.scrollHeight;

    // Show typing animation
typing.style.display = "block";

    // Send message to Flask
    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message
        })
    });

    const data = await response.json();

// Wait for 1 second before showing reply
setTimeout(() => {

    // Hide typing animation
    typing.style.display = "none";

    // Bot Message
    const botMessage = document.createElement("div");
    botMessage.classList.add("bot-message");

    // Markdown
    botMessage.innerHTML = marked.parse(data.reply);


    // Highlight code
    botMessage.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
    });

    // Copy Button
    botMessage.querySelectorAll("pre").forEach((pre) => {
        console.log("Copy button added");
        const button = document.createElement("button");
        button.innerText = "📋 Copy";
        button.classList.add("copy-btn");

        button.onclick = function () {

            const code = pre.querySelector("code").innerText;

            navigator.clipboard.writeText(code);

            button.innerText = "✅ Copied!";

            setTimeout(() => {
                button.innerText = "📋 Copy";
            }, 2000);

        };

        pre.prepend(button);

    });

    chatBox.appendChild(botMessage);

    chatBox.scrollTop = chatBox.scrollHeight;

}, 1000);
}
loadHistory();