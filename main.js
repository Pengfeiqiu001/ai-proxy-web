const API_BASE = "https://chat-uzfs.vercel.app"; // 部署后替换为你的后端域名

const chat = document.getElementById("chat");
const form = document.getElementById("f");
const q = document.getElementById("q");
let history = [];

function append(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "ai");
  div.textContent = (role === "user" ? "你: " : "AI: ") + text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = q.value.trim();
  if (!text) return;
  append("user", text);
  q.value = "";
  history.push({ role: "user", content: text });

  try {
    const resp = await fetch(API_BASE + "/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history, stream: true })
    });

    if (resp.headers.get("content-type")?.includes("text/event-stream")) {
      const reader = resp.body.getReader();
      let buffer = "";
      let acc = "";
      const aiDiv = document.createElement("div");
      aiDiv.className = "msg ai";
      aiDiv.textContent = "AI: ";
      chat.appendChild(aiDiv);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        for (let i = 0; i < parts.length - 1; i++) {
          const line = parts[i].trim();
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const delta = obj.choices?.[0]?.delta?.content || "";
              acc += delta;
              aiDiv.textContent = "AI: " + acc;
            } catch {}
          }
        }
        buffer = parts[parts.length - 1];
        chat.scrollTop = chat.scrollHeight;
      }
      history.push({ role: "assistant", content: acc });
      return;
    }

    const data = await resp.json();
    const textOut = data.choices?.[0]?.message?.content || JSON.stringify(data);
    append("assistant", textOut);
    history.push({ role: "assistant", content: textOut });
  } catch (e) {
    append("assistant", "出错了：" + e.message);
  }
});
