import fs from "fs";
import path from "path";
import login from "ws3-fca";
import config from "./config.json" assert { type: "json" };

const commands = new Map();
const events = new Map();

// --- Load Commands ---
const commandFiles = fs.readdirSync(path.join("./commands")).filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const cmd = (await import(`./commands/${file}`)).default;
  commands.set(cmd.name, cmd);
  console.log("✅ Command loaded:", cmd.name);
}

// --- Load Events ---
const eventFiles = fs.readdirSync(path.join("./events")).filter(f => f.endsWith(".js"));
for (const file of eventFiles) {
  const evt = (await import(`./events/${file}`)).default;
  events.set(evt.trigger, evt);
  console.log("✅ Event loaded:", evt.name);
}

// --- Login ---
if (!fs.existsSync("appstate.json")) {
  console.error("❌ appstate.json not found!");
  process.exit(1);
}
const appState = JSON.parse(fs.readFileSync("appstate.json", "utf8"));

login({ appState }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Logged in as UID:", api.getCurrentUserID());

  api.listenMqtt(async (err, event) => {
    if (err) return console.error(err);

    // --- Command Handler ---
    if (event.type === "message" && event.body?.startsWith(config.prefix)) {
      const args = event.body.slice(config.prefix.length).trim().split(/\s+/);
      const cmdName = args.shift().toLowerCase();
      const command = commands.get(cmdName);
      if (command) {
        try {
          await command.run({ api, event, args, config });
        } catch (e) {
          console.error("Command error:", e);
        }
      }
    }

    // --- Event Handler ---
    if (event.type === "event" && events.has(event.logMessageType)) {
      const evt = events.get(event.logMessageType);
      try {
        await evt.run({ api, event, config });
      } catch (e) {
        console.error("Event error:", e);
      }
    }
  });
});
