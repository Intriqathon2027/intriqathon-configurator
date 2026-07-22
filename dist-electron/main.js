import { BrowserWindow as e, app as t, dialog as n, ipcMain as r, shell as i } from "electron";
import { fileURLToPath as a } from "node:url";
import o from "node:path";
import s from "node:fs";
import { spawn as c } from "node:child_process";
//#region src/electron/services/PlatformService.ts
var l = class {
	static getPlatform() {
		return process.platform;
	}
	static isWindows() {
		return process.platform === "win32";
	}
	static writeEnvFile(e, t) {
		try {
			return s.writeFileSync(o.join(e, ".env"), t), { success: !0 };
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}
}, u = class {
	childProcess = null;
	getScriptPath() {
		let e = l.isWindows() ? "script.bat" : "script.sh";
		return __dirname.includes("app.asar") && process.resourcesPath ? o.join(process.resourcesPath, "src/cmd_scripts", e) : o.join(process.env.APP_ROOT, "src/cmd_scripts", e);
	}
	start(e, t, n) {
		this.cancel();
		let r = this.getScriptPath(), i = l.isWindows(), a = {
			...process.env,
			SSH_ASKPASS: "",
			DISPLAY: ""
		};
		i ? this.childProcess = c("cmd.exe", [
			"/c",
			r,
			e,
			t
		], { env: a }) : this.childProcess = c("bash", [
			r,
			e,
			t
		], { env: a }), this.childProcess.stdout?.on("data", (e) => {
			let t = e.toString().split("\n");
			for (let e of t) e.trim() && n.webContents.send("deploy:stdout", e);
		}), this.childProcess.stderr?.on("data", (e) => {
			let t = e.toString().split("\n");
			for (let e of t) e.trim() && n.webContents.send("deploy:stderr", e);
		}), this.childProcess.on("close", (e) => {
			n.webContents.send("deploy:exit", e), this.childProcess = null;
		}), this.childProcess.on("error", (e) => {
			n.webContents.send("deploy:error", e.message), this.childProcess = null;
		});
	}
	cancel() {
		this.childProcess &&= (this.childProcess.kill("SIGTERM"), null);
	}
	sendInput(e) {
		this.childProcess && this.childProcess.stdin && this.childProcess.stdin.write(e);
	}
	isRunning() {
		return this.childProcess !== null;
	}
};
//#endregion
//#region src/electron/ipc/deployHandlers.ts
function d(e) {
	let t = new u();
	r.handle("deploy:get-platform", () => l.getPlatform()), r.handle("deploy:write-env", (e, t, n) => l.writeEnvFile(t, n)), r.handle("deploy:start", (n, r, i) => {
		let a = e();
		if (!a) throw Error("No active window");
		t.start(r, i, a);
	}), r.handle("deploy:cancel", () => t.cancel()), r.handle("deploy:send-input", (e, n) => t.sendInput(n));
}
//#endregion
//#region electron/main.ts
var f = o.dirname(a(import.meta.url));
process.env.APP_ROOT = o.join(f, "..");
var p = process.env.VITE_DEV_SERVER_URL, m = o.join(process.env.APP_ROOT, "dist-electron"), h = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = p ? o.join(process.env.APP_ROOT, "public") : h;
var g;
function _() {
	g = new e({
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
			preload: o.join(f, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		},
		icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg")
	}), g.webContents.on("did-finish-load", () => {
		g?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
	}), p ? g.loadURL(p) : g.loadFile(o.join(h, "index.html"));
}
r.handle("open-external-url", async (e, t) => {
	await i.openExternal(t);
}), r.handle("open-folder-dialog", async () => {
	let e = await n.showOpenDialog(g, {
		properties: ["openDirectory"],
		title: "Sélectionner le dossier de déploiement"
	});
	return !e.canceled && e.filePaths.length > 0 ? e.filePaths[0] : null;
}), r.handle("save-env-file", async (e, t) => {
	let r = await n.showSaveDialog(g, {
		title: "Sauvegarder le fichier .env",
		defaultPath: ".env",
		filters: [{
			name: "Env Files",
			extensions: ["env"]
		}]
	});
	return !r.canceled && r.filePath ? (s.writeFileSync(r.filePath, t, "utf-8"), {
		success: !0,
		path: r.filePath
	}) : { success: !1 };
}), r.handle("save-local-config", async (e, n) => {
	let r = o.join(t.getPath("userData"), "local-config.json");
	return s.writeFileSync(r, JSON.stringify(n, null, 2), "utf-8"), { success: !0 };
}), r.handle("load-local-config", async () => {
	let e = o.join(t.getPath("userData"), "local-config.json");
	if (s.existsSync(e)) {
		let t = s.readFileSync(e, "utf-8");
		return JSON.parse(t);
	}
	return {};
}), r.handle("export-config", async (e, t) => {
	let r = await n.showSaveDialog(g, {
		title: "Exporter la configuration",
		defaultPath: "intriqathon-config.json",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	return !r.canceled && r.filePath ? (s.writeFileSync(r.filePath, JSON.stringify(t, null, 2), "utf-8"), {
		success: !0,
		path: r.filePath
	}) : { success: !1 };
}), r.handle("import-config", async () => {
	let e = await n.showOpenDialog(g, {
		title: "Importer la configuration",
		properties: ["openFile"],
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	if (!e.canceled && e.filePaths.length > 0) {
		let t = s.readFileSync(e.filePaths[0], "utf-8");
		try {
			return {
				data: JSON.parse(t),
				path: e.filePaths[0]
			};
		} catch {
			return null;
		}
	}
	return null;
}), r.handle("save-recent-configs", async (e, n) => {
	let r = o.join(t.getPath("userData"), "recent-configs.json");
	return s.writeFileSync(r, JSON.stringify(n, null, 2), "utf-8"), { success: !0 };
}), r.handle("load-recent-configs", async () => {
	let e = o.join(t.getPath("userData"), "recent-configs.json");
	if (s.existsSync(e)) {
		let t = s.readFileSync(e, "utf-8");
		try {
			return JSON.parse(t);
		} catch {
			return [];
		}
	}
	return [];
}), r.handle("read-config-file", async (e, t) => {
	if (s.existsSync(t)) {
		let e = s.readFileSync(t, "utf-8");
		try {
			return JSON.parse(e);
		} catch {
			return null;
		}
	}
	return null;
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), g = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && _();
}), d(() => g), t.whenReady().then(_);
//#endregion
export { m as MAIN_DIST, h as RENDERER_DIST, p as VITE_DEV_SERVER_URL };
