import { BrowserWindow as e, app as t, dialog as n, ipcMain as r, shell as i } from "electron";
import { fileURLToPath as a } from "node:url";
import o from "node:path";
import s from "node:fs";
import { spawn as c } from "node:child_process";
import l from "node:crypto";
//#region src/electron/services/PlatformService.ts
var u = class {
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
}, d = o.dirname(a(import.meta.url)), f = class {
	childProcess = null;
	getScriptPath(e = "script") {
		let t = u.isWindows() ? `${e}.bat` : `${e}.sh`;
		return d.includes("app.asar") && process.resourcesPath ? o.join(process.resourcesPath, "src/cmd_scripts", t) : o.join(process.env.APP_ROOT, "src/cmd_scripts", t);
	}
	debug(e, t) {
		e.webContents.send("deploy:stdout", `[DEBUG] ${t}`);
	}
	start(e, t, n, r) {
		this.cancel();
		let i = this.getScriptPath(), a = u.isWindows();
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
		let l = a ? ["cmd.exe", [
			"/c",
			i,
			e,
			t
		]] : ["bash", [
			i,
			e,
			t
		]];
		this.debug(n, `Commande : ${l[0]} ${l[1].join(" ")}`);
		let d = {
			env: o,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = c(l[0], l[1], d), this.debug(n, `PID : ${this.childProcess?.pid ?? "N/A"}`), this.childProcess?.stdout?.on("data", (e) => {
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
		let r = this.getScriptPath("restart_docker"), i = u.isWindows();
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
		let l = {
			env: a,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		};
		this.childProcess = c(o[0], o[1], l), this.debug(t, `PID : ${this.childProcess?.pid ?? "N/A"}`), this.childProcess?.stdout?.on("data", (e) => {
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
function p(e) {
	let t = new f();
	r.handle("deploy:get-platform", () => u.getPlatform()), r.handle("deploy:write-env", (e, t, n) => u.writeEnvFile(t, n)), r.handle("deploy:start", (n, r, i, a) => {
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
//#region src/electron/crypto/cryptoService.ts
var m = 1e5, h = 32, g = class {
	static sessionPassword = null;
	static getVaultPath() {
		return o.join(t.getPath("userData"), "vault.enc");
	}
	static getLegacyConfigPath() {
		return o.join(t.getPath("userData"), "local-config.json");
	}
	static deriveKey(e, t) {
		return l.pbkdf2Sync(e, t, m, h, "sha512");
	}
	static encrypt(e, t) {
		let n = l.randomBytes(16), r = l.randomBytes(12), i = this.deriveKey(t, n), a = l.createCipheriv("aes-256-gcm", i, r), o = typeof e == "string" ? e : JSON.stringify(e), s = a.update(o, "utf8", "hex");
		s += a.final("hex");
		let c = a.getAuthTag().toString("hex");
		return {
			version: 1,
			algorithm: "aes-256-gcm",
			kdf: "pbkdf2",
			kdfIterations: m,
			salt: n.toString("hex"),
			iv: r.toString("hex"),
			tag: c,
			ciphertext: s
		};
	}
	static decrypt(e, t) {
		if (e.algorithm !== "aes-256-gcm") throw Error(`Algorithme non supporté: ${e.algorithm}`);
		let n = Buffer.from(e.salt, "hex"), r = Buffer.from(e.iv, "hex"), i = Buffer.from(e.tag, "hex"), a = this.deriveKey(t, n), o = l.createDecipheriv("aes-256-gcm", a, r);
		o.setAuthTag(i);
		let s = o.update(e.ciphertext, "hex", "utf8");
		s += o.final("utf8");
		try {
			return JSON.parse(s);
		} catch {
			return s;
		}
	}
	static vaultExists() {
		return s.existsSync(this.getVaultPath());
	}
	static isUnlocked() {
		return this.sessionPassword !== null;
	}
	static lock() {
		this.sessionPassword = null;
	}
	static createVault(e, t = {}) {
		let n = this.getLegacyConfigPath(), r = t;
		if (s.existsSync(n)) try {
			r = {
				...JSON.parse(s.readFileSync(n, "utf8")),
				...t
			};
		} catch {}
		let i = this.encrypt(r, e);
		if (s.writeFileSync(this.getVaultPath(), JSON.stringify(i, null, 2), "utf8"), s.existsSync(n)) try {
			s.unlinkSync(n);
		} catch {}
		return this.sessionPassword = e, !0;
	}
	static unlockVault(e) {
		let t = this.getVaultPath();
		if (!s.existsSync(t)) return {
			success: !1,
			error: "Vault introuvable"
		};
		try {
			let n = s.readFileSync(t, "utf8"), r = JSON.parse(n), i = this.decrypt(r, e);
			return this.sessionPassword = e, {
				success: !0,
				data: i
			};
		} catch {
			return {
				success: !1,
				error: "Mot de passe incorrect ou données corrompues"
			};
		}
	}
	static saveVault(e, t) {
		let n = t || this.sessionPassword;
		if (!n) throw Error("Vault verrouillé : impossible de sauvegarder sans mot de passe");
		let r = this.encrypt(e, n);
		return s.writeFileSync(this.getVaultPath(), JSON.stringify(r, null, 2), "utf8"), !0;
	}
	static resetVault() {
		this.sessionPassword = null;
		let e = this.getVaultPath();
		if (s.existsSync(e)) try {
			s.unlinkSync(e);
		} catch {}
		let t = this.getLegacyConfigPath();
		if (s.existsSync(t)) try {
			s.unlinkSync(t);
		} catch {}
		return !0;
	}
	static changePassword(e, t) {
		let n = this.unlockVault(e);
		if (!n.success || !n.data) throw Error("Ancien mot de passe incorrect");
		return this.sessionPassword = t, this.saveVault(n.data, t);
	}
	static getSessionPassword() {
		return this.sessionPassword;
	}
};
//#endregion
//#region src/electron/ipc/vaultHandlers.ts
function _(e) {
	r.handle("vault:exists", () => g.vaultExists()), r.handle("vault:is-unlocked", () => g.isUnlocked()), r.handle("vault:create", (e, t, n) => {
		try {
			return { success: g.createVault(t, n || {}) };
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Erreur lors de la création du coffre"
			};
		}
	}), r.handle("vault:unlock", (e, t) => g.unlockVault(t)), r.handle("vault:save", (e, t) => {
		try {
			return { success: g.saveVault(t) };
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Impossible de sauvegarder dans le coffre"
			};
		}
	}), r.handle("vault:lock", () => (g.lock(), { success: !0 })), r.handle("vault:reset", () => ({ success: g.resetVault() })), r.handle("vault:change-password", (e, t, n) => {
		try {
			return { success: g.changePassword(t, n) };
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Erreur lors du changement de mot de passe"
			};
		}
	}), r.handle("vault:decrypt-file", (e, t, n) => {
		try {
			return {
				success: !0,
				data: g.decrypt(t, n)
			};
		} catch {
			return {
				success: !1,
				error: "Mot de passe incorrect pour déchiffrer ce fichier"
			};
		}
	}), r.handle("export-config", async (t, r) => {
		let i = e(), a = await n.showSaveDialog(i, {
			title: "Exporter la configuration chiffrée",
			defaultPath: "intriqathon-config.enc.json",
			filters: [{
				name: "Fichiers JSON chiffrés",
				extensions: ["json"]
			}]
		});
		if (!a.canceled && a.filePath) {
			let e = g.getSessionPassword();
			if (!e) return {
				success: !1,
				error: "Coffre non déverrouillé pour chiffrer l'export"
			};
			let t = g.encrypt(r, e);
			return s.writeFileSync(a.filePath, JSON.stringify(t, null, 2), "utf-8"), {
				success: !0,
				path: a.filePath
			};
		}
		return { success: !1 };
	}), r.handle("import-config", async () => {
		let t = e(), r = await n.showOpenDialog(t, {
			title: "Importer la configuration",
			properties: ["openFile"],
			filters: [{
				name: "Fichiers JSON",
				extensions: ["json"]
			}]
		});
		if (!r.canceled && r.filePaths.length > 0) {
			let e = r.filePaths[0];
			try {
				let t = s.readFileSync(e, "utf-8"), n = JSON.parse(t);
				if (n && n.algorithm === "aes-256-gcm" && n.ciphertext) {
					let t = g.getSessionPassword();
					if (t) try {
						return {
							data: g.decrypt(n, t),
							path: e
						};
					} catch {
						return {
							requiresPassword: !0,
							path: e,
							encryptedData: n
						};
					}
					return {
						requiresPassword: !0,
						path: e,
						encryptedData: n
					};
				}
				return {
					data: n,
					path: e
				};
			} catch {
				return null;
			}
		}
		return null;
	}), r.handle("read-config-file", async (e, t) => {
		if (s.existsSync(t)) try {
			let e = s.readFileSync(t, "utf-8"), n = JSON.parse(e);
			if (n && n.algorithm === "aes-256-gcm" && n.ciphertext) {
				let e = g.getSessionPassword();
				return e ? g.decrypt(n, e) : null;
			}
			return n;
		} catch {
			return null;
		}
		return null;
	}), r.handle("save-local-config", async (e, t) => g.isUnlocked() ? (g.saveVault(t), { success: !0 }) : {
		success: !1,
		error: "Vault non déverrouillé"
	}), r.handle("load-local-config", async () => ({}));
}
//#endregion
//#region electron/main.ts
var v = o.dirname(a(import.meta.url));
process.env.APP_ROOT = o.join(v, "..");
var y = process.env.VITE_DEV_SERVER_URL, b = o.join(process.env.APP_ROOT, "dist-electron"), x = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = y ? o.join(process.env.APP_ROOT, "public") : x;
var S;
function C() {
	S = new e({
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
			preload: o.join(v, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		},
		icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg")
	}), S.webContents.on("did-finish-load", () => {
		S?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
	}), y ? S.loadURL(y) : S.loadFile(o.join(x, "index.html"));
}
r.handle("open-external-url", async (e, t) => {
	await i.openExternal(t);
}), r.handle("open-folder-dialog", async () => {
	let e = await n.showOpenDialog(S, {
		properties: ["openDirectory"],
		title: "Sélectionner le dossier de déploiement"
	});
	return !e.canceled && e.filePaths.length > 0 ? e.filePaths[0] : null;
}), r.handle("save-env-file", async (e, t) => {
	let r = await n.showSaveDialog(S, {
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
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), S = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && C();
}), p(() => S), _(() => S), t.whenReady().then(C);
//#endregion
export { b as MAIN_DIST, x as RENDERER_DIST, y as VITE_DEV_SERVER_URL };
