const path = require("path");
const which = require("which")
const config = require("./config.json");
const event_1 = require("bdsx/event");
const launcher_1 = require("bdsx/launcher");
const cr = require("bdsx/commandresult");
const admZip = require('adm-zip');
let lasttime = 0;
let status = false
let backupLock = false
let afterOpen = false;
event_1.events.serverOpen.on(() => {
    afterOpen = true;
    if (config.launchBackup) {
        let status = -1
        launcher_1.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data)
        startBackupLog();
    }
})
event_1.events.playerJoin.on(() => {
    status = true;
})
const b = setInterval(() => {
    if (!afterOpen) {
        clearInterval(b)
    };
    const date = new Date();
    if (date.getTime() / 1000 - lasttime >= config.intervalMin * 60 && (!config.checkActive || (config.checkActive && status))) {
        let status = -1
        launcher_1.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data)
        startBackupLog();
    } else {
        console.log(`[BDSX-Backup] Skip Backup (${config.intervalMin * 60 - (date.getTime() / 1000 - lasttime)} seconds left)`)
    }
}, config.checkMin * 60000);

const check = setInterval(() => {
    if (!afterOpen) return;
    if (backupLock) return;
    const cmd = launcher_1.bedrockServer.executeCommand("save query", cr.CommandResultType.Data)
    if (cmd.data.statusCode === 0) {
        console.log(cmd.data.statusMessage);
        backupLock = true;
        backup();
    }
}, 5000);

function startBackupLog() {
    console.log("[BDSX-Backup]Start Backup...")
    for (const player of launcher_1.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage("§lStart Backup...")
    }
}

function finishBackupLog() {
    console.log("[BDSX-Backup]Finish Backup!")
    for (const player of launcher_1.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage("§lFinish Backup!")
    }
    launcher_1.bedrockServer.executeCommand("save resume", cr.CommandResultType.Data)

}

function backup() {
    const zip = new admZip();
    const date = new Date();
    lasttime = date.getTime() / 1000;
    try {
        zip.addLocalFolder(path.resolve(__dirname, "../../bedrock_server/worlds/Bedrock level"))
        zip.writeZip(`${path.resolve(__dirname, config.saveDirectory)}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.zip`, (err) => {
            if (err) {
                console.log(`[BDSX-Backup] ERROR! Error Log:\n${err}`);
                return;
            }
            lasttime = date.getTime() / 1000
            if (launcher_1.bedrockServer.serverInstance.getPlayers().length == 0) {
                status = false;
            } else {
                status = true;
            }
            finishBackupLog();
            backupLock = false
        })
    } catch (e) {
        console.log(`[BDSX-Backup] ERROR! Error Log:\n${e}`)
    }
}

event_1.events.serverLeave.on(() => {
    clearInterval(check);
    clearInterval(b);
    afterOpen = false;
    console.log("STOP")
    //process.exit(0);
})
/*
event_1.events.commandOutput.on((value) => {
    if (value.startsWith("Data saved. Files are now ready to be copied.")) {
        backupLock = true;
        backup();
    }
})
*/