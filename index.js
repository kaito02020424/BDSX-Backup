//Package
const path = require(`path`);
const event = require(`bdsx/event`);
const launcher = require(`bdsx/launcher`);
const cr = require(`bdsx/commandresult`);
const admZip = require(`adm-zip`);

//Import apis
const { backupApi } = require("./api");

//Json files
const config = require(`./config.json`);



//Settings
let lastTime = 0;
let status = false;
let backupLock = false;
let afterOpen = false;
const pluginName = `[BDSX-Backup]`



//Events
event.events.serverOpen.on(() => {
    afterOpen = true;
    if (config.launchBackup) {
        launcher.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data);
        startBackupLog();
    }
})

event.events.playerJoin.on(() => {
    status = true;
})

event.events.serverLeave.on(async () => {
    clearInterval(check && backups);
    afterOpen = false;
    backupLock = true;
    console.log(`${pluginName}: Stop`);
    zl=null;
    log()
})



//Variable
const backups = setInterval(() => {
    if (!afterOpen) return;
    if (backupLock) return;
    if (date().getTime() / 1000 - lastTime >= config.intervalMin * 60 && (!config.checkActive || (config.checkActive && status))) {
        launcher.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data);
        startBackupLog();
    } else {
        console.log(`[BDSX-Backup] SKip Backup (${Math.round(config.intervalMin * 60 - (date().getTime() / 1000 - lastTime))} seconds left)`);
    }
}, config.checkMin * 60000)

const check = setInterval(() => {
    if (!afterOpen) return;
    if (backupLock) return;
    const cmd = launcher.bedrockServer.executeCommand("save query", cr.CommandResultType.Data);
    if (cmd.data.statusCode === 0) {
        console.log(cmd.data.statusMessage);
        backupLock = true;
        backup();
    }
}, 5000)



//Functions
function startBackupLog() {
    backupApi.emit("startBackup");
    console.log(`${pluginName}: Start Backup...`);
    for (const player of launcher.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage(`${pluginName}: Start Backup...`);
    }
}

function finishBackupLog() {
    backupApi.emit("finishBackup");
    console.log(`${pluginName}: Finish Backup!`);
    for (const player of launcher.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage(`${pluginName}: Finish Backup!`);
    }
    launcher.bedrockServer.executeCommand("save resume", cr.CommandResultType.Data);
}

async function backup() {
    let zip = new admZip();
    lastTime = date().getTime() / 1000;
    zip.addLocalFolderPromise(path.resolve(__dirname, `../../bedrock_server/worlds/${config.WorldName}`))
        .then(() => {
            return zip.writeZipPromise(`${path.resolve(__dirname, config.saveDirectory)}/${date().getFullYear()}-${date().getMonth() + 1}-${date().getDate()}-${date().getHours()}-${date().getMinutes()}-${date().getSeconds()}.zip`)
        })
        .then((err) => {
            if (!err) {
                console.log(`${pluginName}: Error!`);
                finishBackupLog();
                zip = null;
                return;
            } else {
                if (launcher.bedrockServer.serverInstance.getPlayers().length == 0) {
                    status = false;
                } else {
                    status = true;
                }
                finishBackupLog();
                backupLock = false;
            }
        })
        .catch((reason) => {
            finishBackupLog();
            console.log(`${pluginName}: Error Log:\n${reason}`);
            backupLock = false;
        })
        .finally(() => {
            zip = null;
        })
    
}

function date() {
    return new Date()
}