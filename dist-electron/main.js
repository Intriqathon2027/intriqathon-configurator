import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
//#region src/electron/services/PlatformService.ts
var PlatformService = class {
	static getPlatform() {
		return process.platform;
	}
	static isWindows() {
		return process.platform === "win32";
	}
	static writeEnvFile(dirPath, content) {
		try {
			fs.writeFileSync(path.join(dirPath, ".env"), content);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	}
};
//#endregion
//#region src/electron/services/DeployService.ts
var __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
var DeployService = class {
	childProcess = null;
	getScriptPath(scriptNameBase = "script") {
		const scriptName = PlatformService.isWindows() ? `${scriptNameBase}.bat` : `${scriptNameBase}.sh`;
		if (__dirname$1.includes("app.asar") && process.resourcesPath) return path.join(process.resourcesPath, "src/cmd_scripts", scriptName);
		return path.join(process.env.APP_ROOT, "src/cmd_scripts", scriptName);
	}
	debug(win, msg) {
		win.webContents.send("deploy:stdout", `[DEBUG] ${msg}`);
	}
	start(ipv4, sourceDir, win, sshPassword) {
		this.cancel();
		const scriptPath = this.getScriptPath();
		const isWin = PlatformService.isWindows();
		this.debug(win, `Plateforme : ${process.platform}`);
		this.debug(win, `Script : ${scriptPath}`);
		this.debug(win, `Existe : ${fs.existsSync(scriptPath)}`);
		this.debug(win, `IPV4 : ${ipv4}`);
		this.debug(win, `SOURCE_DIR : ${sourceDir}`);
		if (!fs.existsSync(scriptPath)) {
			win.webContents.send("deploy:error", `Script introuvable : ${scriptPath}`);
			return;
		}
		if (!isWin) try {
			fs.chmodSync(scriptPath, 493);
			this.debug(win, "chmod 755 appliqué au script");
		} catch (e) {
			this.debug(win, `chmod échoué (non bloquant) : ${String(e)}`);
		}
		const env = {
			...process.env,
			DISPLAY: ""
		};
		if (sshPassword) {
			env.SSHPASS = sshPassword;
			this.debug(win, `SSHPASS configuré pour l'authentification`);
		}
		const args = isWin ? ["cmd.exe", [
			"/c",
			scriptPath,
			ipv4,
			sourceDir
		]] : ["bash", [
			scriptPath,
			ipv4,
			sourceDir
		]];
		this.debug(win, `Commande : ${args[0]} ${args[1].join(" ")}`);
		const spawnOpts = {
			env,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = spawn(args[0], args[1], spawnOpts);
		this.debug(win, `PID : ${this.childProcess?.pid ?? "N/A"}`);
		this.childProcess?.stdout?.on("data", (data) => {
			const lines = data.toString().split("\n");
			for (const line of lines) if (line.trim()) win.webContents.send("deploy:stdout", line.trimEnd());
		});
		this.childProcess?.stderr?.on("data", (data) => {
			const lines = data.toString().split("\n");
			for (const line of lines) if (line.trim()) win.webContents.send("deploy:stderr", line.trimEnd());
		});
		this.childProcess?.on("close", (code, signal) => {
			this.debug(win, `Processus terminé — code: ${code}, signal: ${signal}`);
			win.webContents.send("deploy:exit", code);
			this.childProcess = null;
		});
		this.childProcess?.on("error", (err) => {
			this.debug(win, `Erreur spawn : ${err.message}`);
			win.webContents.send("deploy:error", err.message);
			this.childProcess = null;
		});
	}
	startRestart(ipv4, win, sshPassword) {
		this.cancel();
		const scriptPath = this.getScriptPath("restart_docker");
		const isWin = PlatformService.isWindows();
		this.debug(win, `Plateforme : ${process.platform}`);
		this.debug(win, `Script : ${scriptPath}`);
		this.debug(win, `Existe : ${fs.existsSync(scriptPath)}`);
		this.debug(win, `IPV4 : ${ipv4}`);
		if (!fs.existsSync(scriptPath)) {
			win.webContents.send("deploy:error", `Script introuvable : ${scriptPath}`);
			return;
		}
		if (!isWin) try {
			fs.chmodSync(scriptPath, 493);
			this.debug(win, "chmod 755 appliqué au script");
		} catch (e) {
			this.debug(win, `chmod échoué (non bloquant) : ${String(e)}`);
		}
		const env = {
			...process.env,
			DISPLAY: ""
		};
		if (sshPassword) {
			env.SSHPASS = sshPassword;
			this.debug(win, `SSHPASS configuré pour l'authentification`);
		}
		const args = isWin ? ["cmd.exe", [
			"/c",
			scriptPath,
			ipv4
		]] : ["bash", [scriptPath, ipv4]];
		this.debug(win, `Commande : ${args[0]} ${args[1].join(" ")}`);
		const spawnOpts = {
			env,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = spawn(args[0], args[1], spawnOpts);
		this.debug(win, `PID : ${this.childProcess?.pid ?? "N/A"}`);
		this.childProcess?.stdout?.on("data", (data) => {
			const lines = data.toString().split("\n");
			for (const line of lines) if (line.trim()) win.webContents.send("deploy:stdout", line.trimEnd());
		});
		this.childProcess?.stderr?.on("data", (data) => {
			const lines = data.toString().split("\n");
			for (const line of lines) if (line.trim()) win.webContents.send("deploy:stderr", line.trimEnd());
		});
		this.childProcess?.on("close", (code, signal) => {
			this.debug(win, `Processus terminé — code: ${code}, signal: ${signal}`);
			win.webContents.send("deploy:exit", code);
			this.childProcess = null;
		});
		this.childProcess?.on("error", (err) => {
			this.debug(win, `Erreur spawn : ${err.message}`);
			win.webContents.send("deploy:error", err.message);
			this.childProcess = null;
		});
	}
	cancel() {
		if (this.childProcess) {
			this.childProcess.kill("SIGTERM");
			this.childProcess = null;
		}
	}
	sendInput(text) {
		if (this.childProcess?.stdin?.writable) this.childProcess.stdin.write(text);
	}
	isRunning() {
		return this.childProcess !== null;
	}
};
//#endregion
//#region src/electron/ipc/deployHandlers.ts
function registerDeployHandlers(getWin) {
	const deployService = new DeployService();
	ipcMain.handle("deploy:get-platform", () => PlatformService.getPlatform());
	ipcMain.handle("deploy:write-env", (_event, dirPath, content) => PlatformService.writeEnvFile(dirPath, content));
	ipcMain.handle("deploy:start", (_event, ipv4, sourceDir, sshPassword) => {
		const win = getWin();
		if (!win) throw new Error("No active window");
		deployService.start(ipv4, sourceDir, win, sshPassword);
	});
	ipcMain.handle("deploy:restart", (_event, ipv4, sshPassword) => {
		const win = getWin();
		if (!win) throw new Error("No active window");
		deployService.startRestart(ipv4, win, sshPassword);
	});
	ipcMain.handle("deploy:cancel", () => deployService.cancel());
	ipcMain.handle("deploy:send-input", (_event, text) => deployService.sendInput(text));
}
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
function createWindow() {
	win = new BrowserWindow({
		width: 1320,
		height: 880,
		minWidth: 1e3,
		minHeight: 680,
		titleBarStyle: "hiddenInset",
		trafficLightPosition: {
			x: 16,
			y: 16
		},
		backgroundColor: "#F8FAF9",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true
		},
		icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg")
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
ipcMain.handle("open-external-url", async (_event, url) => {
	await shell.openExternal(url);
});
ipcMain.handle("open-folder-dialog", async () => {
	const result = await dialog.showOpenDialog(win, {
		properties: ["openDirectory"],
		title: "Sélectionner le dossier de déploiement"
	});
	if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0];
	return null;
});
ipcMain.handle("save-env-file", async (_event, content) => {
	const result = await dialog.showSaveDialog(win, {
		title: "Sauvegarder le fichier .env",
		defaultPath: ".env",
		filters: [{
			name: "Env Files",
			extensions: ["env"]
		}]
	});
	if (!result.canceled && result.filePath) {
		fs.writeFileSync(result.filePath, content, "utf-8");
		return {
			success: true,
			path: result.filePath
		};
	}
	return { success: false };
});
ipcMain.handle("save-local-config", async (_event, config) => {
	const configPath = path.join(app.getPath("userData"), "local-config.json");
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
	return { success: true };
});
ipcMain.handle("load-local-config", async () => {
	const configPath = path.join(app.getPath("userData"), "local-config.json");
	if (fs.existsSync(configPath)) {
		const raw = fs.readFileSync(configPath, "utf-8");
		return JSON.parse(raw);
	}
	return {};
});
ipcMain.handle("export-config", async (_event, config) => {
	const result = await dialog.showSaveDialog(win, {
		title: "Exporter la configuration",
		defaultPath: "intriqathon-config.json",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	if (!result.canceled && result.filePath) {
		fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), "utf-8");
		return {
			success: true,
			path: result.filePath
		};
	}
	return { success: false };
});
ipcMain.handle("import-config", async () => {
	const result = await dialog.showOpenDialog(win, {
		title: "Importer la configuration",
		properties: ["openFile"],
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	if (!result.canceled && result.filePaths.length > 0) {
		const raw = fs.readFileSync(result.filePaths[0], "utf-8");
		try {
			return {
				data: JSON.parse(raw),
				path: result.filePaths[0]
			};
		} catch (e) {
			return null;
		}
	}
	return null;
});
ipcMain.handle("save-recent-configs", async (_event, configs) => {
	const configPath = path.join(app.getPath("userData"), "recent-configs.json");
	fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), "utf-8");
	return { success: true };
});
ipcMain.handle("load-recent-configs", async () => {
	const configPath = path.join(app.getPath("userData"), "recent-configs.json");
	if (fs.existsSync(configPath)) {
		const raw = fs.readFileSync(configPath, "utf-8");
		try {
			return JSON.parse(raw);
		} catch {
			return [];
		}
	}
	return [];
});
ipcMain.handle("read-config-file", async (_event, filePath) => {
	if (fs.existsSync(filePath)) {
		const raw = fs.readFileSync(filePath, "utf-8");
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}
	return null;
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
registerDeployHandlers(() => win);
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
