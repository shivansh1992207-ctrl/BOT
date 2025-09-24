module.exports.config = {
    name: "gclock",
    aliases: ["glock", "grouplock"],
    version: "1.0",
    credits: "Anurag Mishra",
    description: "Lock the group name to a specific name",
    usage: "[prefix]gclock <name>",
    cooldown: 5
};

module.exports.run = async({ api, event, args, utils, getDB }) => {
    const threadID = event.threadID;
    const groupName = args.join(" ");
    if (!groupName) return api.sendMessage("Please provide a group name to lock.", threadID);

    // Save locked name to DB
    let db = getDB();
    db.groupLock = db.groupLock || {};
    db.groupLock[threadID] = groupName;

    api.changeGroupInfo(threadID, { name: groupName }, (err) => {
        if (err) return api.sendMessage("Failed to lock group name.", threadID);
        api.sendMessage(`✅ Group name locked as "${groupName}"`, threadID);
    });
};
