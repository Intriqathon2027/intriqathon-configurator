import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
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
		width: 1100,
		height: 750,
		minWidth: 900,
		minHeight: 600,
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
		return { success: true };
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
			return JSON.parse(raw);
		} catch (e) {
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
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
