import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
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
//#region src/electron/crypto/cryptoService.ts
var KDF_ITERATIONS = 1e5;
var KEY_LENGTH = 32;
var CryptoService = class {
	static sessionPassword = null;
	static getVaultPath() {
		return path.join(app.getPath("userData"), "vault.enc");
	}
	static getLegacyConfigPath() {
		return path.join(app.getPath("userData"), "local-config.json");
	}
	/**
	* Derive a 256-bit AES key from password and salt using PBKDF2-SHA512
	*/
	static deriveKey(password, salt) {
		return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, "sha512");
	}
	/**
	* Encrypt a JavaScript object / string using AES-256-GCM
	*/
	static encrypt(data, password) {
		const salt = crypto.randomBytes(16);
		const iv = crypto.randomBytes(12);
		const key = this.deriveKey(password, salt);
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
		const plaintext = typeof data === "string" ? data : JSON.stringify(data);
		let ciphertext = cipher.update(plaintext, "utf8", "hex");
		ciphertext += cipher.final("hex");
		const tag = cipher.getAuthTag().toString("hex");
		return {
			version: 1,
			algorithm: "aes-256-gcm",
			kdf: "pbkdf2",
			kdfIterations: KDF_ITERATIONS,
			salt: salt.toString("hex"),
			iv: iv.toString("hex"),
			tag,
			ciphertext
		};
	}
	/**
	* Decrypt an encrypted payload using the provided password
	*/
	static decrypt(payload, password) {
		if (payload.algorithm !== "aes-256-gcm") throw new Error(`Algorithme non supporté: ${payload.algorithm}`);
		const salt = Buffer.from(payload.salt, "hex");
		const iv = Buffer.from(payload.iv, "hex");
		const tag = Buffer.from(payload.tag, "hex");
		const key = this.deriveKey(password, salt);
		const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
		decipher.setAuthTag(tag);
		let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
		decrypted += decipher.final("utf8");
		try {
			return JSON.parse(decrypted);
		} catch {
			return decrypted;
		}
	}
	/**
	* Check if vault file exists
	*/
	static vaultExists() {
		return fs.existsSync(this.getVaultPath());
	}
	/**
	* Check if there is an active session (password held in memory)
	*/
	static isUnlocked() {
		return this.sessionPassword !== null;
	}
	/**
	* Lock the session by forgetting the master password
	*/
	static lock() {
		this.sessionPassword = null;
	}
	/**
	* Create a new vault with a password and initial data
	*/
	static createVault(password, initialData = {}) {
		const legacyPath = this.getLegacyConfigPath();
		let dataToSave = initialData;
		if (fs.existsSync(legacyPath)) try {
			dataToSave = {
				...JSON.parse(fs.readFileSync(legacyPath, "utf8")),
				...initialData
			};
		} catch {}
		const encrypted = this.encrypt(dataToSave, password);
		fs.writeFileSync(this.getVaultPath(), JSON.stringify(encrypted, null, 2), "utf8");
		if (fs.existsSync(legacyPath)) try {
			fs.unlinkSync(legacyPath);
		} catch {}
		this.sessionPassword = password;
		return true;
	}
	/**
	* Unlock the vault with the password and return decrypted config
	*/
	static unlockVault(password) {
		const vaultPath = this.getVaultPath();
		if (!fs.existsSync(vaultPath)) return {
			success: false,
			error: "Vault introuvable"
		};
		try {
			const raw = fs.readFileSync(vaultPath, "utf8");
			const payload = JSON.parse(raw);
			const data = this.decrypt(payload, password);
			this.sessionPassword = password;
			return {
				success: true,
				data
			};
		} catch (err) {
			return {
				success: false,
				error: "Mot de passe incorrect ou données corrompues"
			};
		}
	}
	/**
	* Save configuration to the vault using the active session password
	*/
	static saveVault(config, password) {
		const pwd = password || this.sessionPassword;
		if (!pwd) throw new Error("Vault verrouillé : impossible de sauvegarder sans mot de passe");
		const encrypted = this.encrypt(config, pwd);
		fs.writeFileSync(this.getVaultPath(), JSON.stringify(encrypted, null, 2), "utf8");
		return true;
	}
	/**
	* Reset / delete the vault and any legacy configuration completely
	*/
	static resetVault() {
		this.sessionPassword = null;
		const vaultPath = this.getVaultPath();
		if (fs.existsSync(vaultPath)) try {
			fs.unlinkSync(vaultPath);
		} catch {}
		const legacyPath = this.getLegacyConfigPath();
		if (fs.existsSync(legacyPath)) try {
			fs.unlinkSync(legacyPath);
		} catch {}
		return true;
	}
	/**
	* Change master password of the vault
	*/
	static changePassword(oldPassword, newPassword) {
		const unlockResult = this.unlockVault(oldPassword);
		if (!unlockResult.success || !unlockResult.data) throw new Error("Ancien mot de passe incorrect");
		this.sessionPassword = newPassword;
		return this.saveVault(unlockResult.data, newPassword);
	}
	/**
	* Get active session password (for export encryption)
	*/
	static getSessionPassword() {
		return this.sessionPassword;
	}
	/**
	* Retrieve decrypted data if currently unlocked in memory
	*/
	static getVaultData() {
		if (!this.sessionPassword) return null;
		const result = this.unlockVault(this.sessionPassword);
		return result.success && result.data ? result.data : null;
	}
};
//#endregion
//#region src/electron/ipc/vaultHandlers.ts
function registerVaultHandlers(getWin) {
	ipcMain.handle("vault:exists", () => {
		return CryptoService.vaultExists();
	});
	ipcMain.handle("vault:is-unlocked", () => {
		return CryptoService.isUnlocked();
	});
	ipcMain.handle("vault:create", (_event, password, initialData) => {
		try {
			return { success: CryptoService.createVault(password, initialData || {}) };
		} catch (err) {
			return {
				success: false,
				error: err.message || "Erreur lors de la création du coffre"
			};
		}
	});
	ipcMain.handle("vault:unlock", (_event, password) => {
		return CryptoService.unlockVault(password);
	});
	ipcMain.handle("vault:save", (_event, config) => {
		try {
			return { success: CryptoService.saveVault(config) };
		} catch (err) {
			return {
				success: false,
				error: err.message || "Impossible de sauvegarder dans le coffre"
			};
		}
	});
	ipcMain.handle("vault:lock", () => {
		CryptoService.lock();
		return { success: true };
	});
	ipcMain.handle("vault:reset", () => {
		return { success: CryptoService.resetVault() };
	});
	ipcMain.handle("vault:change-password", (_event, oldPassword, newPassword) => {
		try {
			return { success: CryptoService.changePassword(oldPassword, newPassword) };
		} catch (err) {
			return {
				success: false,
				error: err.message || "Erreur lors du changement de mot de passe"
			};
		}
	});
	ipcMain.handle("vault:decrypt-file", (_event, payload, password) => {
		try {
			return {
				success: true,
				data: CryptoService.decrypt(payload, password)
			};
		} catch (err) {
			return {
				success: false,
				error: "Mot de passe incorrect pour déchiffrer ce fichier"
			};
		}
	});
	ipcMain.handle("export-config", async (_event, config) => {
		const win = getWin();
		const result = await dialog.showSaveDialog(win, {
			title: "Exporter la configuration chiffrée",
			defaultPath: "intriqathon-config.enc.json",
			filters: [{
				name: "Fichiers JSON chiffrés",
				extensions: ["json"]
			}]
		});
		if (!result.canceled && result.filePath) {
			const pwd = CryptoService.getSessionPassword();
			if (!pwd) return {
				success: false,
				error: "Coffre non déverrouillé pour chiffrer l'export"
			};
			const encrypted = CryptoService.encrypt(config, pwd);
			fs.writeFileSync(result.filePath, JSON.stringify(encrypted, null, 2), "utf-8");
			return {
				success: true,
				path: result.filePath
			};
		}
		return { success: false };
	});
	ipcMain.handle("import-config", async () => {
		const win = getWin();
		const result = await dialog.showOpenDialog(win, {
			title: "Importer la configuration",
			properties: ["openFile"],
			filters: [{
				name: "Fichiers JSON",
				extensions: ["json"]
			}]
		});
		if (!result.canceled && result.filePaths.length > 0) {
			const filePath = result.filePaths[0];
			try {
				const raw = fs.readFileSync(filePath, "utf-8");
				const parsed = JSON.parse(raw);
				if (parsed && parsed.algorithm === "aes-256-gcm" && parsed.ciphertext) {
					const pwd = CryptoService.getSessionPassword();
					if (pwd) try {
						return {
							data: CryptoService.decrypt(parsed, pwd),
							path: filePath
						};
					} catch {
						return {
							requiresPassword: true,
							path: filePath,
							encryptedData: parsed
						};
					}
					return {
						requiresPassword: true,
						path: filePath,
						encryptedData: parsed
					};
				}
				return {
					data: parsed,
					path: filePath
				};
			} catch {
				return null;
			}
		}
		return null;
	});
	ipcMain.handle("read-config-file", async (_event, filePath) => {
		if (fs.existsSync(filePath)) try {
			const raw = fs.readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(raw);
			if (parsed && parsed.algorithm === "aes-256-gcm" && parsed.ciphertext) {
				const pwd = CryptoService.getSessionPassword();
				if (pwd) try {
					return CryptoService.decrypt(parsed, pwd);
				} catch {
					return {
						requiresPassword: true,
						path: filePath,
						encryptedData: parsed
					};
				}
				return {
					requiresPassword: true,
					path: filePath,
					encryptedData: parsed
				};
			}
			return parsed;
		} catch {
			return null;
		}
		return null;
	});
	ipcMain.handle("save-local-config", async (_event, config) => {
		if (CryptoService.isUnlocked()) {
			CryptoService.saveVault(config);
			return { success: true };
		}
		return {
			success: false,
			error: "Vault non déverrouillé"
		};
	});
	ipcMain.handle("load-local-config", async () => {
		if (CryptoService.isUnlocked()) return CryptoService.getVaultData() ?? {};
		return {};
	});
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
registerVaultHandlers(() => win);
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
