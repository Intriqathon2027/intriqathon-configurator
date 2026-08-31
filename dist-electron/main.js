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
}, u = o.dirname(a(import.meta.url)), d = class {
	childProcess = null;
	getScriptPath(e = "script") {
		let t = l.isWindows() ? `${e}.bat` : `${e}.sh`;
		return u.includes("app.asar") && process.resourcesPath ? o.join(process.resourcesPath, "src/cmd_scripts", t) : o.join(process.env.APP_ROOT, "src/cmd_scripts", t);
	}
	debug(e, t) {
		e.webContents.send("deploy:stdout", `[DEBUG] ${t}`);
	}
	start(e, t, n, r) {
		this.cancel();
		let i = this.getScriptPath(), a = l.isWindows();
		if (this.debug(n, `Plateforme : ${process.platform}`), this.debug(n, `Script : ${i}`), this.debug(n, `Existe : ${s.existsSync(i)}`), this.debug(n, `IPV4 : ${e}`), this.debug(n, `SOURCE_DIR : ${t}`), !s.existsSync(i)) {
			n.webContents.send("deploy:error", `Script introuvable : ${i}`);
			return;
		}
		if (!a) try {
			s.chmodSync(i, 493), this.debug(n, "chmod 755 appliqué au script");
		} catch (e) {
			this.debug(n, `chmod échoué (non bloquant) : ${String(e)}`);
		}
		let o = {
			...process.env,
			DISPLAY: ""
		};
		r && (o.SSHPASS = r, this.debug(n, "SSHPASS configuré pour l'authentification"));
		let u = a ? ["cmd.exe", [
			"/c",
			i,
			e,
			t
		]] : ["bash", [
			i,
			e,
			t
		]];
		this.debug(n, `Commande : ${u[0]} ${u[1].join(" ")}`);
		let d = {
			env: o,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = c(u[0], u[1], d), this.debug(n, `PID : ${this.childProcess?.pid ?? "N/A"}`), this.childProcess?.stdout?.on("data", (e) => {
			let t = e.toString().split("\n");
			for (let e of t) e.trim() && n.webContents.send("deploy:stdout", e.trimEnd());
		}), this.childProcess?.stderr?.on("data", (e) => {
			let t = e.toString().split("\n");
			for (let e of t) e.trim() && n.webContents.send("deploy:stderr", e.trimEnd());
		}), this.childProcess?.on("close", (e, t) => {
			this.debug(n, `Processus terminé — code: ${e}, signal: ${t}`), n.webContents.send("deploy:exit", e), this.childProcess = null;
		}), this.childProcess?.on("error", (e) => {
			this.debug(n, `Erreur spawn : ${e.message}`), n.webContents.send("deploy:error", e.message), this.childProcess = null;
		});
	}
	startRestart(e, t, n) {
		this.cancel();
		let r = this.getScriptPath("restart_docker"), i = l.isWindows();
		if (this.debug(t, `Plateforme : ${process.platform}`), this.debug(t, `Script : ${r}`), this.debug(t, `Existe : ${s.existsSync(r)}`), this.debug(t, `IPV4 : ${e}`), !s.existsSync(r)) {
			t.webContents.send("deploy:error", `Script introuvable : ${r}`);
			return;
		}
		if (!i) try {
			s.chmodSync(r, 493), this.debug(t, "chmod 755 appliqué au script");
		} catch (e) {
			this.debug(t, `chmod échoué (non bloquant) : ${String(e)}`);
		}
		let a = {
			...process.env,
			DISPLAY: ""
		};
		n && (a.SSHPASS = n, this.debug(t, "SSHPASS configuré pour l'authentification"));
		let o = i ? ["cmd.exe", [
			"/c",
			r,
			e
		]] : ["bash", [r, e]];
		this.debug(t, `Commande : ${o[0]} ${o[1].join(" ")}`);
		let u = {
			env: a,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = c(o[0], o[1], u), this.debug(t, `PID : ${this.childProcess?.pid ?? "N/A"}`), this.childProcess?.stdout?.on("data", (e) => {
			let n = e.toString().split("\n");
			for (let e of n) e.trim() && t.webContents.send("deploy:stdout", e.trimEnd());
		}), this.childProcess?.stderr?.on("data", (e) => {
			let n = e.toString().split("\n");
			for (let e of n) e.trim() && t.webContents.send("deploy:stderr", e.trimEnd());
		}), this.childProcess?.on("close", (e, n) => {
			this.debug(t, `Processus terminé — code: ${e}, signal: ${n}`), t.webContents.send("deploy:exit", e), this.childProcess = null;
		}), this.childProcess?.on("error", (e) => {
			this.debug(t, `Erreur spawn : ${e.message}`), t.webContents.send("deploy:error", e.message), this.childProcess = null;
		});
	}
	cancel() {
		this.childProcess &&= (this.childProcess.kill("SIGTERM"), null);
	}
	sendInput(e) {
		this.childProcess?.stdin?.writable && this.childProcess.stdin.write(e);
	}
	isRunning() {
		return this.childProcess !== null;
	}
};
//#endregion
//#region src/electron/ipc/deployHandlers.ts
function f(e) {
	let t = new d();
	r.handle("deploy:get-platform", () => l.getPlatform()), r.handle("deploy:write-env", (e, t, n) => l.writeEnvFile(t, n)), r.handle("deploy:start", (n, r, i, a) => {
		let o = e();
		if (!o) throw Error("No active window");
		t.start(r, i, o, a);
	}), r.handle("deploy:restart", (n, r, i) => {
		let a = e();
		if (!a) throw Error("No active window");
		t.startRestart(r, a, i);
	}), r.handle("deploy:cancel", () => t.cancel()), r.handle("deploy:send-input", (e, n) => t.sendInput(n));
}
//#endregion
//#region electron/main.ts
var p = o.dirname(a(import.meta.url));
process.env.APP_ROOT = o.join(p, "..");
var m = process.env.VITE_DEV_SERVER_URL, h = o.join(process.env.APP_ROOT, "dist-electron"), g = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? o.join(process.env.APP_ROOT, "public") : g;
var _;
function v() {
	_ = new e({
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
			preload: o.join(p, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		},
		icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg")
	}), _.webContents.on("did-finish-load", () => {
		_?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
	}), m ? _.loadURL(m) : _.loadFile(o.join(g, "index.html"));
}
r.handle("open-external-url", async (e, t) => {
	await i.openExternal(t);
}), r.handle("open-folder-dialog", async () => {
	let e = await n.showOpenDialog(_, {
		properties: ["openDirectory"],
		title: "Sélectionner le dossier de déploiement"
	});
	return !e.canceled && e.filePaths.length > 0 ? e.filePaths[0] : null;
}), r.handle("save-env-file", async (e, t) => {
	let r = await n.showSaveDialog(_, {
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
	let r = await n.showSaveDialog(_, {
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
	let e = await n.showOpenDialog(_, {
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
	process.platform !== "darwin" && (t.quit(), _ = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && v();
}), f(() => _), t.whenReady().then(v);
//#endregion
export { h as MAIN_DIST, g as RENDERER_DIST, m as VITE_DEV_SERVER_URL };
