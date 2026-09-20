import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import os from "node:os";
import { promisify } from "node:util";
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
	start(ipv4, sourceDir, win, sshPassword, sshKeyPath) {
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
		if (sshKeyPath) {
			env.SSH_KEY_PATH = sshKeyPath;
			this.debug(win, `SSH_KEY_PATH configuré : ${sshKeyPath}`);
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
	startRestart(ipv4, win, sshPassword, sshKeyPath) {
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
		if (sshKeyPath) {
			env.SSH_KEY_PATH = sshKeyPath;
			this.debug(win, `SSH_KEY_PATH configuré : ${sshKeyPath}`);
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
	ipcMain.handle("deploy:start", (_event, ipv4, sourceDir, sshPassword, sshKeyPath) => {
		const win = getWin();
		if (!win) throw new Error("No active window");
		deployService.start(ipv4, sourceDir, win, sshPassword, sshKeyPath);
	});
	ipcMain.handle("deploy:restart", (_event, ipv4, sshPassword, sshKeyPath) => {
		const win = getWin();
		if (!win) throw new Error("No active window");
		deployService.startRestart(ipv4, win, sshPassword, sshKeyPath);
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
//#region src/electron/services/SshKeyService.ts
var execFileAsync = promisify(execFile);
var SshKeyService = class {
	static getSshDir() {
		return path.join(os.homedir(), ".ssh");
	}
	/**
	* Scan ~/.ssh/ directory for public and private SSH keys
	*/
	static async listKeys() {
		const sshDir = this.getSshDir();
		if (!fs.existsSync(sshDir)) return [];
		try {
			const pubFiles = fs.readdirSync(sshDir).filter((f) => f.endsWith(".pub"));
			const keys = [];
			for (const pubFile of pubFiles) try {
				const pubPath = path.join(sshDir, pubFile);
				const content = fs.readFileSync(pubPath, "utf-8").trim();
				if (!content) continue;
				const privateFile = pubFile.replace(/\.pub$/, "");
				const privatePath = path.join(sshDir, privateFile);
				const hasPrivate = fs.existsSync(privatePath);
				const parts = content.split(/\s+/);
				const keyType = parts[0] || "ssh-unknown";
				const comment = parts.length > 2 ? parts.slice(2).join(" ") : privateFile;
				keys.push({
					name: comment || privateFile,
					filename: pubFile,
					publicKey: content,
					publicKeyPath: pubPath,
					privateKeyPath: privatePath,
					hasPrivateKey: hasPrivate,
					keyType
				});
			} catch {}
			return keys;
		} catch {
			return [];
		}
	}
	/**
	* Generate a new Ed25519 SSH key pair in ~/.ssh/
	*/
	static async generateKey(customName) {
		const sshDir = this.getSshDir();
		if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, {
			recursive: true,
			mode: 448
		});
		const baseName = (customName || "id_ed25519_intriqathon").replace(/[^a-zA-Z0-9_-]/g, "_");
		let finalName = baseName;
		let privatePath = path.join(sshDir, finalName);
		if (fs.existsSync(privatePath)) {
			finalName = `${baseName}_${Math.floor(Date.now() / 1e3)}`;
			privatePath = path.join(sshDir, finalName);
		}
		const pubPath = `${privatePath}.pub`;
		try {
			await execFileAsync("ssh-keygen", [
				"-t",
				"ed25519",
				"-C",
				"intriqathon",
				"-N",
				"",
				"-f",
				privatePath
			]);
		} catch (err) {
			throw new Error(`Échec de la génération de clé SSH avec ssh-keygen : ${err.message || String(err)}`);
		}
		if (!fs.existsSync(pubPath)) throw new Error("La clé publique générée est introuvable après ssh-keygen");
		const content = fs.readFileSync(pubPath, "utf-8").trim();
		const parts = content.split(/\s+/);
		const keyType = parts[0] || "ssh-ed25519";
		return {
			name: (parts.length > 2 ? parts.slice(2).join(" ") : finalName) || finalName,
			filename: `${finalName}.pub`,
			publicKey: content,
			publicKeyPath: pubPath,
			privateKeyPath: privatePath,
			hasPrivateKey: true,
			keyType
		};
	}
};
//#endregion
//#region src/electron/ipc/sshHandlers.ts
function registerSshHandlers() {
	ipcMain.handle("ssh:list-keys", async () => {
		return SshKeyService.listKeys();
	});
	ipcMain.handle("ssh:generate-key", async (_event, customName) => {
		try {
			return {
				success: true,
				key: await SshKeyService.generateKey(customName)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message || String(err)
			};
		}
	});
}
//#endregion
//#region src/electron/services/ScalewayService.ts
var ScalewayService = class {
	isCancelled = false;
	cancel() {
		this.isCancelled = true;
	}
	log(win, message, status = "info", progress) {
		console.log(`[ScalewayService] [${status.toUpperCase()}] ${message}`);
		if (win && !win.isDestroyed()) win.webContents.send("scaleway:log", {
			message,
			status,
			progress
		});
	}
	formatScalewayError(status, rawBody, context) {
		let parsedMessage = rawBody;
		let errorType = "";
		let errorHelp = "";
		try {
			const parsed = JSON.parse(rawBody);
			if (parsed.message) parsedMessage = parsed.message;
			if (parsed.type) errorType = parsed.type;
			if (parsed.help) errorHelp = ` (Conseil: ${parsed.help})`;
			if (parsed.fields && typeof parsed.fields === "object") {
				const fieldDetails = Object.entries(parsed.fields).map(([k, v]) => {
					if (Array.isArray(v)) return `${k}: ${v.map((item) => typeof item === "object" ? item.message || JSON.stringify(item) : item).join(", ")}`;
					return `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`;
				}).join(" ; ");
				if (fieldDetails) parsedMessage += ` [Champs: ${fieldDetails}]`;
			}
		} catch {}
		if (status === 401 || status === 403) return `[ERREUR ${status}] Accès refusé par Scaleway lors de: ${context}. Vérifiez que votre SCW_SECRET_KEY est correcte (étape 1) et possède les droits IAM nécessaires. Détail: "${parsedMessage}"${errorHelp}`;
		if (status === 404) return `[ERREUR 404] Ressource ou Projet Scaleway introuvable lors de: ${context}. Vérifiez l'ID de votre projet (SCW_DEFAULT_PROJECT_ID) à l'étape 1. Détail: "${parsedMessage}"`;
		if (status === 400) return `[ERREUR 400] Paramètre invalide lors de: ${context}. Détail: "${parsedMessage}"${errorType ? ` (${errorType})` : ""}${errorHelp}`;
		return `[ERREUR HTTP ${status}] Échec lors de: ${context}. Détail: "${parsedMessage}"${errorType ? ` (${errorType})` : ""}`;
	}
	/**
	* Upload SSH key to Scaleway IAM if not already present
	*/
	async ensureSshKey(options, win) {
		const { secretKey, projectId, sshPublicKey, sshKeyName = "intriqathon-key" } = options;
		const normalizedKey = sshPublicKey.trim().split(/\s+/).slice(0, 2).join(" ");
		this.log(win, "Vérification de la présence de la clé SSH sur Scaleway (API IAM)...", "running", 15);
		let listRes;
		try {
			listRes = await fetch("https://api.scaleway.com/iam/v1alpha1/ssh-keys?page_size=100", { headers: {
				"X-Auth-Token": secretKey,
				"Content-Type": "application/json"
			} });
		} catch (netErr) {
			const msg = `[ERREUR RÉSEAU] Impossible de contacter l'API Scaleway IAM: ${netErr.message || String(netErr)}`;
			this.log(win, msg, "error");
			throw new Error(msg);
		}
		if (!listRes.ok) {
			const errBody = await listRes.text();
			const formatted = this.formatScalewayError(listRes.status, errBody, "Vérification des clés SSH IAM");
			this.log(win, formatted, "error");
			throw new Error(formatted);
		}
		const existing = ((await listRes.json()).ssh_keys || []).find((k) => {
			return (k.public_key || "").trim().split(/\s+/).slice(0, 2).join(" ") === normalizedKey;
		});
		if (existing) {
			this.log(win, `Clé SSH déjà enregistrée sur votre compte Scaleway (${existing.name}).`, "info", 25);
			return;
		}
		const finalKeyName = `${sshKeyName}-${Date.now().toString().slice(-4)}`;
		this.log(win, `Ajout de la clé SSH ("${finalKeyName}") sur Scaleway...`, "running", 20);
		let createRes;
		try {
			createRes = await fetch("https://api.scaleway.com/iam/v1alpha1/ssh-keys", {
				method: "POST",
				headers: {
					"X-Auth-Token": secretKey,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					name: finalKeyName,
					public_key: sshPublicKey.trim(),
					project_id: projectId
				})
			});
		} catch (netErr) {
			const msg = `[ERREUR RÉSEAU] Impossible d'envoyer la clé SSH à Scaleway: ${netErr.message || String(netErr)}`;
			this.log(win, msg, "error");
			throw new Error(msg);
		}
		if (!createRes.ok) {
			const errBody = await createRes.text();
			if (createRes.status === 409 || errBody.toLowerCase().includes("already exist")) {
				this.log(win, "Clé SSH déjà présente sur Scaleway.", "info", 30);
				return;
			}
			const formatted = this.formatScalewayError(createRes.status, errBody, "Ajout de la clé SSH IAM");
			this.log(win, formatted, "error");
			throw new Error(formatted);
		}
		this.log(win, "Clé SSH ajoutée avec succès sur votre compte Scaleway.", "info", 30);
	}
	/**
	* Resolve Ubuntu 24.04 local image ID for the given zone and commercial type
	*/
	async resolveUbuntuNobleImage(zone, commercialType = "DEV1-M") {
		const fallbackImageId = "91cb8918-98c0-46ed-8c80-02cbd00b6a66";
		try {
			const res = await fetch(`https://api.scaleway.com/marketplace/v2/local-images?image_label=ubuntu_noble&zone=${encodeURIComponent(zone)}&per_page=100`);
			if (res.ok) {
				const images = (await res.json()).local_images || [];
				const matched = images.find((img) => Array.isArray(img.compatible_commercial_types) && img.compatible_commercial_types.includes(commercialType));
				if (matched?.id) return matched.id;
				const matchedLocal = images.find((img) => img.zone === zone && img.arch === "x86_64" && img.type === "instance_local");
				if (matchedLocal?.id) return matchedLocal.id;
			}
		} catch {}
		return fallbackImageId;
	}
	/**
	* Main method: creates an instance, powers it on, and retrieves the public IPv4
	*/
	async createInstance(options, win) {
		this.isCancelled = false;
		const zone = options.zone || "fr-par-1";
		const commercialType = options.commercialType || "DEV1-M";
		this.log(win, `Démarrage de la configuration automatisée Scaleway (Zone: ${zone})...`, "running", 5);
		try {
			await this.ensureSshKey(options, win);
			if (this.isCancelled) throw new Error("Opération annulée par l'utilisateur");
			this.log(win, "Recherche de l'image système Ubuntu 24.04 LTS (Noble Numbat)...", "running", 35);
			const imageId = await this.resolveUbuntuNobleImage(zone, commercialType);
			this.log(win, `Image Ubuntu 24.04 identifiée: ${imageId}`, "info", 40);
			this.log(win, `Création de l'instance (${commercialType})...`, "running", 45);
			const createPayload = {
				name: `intriqathon-${Date.now().toString().slice(-4)}`,
				project: options.projectId,
				commercial_type: commercialType,
				image: imageId,
				dynamic_ip_required: true
			};
			let serverRes;
			try {
				serverRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers`, {
					method: "POST",
					headers: {
						"X-Auth-Token": options.secretKey,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(createPayload)
				});
			} catch (netErr) {
				const msg = `[ERREUR RÉSEAU] Impossible de contacter l'API Scaleway Instances: ${netErr.message || String(netErr)}`;
				this.log(win, msg, "error");
				throw new Error(msg);
			}
			if (!serverRes.ok) {
				const errBody = await serverRes.text();
				const formatted = this.formatScalewayError(serverRes.status, errBody, `Création du serveur (${commercialType})`);
				this.log(win, formatted, "error");
				throw new Error(formatted);
			}
			const server = (await serverRes.json()).server;
			const serverId = server.id;
			this.log(win, `Instance créée avec succès (ID: ${serverId}, Nom: ${server.name}).`, "info", 55);
			this.log(win, "Démarrage (poweron) de l'instance...", "running", 60);
			let actionRes = null;
			try {
				actionRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers/${serverId}/action`, {
					method: "POST",
					headers: {
						"X-Auth-Token": options.secretKey,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ action: "poweron" })
				});
			} catch (netErr) {
				this.log(win, `Avertissement réseau poweron: ${netErr.message || String(netErr)}`, "info", 62);
			}
			if (actionRes && !actionRes.ok) {
				const errBody = await actionRes.text();
				this.log(win, `Notification démarrage : ${errBody}`, "info", 65);
			}
			this.log(win, "Attente de l'initialisation et de l'attribution de l'IPv4 publique...", "running", 70);
			let ipv4 = server.public_ip?.address || "";
			let isRunning = server.state === "running";
			let attempts = 0;
			const maxAttempts = 60;
			while ((!isRunning || !ipv4) && attempts < maxAttempts) {
				if (this.isCancelled) throw new Error("Opération annulée par l'utilisateur");
				await new Promise((r) => setTimeout(r, 3e3));
				attempts++;
				try {
					const pollRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers/${serverId}`, { headers: {
						"X-Auth-Token": options.secretKey,
						"Content-Type": "application/json"
					} });
					if (pollRes.ok) {
						const currentServer = (await pollRes.json()).server;
						isRunning = currentServer.state === "running";
						ipv4 = currentServer.public_ip?.address || ipv4;
						const currentProgress = Math.min(70 + Math.floor(attempts / maxAttempts * 25), 95);
						this.log(win, `Statut instance : ${currentServer.state} (IP: ${ipv4 || "en cours d'attribution"})...`, "running", currentProgress);
					}
				} catch {}
			}
			if (!ipv4) {
				const msg = "[ERREUR] L'instance a démarré mais aucune IPv4 publique n'a été attribuée après 3 minutes.";
				this.log(win, msg, "error");
				throw new Error(msg);
			}
			this.log(win, `✓ Instance opérationnelle ! IPv4 publique allouée : ${ipv4}`, "done", 100);
			return {
				ipv4,
				serverId
			};
		} catch (err) {
			const msg = err.message || String(err);
			if (!msg.startsWith("[ERREUR")) this.log(win, `[ERREUR] ${msg}`, "error");
			throw err;
		}
	}
};
//#endregion
//#region src/electron/ipc/scalewayHandlers.ts
function registerScalewayHandlers(getWin) {
	let activeService = null;
	ipcMain.handle("scaleway:create-instance", async (_event, options) => {
		const win = getWin();
		activeService = new ScalewayService();
		try {
			return {
				success: true,
				...await activeService.createInstance(options, win)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message || String(err)
			};
		} finally {
			activeService = null;
		}
	});
	ipcMain.handle("scaleway:cancel", () => {
		if (activeService) activeService.cancel();
		return { success: true };
	});
}
//#endregion
//#region src/shared/supabaseBuckets.ts
var STORAGE_BUCKETS = [
	{
		name: "public_files",
		isPublic: true,
		fr: "logo, logos partenaires, médias",
		en: "logo, partner logos, media"
	},
	{
		name: "annonces",
		isPublic: false,
		fr: "pièces jointes des annonces",
		en: "announcement attachments"
	},
	{
		name: "users",
		isPublic: false,
		fr: "photos de profil",
		en: "profile pictures"
	},
	{
		name: "submissions",
		isPublic: false,
		fr: "livrables des équipes",
		en: "project submissions"
	},
	{
		name: "evaluations",
		isPublic: false,
		fr: "fichiers d'évaluation du jury",
		en: "jury evaluation files"
	}
];
//#endregion
//#region src/electron/services/supabase/SupabaseApiClient.ts
var MANAGEMENT_BASE = "https://api.supabase.com";
var MAX_ATTEMPTS$2 = 4;
var BASE_BACKOFF_MS$2 = 1e3;
/** Rate limiting is per user (~60 req/min); `Retry-After` says how long to wait. */
var RETRYABLE_STATUS$2 = new Set([
	429,
	500,
	502,
	503,
	504
]);
/**
* Supabase's own wording for an auth failure is not actionable on its own:
* a well-formed but unknown token and a missing header both come back as the
* single word "Unauthorized". These map a status onto what the reader can
* actually do about it, keeping the provider's text only when it adds
* something (a plan limit, a name conflict).
*/
var GENERIC_DETAILS = new Set([
	"unauthorized",
	"forbidden",
	"not found",
	"bad request"
]);
function explainStatus$2(status) {
	switch (status) {
		case 401: return "Jeton d'accès Supabase refusé. Il est bien formé mais Supabase ne le reconnaît pas : vérifiez qu'il n'a pas été révoqué ou régénéré, et qu'il a été copié en entier depuis Account ➔ Access Tokens.";
		case 403: return "Accès refusé par Supabase — le jeton n'a pas les droits nécessaires sur cette organisation, ou une limite de plan est atteinte.";
		case 404: return "Ressource introuvable chez Supabase.";
		case 429: return "Trop de requêtes envoyées à Supabase. Patientez une minute avant de relancer.";
		default: return null;
	}
}
var SupabaseApiError = class extends Error {
	status;
	url;
	detail;
	constructor(status, url, detail) {
		const explanation = explainStatus$2(status);
		const informative = detail && !GENERIC_DETAILS.has(detail.trim().toLowerCase());
		super(explanation ? informative ? `${explanation} (${detail})` : explanation : detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`);
		this.name = "SupabaseApiError";
		this.status = status;
		this.url = url;
		this.detail = detail;
	}
};
function sleep$2(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
/**
* Supabase reports failures as `{ message }` — sometimes `{ error }`, sometimes
* plain text. Pull out whatever is readable so the card shows the provider's
* own wording ("project limit reached") rather than a bare status code.
*/
function extractMessage$2(raw) {
	if (!raw) return "";
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "string") return parsed;
		const msg = parsed?.message ?? parsed?.error ?? parsed?.msg;
		if (typeof msg === "string") return msg;
		if (Array.isArray(msg)) return msg.join(", ");
	} catch {}
	return raw.slice(0, 300);
}
var SupabaseApiClient = class {
	accessToken;
	signal;
	fetchImpl;
	sleepImpl;
	constructor(opts) {
		this.accessToken = opts.accessToken.trim();
		this.signal = opts.signal;
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.sleepImpl = opts.sleepImpl ?? sleep$2;
	}
	buildUrl(path, opts) {
		const url = new URL(path, opts.baseUrl ?? MANAGEMENT_BASE);
		for (const [key, value] of Object.entries(opts.query ?? {})) if (value !== void 0) url.searchParams.set(key, String(value));
		return url.toString();
	}
	async request(method, path, opts = {}) {
		const url = this.buildUrl(path, opts);
		const headers = {
			Accept: "application/json",
			Authorization: `Bearer ${this.accessToken}`,
			...opts.headers
		};
		if (opts.body !== void 0) headers["Content-Type"] = "application/json";
		let lastError = null;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS$2; attempt++) {
			const response = await this.fetchImpl(url, {
				method,
				headers,
				body: opts.body === void 0 ? void 0 : JSON.stringify(opts.body),
				signal: this.signal
			});
			if (response.ok) {
				if (response.status === 204) return null;
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			}
			if (opts.tolerate?.includes(response.status)) return null;
			const detail = extractMessage$2(await response.text().catch(() => ""));
			lastError = new SupabaseApiError(response.status, url, detail);
			if (!RETRYABLE_STATUS$2.has(response.status) || attempt === MAX_ATTEMPTS$2) throw lastError;
			const retryAfter = Number(response.headers.get("retry-after"));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : BASE_BACKOFF_MS$2 * 2 ** (attempt - 1);
			await this.sleepImpl(waitMs, this.signal);
		}
		throw lastError ?? new SupabaseApiError(0, url, "Échec inconnu");
	}
	async requireJson(method, path, opts = {}) {
		const result = await this.request(method, path, opts);
		if (result === null) throw new SupabaseApiError(0, path, "Réponse vide");
		return result;
	}
	listOrganizations() {
		return this.requireJson("GET", "/v1/organizations");
	}
	listProjects() {
		return this.requireJson("GET", "/v1/projects");
	}
	getProject(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}`);
	}
	/** `region_selection` is optional — omitted, Supabase picks a default region. */
	createProject(body) {
		return this.requireJson("POST", "/v1/projects", { body });
	}
	getHealth(ref, services) {
		return this.requireJson("GET", `/v1/projects/${ref}/health`, { query: {
			services: services.join(","),
			timeout_ms: 5e3
		} });
	}
	/** Without `reveal`, every `api_key` comes back masked. */
	listApiKeys(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}/api-keys`, { query: { reveal: "true" } });
	}
	createApiKey(ref, type, name) {
		return this.requireJson("POST", `/v1/projects/${ref}/api-keys`, {
			query: { reveal: "true" },
			body: {
				type,
				name
			}
		});
	}
	/**
	* Whether the JWT legacy keys are still enabled. The endpoint is itself
	* scheduled for removal, so a 404 means "legacy is gone", not "failure".
	*/
	getLegacyKeysEnabled(ref) {
		return this.request("GET", `/v1/projects/${ref}/api-keys/legacy`, { tolerate: [404] });
	}
	/** `enabled` is a query parameter here, not a body. */
	setLegacyKeysEnabled(ref, enabled) {
		return this.request("PUT", `/v1/projects/${ref}/api-keys/legacy`, {
			query: { enabled: String(enabled) },
			tolerate: [404]
		});
	}
	getPoolerConfig(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}/config/database/pooler`);
	}
	listBuckets(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}/storage/buckets`);
	}
	/**
	* Runs SQL against the project's database, as the `postgres` role. The
	* response is the result set — an empty array for a statement that returns no
	* rows (a GRANT, an ALTER), which is why the return type is a row list rather
	* than a status.
	*/
	runQuery(ref, query) {
		return this.requireJson("POST", `/v1/projects/${ref}/database/query`, { body: { query } });
	}
	getPostgrestConfig(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}/postgrest`);
	}
	/** Only the fields passed are changed; the rest of the config is left alone. */
	updatePostgrestConfig(ref, body) {
		return this.requireJson("PATCH", `/v1/projects/${ref}/postgrest`, { body });
	}
	getAuthConfig(ref) {
		return this.requireJson("GET", `/v1/projects/${ref}/config/auth`);
	}
	updateAuthConfig(ref, body) {
		return this.requireJson("PATCH", `/v1/projects/${ref}/config/auth`, { body });
	}
	/**
	* There is no bucket-creation endpoint on the Management API — only a
	* listing. Creation goes through the project's Storage API instead, which
	* authenticates with the service_role/secret key rather than the PAT.
	*
	* Resolves `false` when the bucket already exists (409), so a re-run is a
	* no-op rather than a failure.
	*/
	async createBucket(projectOrigin, serviceKey, bucket) {
		return await this.request("POST", "/storage/v1/bucket", {
			baseUrl: projectOrigin,
			headers: {
				Authorization: `Bearer ${serviceKey}`,
				apikey: serviceKey
			},
			body: {
				id: bucket.name,
				name: bucket.name,
				public: bucket.isPublic
			},
			tolerate: [409]
		}) !== null;
	}
};
//#endregion
//#region src/electron/services/supabase/connectionStrings.ts
/**
* Building DATABASE_URL and DIRECT_URL.
*
* The Management API hands back the pooler's host/port/user but leaves the
* password out — its `connection_string` still carries the literal
* `[YOUR-PASSWORD]`, exactly like the string copied by hand from the dashboard.
* So we build the URLs from the parts rather than patching that placeholder,
* and we URL-encode the password ourselves: `@`, `:`, `/`, `#` and `?` in a
* password all break a connection string that was pasted raw, which is the
* single most common way to end up with a deployment that cannot reach its
* database.
*
*   DATABASE_URL — transaction mode (port 6543), what Prisma uses at runtime
*   DIRECT_URL   — session mode (port 5432), what Prisma migrations need
*/
var SESSION_PORT = 5432;
function buildUrl(user, password, host, port, dbName) {
	return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}
/**
* Read replicas carry their own pooler entry; only the primary is of interest.
* Entries with no `database_type` are treated as primary — older responses
* omitted the field.
*/
function primaryEntries(pooler) {
	return pooler.filter((e) => !e.database_type || e.database_type === "PRIMARY");
}
function buildPostgresUrls({ ref, password, pooler, databaseHost }) {
	const entries = primaryEntries(pooler);
	const transaction = entries.find((e) => e.pool_mode === "transaction") ?? entries[0];
	const session = entries.find((e) => e.pool_mode === "session");
	if (!transaction?.db_host) {
		const direct = buildUrl("postgres", password, databaseHost || `db.${ref}.supabase.co`, SESSION_PORT, "postgres");
		return {
			databaseUrl: direct,
			directUrl: direct
		};
	}
	const user = transaction.db_user || `postgres.${ref}`;
	const dbName = transaction.db_name || "postgres";
	return {
		databaseUrl: buildUrl(user, password, transaction.db_host, transaction.db_port ?? 6543, dbName),
		directUrl: session?.db_host ? buildUrl(session.db_user || user, password, session.db_host, session.db_port ?? SESSION_PORT, session.db_name || dbName) : buildUrl(user, password, transaction.db_host, SESSION_PORT, dbName)
	};
}
/** The project's public REST/Storage origin. Derived — there is no endpoint for it. */
function projectUrl(ref) {
	return `https://${ref}.supabase.co`;
}
//#endregion
//#region src/electron/services/supabase/keys.ts
/**
* Picking the anon/service_role pair out of a project's API keys.
*
* Supabase runs two key generations side by side on the same project:
*
*   - legacy JWT keys, named `anon` and `service_role` (format `eyJ…`)
*   - the new keys, `publishable` (`sb_publishable_…`) and `secret`
*     (`sb_secret_…`)
*
* Both are accepted by `createClient(url, key)`, and nothing in the deployed
* stack decodes the token — so either generation can fill SUPABASE_ANON_KEY and
* SUPABASE_SERVICE_ROLE_KEY. We prefer the new format when a usable value is
* available, because the legacy endpoints are documented as going away, and
* fall back to legacy otherwise. The two halves are decided independently: a
* publishable anon key alongside a legacy service_role key is a valid outcome.
*
* A `secret` key may be stored hashed and only ever revealed at creation, in
* which case `api_key` comes back null and the entry is unusable — hence the
* `hasUsableValue` filter rather than a plain `find` on `type`.
*/
/** Name given to keys this app creates, so a re-run reuses them instead of piling up. */
var MANAGED_KEY_NAME = "intriqathon_configurator";
function hasUsableValue(key) {
	return typeof key.api_key === "string" && key.api_key.length > 0;
}
function isLegacyService(key) {
	return key.type === "legacy" && key.name === "service_role";
}
/**
* The JWT-format `service_role` key, or null when the project offers none.
*
* Singled out because the config panel served at `config.<domain>` queries the
* Data API straight from the browser with whatever service key it is handed,
* and Supabase answers 401 "Forbidden use of secret API key in browser" to any
* request that carries an Origin together with a `sb_secret_…` key. The legacy
* format is therefore the only one that works there — while the deployed stack
* keeps the secret key in its server-side .env, where it is the better choice.
*/
function findLegacyServiceKey(keys) {
	return keys.filter(hasUsableValue).find(isLegacyService)?.api_key ?? null;
}
/**
* Among several candidates, prefer the one this app created (stable across
* re-runs), then any other. Keeps repeated provisioning deterministic.
*/
function pickPreferred(candidates) {
	return candidates.find((k) => k.name === "intriqathon_configurator") ?? candidates[0];
}
function resolveKeyPair(keys) {
	const usable = keys.filter(hasUsableValue);
	const publishable = pickPreferred(usable.filter((k) => k.type === "publishable"));
	const secret = pickPreferred(usable.filter((k) => k.type === "secret"));
	const legacyAnon = usable.find((k) => k.type === "legacy" && k.name === "anon");
	const legacyService = usable.find(isLegacyService);
	const anonPick = publishable ?? legacyAnon;
	const servicePick = secret ?? legacyService;
	return {
		anon: anonPick ? {
			value: anonPick.api_key,
			format: anonPick.type === "publishable" ? "publishable" : "legacy",
			name: anonPick.name
		} : null,
		service: servicePick ? {
			value: servicePick.api_key,
			format: servicePick.type === "secret" ? "secret" : "legacy",
			name: servicePick.name
		} : null
	};
}
/**
* True when the project exposes no usable key for one of the two roles, and the
* service therefore has to act — re-enable the legacy keys, or create new ones.
*/
function needsKeyProvisioning(pair) {
	return pair.anon === null || pair.service === null;
}
/** Human label for the log line, so the reader knows which generation landed in the .env. */
function describeKeyFormat(format) {
	switch (format) {
		case "legacy": return "JWT legacy";
		case "publishable": return "publishable";
		case "secret": return "secret";
	}
}
//#endregion
//#region src/electron/services/supabase/redact.ts
/**
* Log redaction.
*
* Every line the provisioning services emit travels to the renderer and is
* printed in the card's terminal, where it can be screenshotted or copied. The
* vault protects secrets at rest; this protects them on their way to the
* screen. Anything that looks like a credential is masked before it leaves the
* main process — patterns for the formats we know, plus the literal values we
* were handed, which covers the ones we cannot recognise (a database password
* can look like anything).
*/
/** Token shapes worth masking even when we never held the value ourselves. */
var PATTERNS = [
	/sbp_[A-Za-z0-9]{20,}/g,
	/sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}/g,
	/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
	/postgres(?:ql)?:\/\/[^\s"']+/g
];
var MASK = "••••••";
var Redactor = class {
	literals = [];
	/**
	* Register a value to mask wherever it appears. Short strings are ignored:
	* masking every occurrence of a three-character password would shred the
	* surrounding text without protecting anything worth protecting.
	*/
	add(...secrets) {
		for (const secret of secrets) if (secret && secret.length >= 6 && !this.literals.includes(secret)) this.literals.push(secret);
		return this;
	}
	redact(line) {
		let out = line;
		for (const literal of [...this.literals].sort((a, b) => b.length - a.length)) out = out.split(literal).join(MASK);
		for (const pattern of PATTERNS) out = out.replace(pattern, MASK);
		return out;
	}
};
//#endregion
//#region src/electron/services/SupabaseProvisionService.ts
var SERVICE$3 = "supabase";
/** A fresh project reports COMING_UP for a minute or two before it answers. */
var READY_POLL_INTERVAL_MS = 5e3;
var READY_TIMEOUT_MS = 6 * 6e4;
var SupabaseProvisionService = class {
	controller = null;
	redactor = new Redactor();
	isRunning() {
		return this.controller !== null;
	}
	cancel() {
		this.controller?.abort();
		this.controller = null;
	}
	log(win, message, level = "info") {
		win.webContents.send("provision:log", {
			service: SERVICE$3,
			message: this.redactor.redact(message),
			level
		});
	}
	progress(win, value) {
		win.webContents.send("provision:progress", {
			service: SERVICE$3,
			value
		});
	}
	wasCancelled() {
		return this.controller?.signal.aborted ?? false;
	}
	async listOrganizations(accessToken) {
		return new SupabaseApiClient({ accessToken }).listOrganizations();
	}
	async listProjects(accessToken) {
		return new SupabaseApiClient({ accessToken }).listProjects();
	}
	/**
	* Confirms the configurator is looking at the project the user meant, by
	* fetching it by reference and asking it how it is doing. Listing projects
	* only proves the token works; this proves that *this* ref resolves, belongs
	* to the account, and has services that answer — which is what step 2 is
	* about to depend on.
	*/
	async verifyProject(accessToken, ref) {
		const client = new SupabaseApiClient({ accessToken });
		const project = await client.getProject(ref);
		let services = [];
		try {
			services = (await client.getHealth(ref, [
				"db",
				"rest",
				"storage",
				"auth"
			])).map((h) => ({
				name: h.name,
				healthy: h.healthy
			}));
		} catch {}
		return {
			ref: project.ref,
			name: project.name,
			region: project.region,
			status: project.status,
			organizationSlug: project.organization_slug,
			services,
			ready: project.status === "ACTIVE_HEALTHY" && services.length > 0 && services.every((s) => s.healthy)
		};
	}
	async start(win, req) {
		this.cancel();
		this.controller = new AbortController();
		this.redactor = new Redactor().add(req.accessToken, req.dbPassword);
		const client = new SupabaseApiClient({
			accessToken: req.accessToken,
			signal: this.controller.signal
		});
		try {
			const ref = req.mode === "create" ? await this.createProject(win, client, req) : await this.adoptProject(win, client, req);
			if (req.stopAfterProject) {
				const panelKey = await this.resolvePanelServiceKey(win, client, ref);
				this.progress(win, 100);
				this.log(win, "Projet prêt. Les clés et les buckets seront récupérés à l'étape 2.", "done");
				win.webContents.send("provision:done", {
					service: SERVICE$3,
					patch: {
						...req.mode === "create" ? { SUPABASE_CREATED_PROJECT_REF: ref } : { SUPABASE_SELECTED_PROJECT_REF: ref },
						SUPABASE_URL: projectUrl(ref),
						...panelKey ? { SUPABASE_PANEL_SERVICE_KEY: panelKey } : {}
					}
				});
				return;
			}
			const keys = await this.resolveKeys(win, client, ref);
			const urls = await this.buildUrls(win, client, ref, req.dbPassword);
			await this.ensureBuckets(win, client, ref, keys.service);
			const patch = {
				...req.mode === "create" ? { SUPABASE_CREATED_PROJECT_REF: ref } : { SUPABASE_SELECTED_PROJECT_REF: ref },
				SUPABASE_URL: projectUrl(ref),
				SUPABASE_ANON_KEY: keys.anon,
				SUPABASE_SERVICE_ROLE_KEY: keys.service,
				...keys.panel ? { SUPABASE_PANEL_SERVICE_KEY: keys.panel } : {},
				...urls
			};
			this.progress(win, 100);
			this.log(win, "Configuration Supabase terminée.", "done");
			win.webContents.send("provision:done", {
				service: SERVICE$3,
				patch
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE$3 });
			} else {
				const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
				this.log(win, message, "error");
				win.webContents.send("provision:error", {
					service: SERVICE$3,
					message: this.redactor.redact(message)
				});
			}
		} finally {
			this.controller = null;
		}
	}
	async adoptProject(win, client, req) {
		this.progress(win, 5);
		if (req.ref) {
			this.log(win, `Projet ${req.ref} : vérification…`);
			const project = await client.getProject(req.ref);
			await this.waitUntilReady(win, client, project);
			return project.ref;
		}
		this.log(win, "Recherche du projet Supabase…");
		const usable = (await client.listProjects()).filter((p) => p.status !== "REMOVED" && p.status !== "INIT_FAILED");
		if (usable.length === 0) throw new Error("Aucun projet Supabase sur ce compte. Créez-en un depuis l'étape 1, ou renseignez les champs manuellement.");
		if (usable.length > 1) {
			const names = usable.map((p) => `${p.name} (${p.ref})`).join(", ");
			throw new Error(`Plusieurs projets Supabase trouvés — choisissez-en un à l'étape 1 : ${names}`);
		}
		this.log(win, `Projet trouvé : ${usable[0].name}`);
		await this.waitUntilReady(win, client, usable[0]);
		return usable[0].ref;
	}
	async createProject(win, client, req) {
		this.progress(win, 5);
		if (req.ref) {
			this.log(win, `Projet ${req.ref} déjà créé — réutilisation.`);
			const existing = await client.getProject(req.ref);
			await this.waitUntilReady(win, client, existing);
			return existing.ref;
		}
		if (!req.organizationSlug) throw new Error("Organisation Supabase non renseignée — impossible de créer le projet.");
		if (!req.projectName) throw new Error("Nom de projet non renseigné.");
		this.log(win, `Création du projet « ${req.projectName} »…`);
		const project = await client.createProject({
			name: req.projectName,
			organization_slug: req.organizationSlug,
			db_pass: req.dbPassword,
			region_selection: req.regionCode ? {
				type: "specific",
				code: req.regionCode
			} : void 0
		});
		this.log(win, `Projet créé : ${project.ref}`, "done");
		await this.waitUntilReady(win, client, project);
		return project.ref;
	}
	/** Provisioning is asynchronous — poll until the project answers. */
	async waitUntilReady(win, client, project) {
		if (project.status === "ACTIVE_HEALTHY") {
			this.progress(win, 45);
			return;
		}
		const deadline = Date.now() + READY_TIMEOUT_MS;
		this.log(win, "Attente du démarrage du projet (1 à 2 minutes)…");
		let current = project;
		while (current.status !== "ACTIVE_HEALTHY") {
			if (this.wasCancelled()) throw new DOMException("Aborted", "AbortError");
			if (current.status === "INIT_FAILED") throw new Error(`Le projet ${current.ref} n'a pas pu démarrer (INIT_FAILED).`);
			if (Date.now() > deadline) throw new Error(`Le projet ${current.ref} est toujours en ${current.status} après 6 minutes. Réessayez plus tard.`);
			await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
			current = await client.getProject(current.ref);
			this.progress(win, 30);
		}
		this.log(win, "Projet actif.", "done");
		this.progress(win, 45);
	}
	async resolveKeys(win, client, ref) {
		this.log(win, "Récupération des clés API…");
		let keys = await client.listApiKeys(ref);
		let pair = resolveKeyPair(keys);
		if (needsKeyProvisioning(pair)) {
			const legacy = await client.getLegacyKeysEnabled(ref);
			if (legacy && !legacy.enabled) {
				this.log(win, "Clés JWT legacy désactivées — réactivation…");
				await client.setLegacyKeysEnabled(ref, true);
				keys = await client.listApiKeys(ref);
				pair = resolveKeyPair(keys);
			}
		}
		if (needsKeyProvisioning(pair)) {
			const minted = [];
			if (!pair.anon) {
				this.log(win, "Création d'une clé publishable…");
				minted.push(await client.createApiKey(ref, "publishable", MANAGED_KEY_NAME));
			}
			if (!pair.service) {
				this.log(win, "Création d'une clé secret…");
				minted.push(await client.createApiKey(ref, "secret", MANAGED_KEY_NAME));
			}
			pair = resolveKeyPair([...minted, ...keys]);
		}
		if (!pair.anon || !pair.service) throw new Error("Impossible de récupérer une paire de clés utilisable. Ouvrez « Configuration manuelle » et copiez-les depuis le dashboard.");
		this.redactor.add(pair.anon.value, pair.service.value);
		this.log(win, `Clés récupérées — anon : ${describeKeyFormat(pair.anon.format)}, service : ${describeKeyFormat(pair.service.format)}.`, "done");
		this.progress(win, 60);
		/**
		* The browser panel needs the JWT one specifically. When the service key
		* above already is legacy, that is the same value and nothing more is
		* asked of the API; otherwise the listing just fetched is searched for it.
		*/
		const panel = pair.service.format === "legacy" ? pair.service.value : findLegacyServiceKey(keys);
		if (panel) this.redactor.add(panel);
		return {
			anon: pair.anon.value,
			service: pair.service.value,
			panel
		};
	}
	/**
	* The `service_role` key in JWT format, or null when the project offers none.
	*
	* `config.<domain>` is a browser app querying the Data API with whatever
	* service key it is handed, and Supabase answers 401 to a `sb_secret_…` key
	* on any request carrying an Origin — so the legacy format is the only one
	* that works there. A project with the legacy keys switched off gets them
	* switched back on, the same cheap repair `resolveKeys` performs.
	*
	* Anything that goes wrong is reported and swallowed: the project itself is
	* provisioned either way, and failing the run over an auxiliary lookup would
	* cost the reader the step they actually asked for.
	*/
	async resolvePanelServiceKey(win, client, ref) {
		try {
			this.log(win, "Récupération de la clé service_role legacy (pour le panneau de configuration)…");
			let key = findLegacyServiceKey(await client.listApiKeys(ref));
			if (!key) {
				const legacy = await client.getLegacyKeysEnabled(ref);
				if (legacy && !legacy.enabled) {
					this.log(win, "Clés JWT legacy désactivées — réactivation…");
					await client.setLegacyKeysEnabled(ref, true);
					key = findLegacyServiceKey(await client.listApiKeys(ref));
				}
			}
			if (!key) {
				this.log(win, "Aucune clé service_role legacy sur ce projet — elle pourra être récupérée depuis le dashboard.", "error");
				return null;
			}
			this.redactor.add(key);
			this.log(win, "Clé service_role legacy récupérée.", "done");
			return key;
		} catch (err) {
			if (this.wasCancelled()) throw err;
			const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
			this.log(win, `Clé service_role legacy indisponible : ${this.redactor.redact(message)}`, "error");
			return null;
		}
	}
	async buildUrls(win, client, ref, dbPassword) {
		this.log(win, "Récupération des URLs Postgres…");
		const { databaseUrl, directUrl } = buildPostgresUrls({
			ref,
			password: dbPassword,
			pooler: await client.getPoolerConfig(ref),
			databaseHost: (await client.getProject(ref)).database?.host
		});
		this.log(win, "URLs Postgres construites (mot de passe injecté et encodé).", "done");
		this.progress(win, 75);
		return {
			DATABASE_URL: databaseUrl,
			DIRECT_URL: directUrl
		};
	}
	async ensureBuckets(win, client, ref, serviceKey) {
		this.log(win, `Création des ${STORAGE_BUCKETS.length} buckets de stockage…`);
		const origin = projectUrl(ref);
		for (const bucket of STORAGE_BUCKETS) {
			if (this.wasCancelled()) throw new DOMException("Aborted", "AbortError");
			const created = await client.createBucket(origin, serviceKey, bucket);
			this.log(win, created ? `  ${bucket.name} : créé` : `  ${bucket.name} : déjà présent`);
		}
		const existing = await client.listBuckets(ref);
		const names = new Set(existing.map((b) => b.name));
		const missing = STORAGE_BUCKETS.filter((b) => !names.has(b.name)).map((b) => b.name);
		if (missing.length > 0) throw new Error(`Buckets manquants après création : ${missing.join(", ")}`);
		this.log(win, "Buckets vérifiés.", "done");
		this.progress(win, 90);
	}
};
//#endregion
//#region src/shared/supabaseSiteSetup.ts
/**
* The Supabase settings the stack needs once the deployment has created its
* tables — the four dashboard clicks and the grant script of the "Configuration
* du site" step, expressed as the SQL and the Management API calls that perform
* them.
*
* Shared between the renderer and the main process: the card shows the very
* statements the automation runs, so the manual fallback and the automated run
* can never drift apart.
*/
/**
* Default privileges on the public schema. Re-runnable: a GRANT that is already
* held is a no-op, so a second run changes nothing.
*/
var GRANTS_SQL = `GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
    postgres, anon, authenticated, service_role;`;
/** The table the Discord bot subscribes to, and the publication Realtime reads. */
var REALTIME_TABLE = "Announcement";
var REALTIME_PUBLICATION = "supabase_realtime";
/** The schema the Data API has to expose for the app to read anything at all. */
var REQUIRED_EXPOSED_SCHEMA = "public";
/**
* What the realtime step is up against, before it changes anything.
*
* The table only exists once the deployment has migrated the database, and its
* name is matched case-insensitively: knowing whether the schema is empty or
* merely spells the table differently is the difference between "run the
* deployment" and "you are pointed at the wrong project", and the run has to
* say which.
*/
var REALTIME_CHECK_SQL = `SELECT
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS public_tables,
  (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND lower(tablename) = lower('${REALTIME_TABLE}')
    ORDER BY tablename LIMIT 1
  ) AS matched_table,
  EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = '${REALTIME_PUBLICATION}'
  ) AS publication_exists,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = '${REALTIME_PUBLICATION}'
      AND schemaname = 'public'
      AND lower(tablename) = lower('${REALTIME_TABLE}')
  ) AS already_published;`;
/** The public tables, to name them when the expected one is not among them. */
var PUBLIC_TABLES_SQL = `SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 20;`;
/**
* Publishes the table the check actually found, rather than the name this file
* expects — `%I`-style quoting, so a name with a quote in it cannot break out.
*/
function realtimeAddSql(table) {
	return `ALTER PUBLICATION ${REALTIME_PUBLICATION} ADD TABLE public."${table.replace(/"/g, "\"\"")}";`;
}
/** The public tables still without row level security — the list to report. */
var RLS_PENDING_SQL = `SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;`;
/**
* Enables RLS on every public table that lacks it. `format('%I')` quotes the
* identifier, so Prisma's PascalCase table names survive.
*/
var RLS_ENABLE_SQL = `DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.tablename);
  END LOOP;
END $$;`;
/**
* Adds `public` to the Data API's exposed schemas without dropping the ones
* already there (`graphql_public` in particular). Returns `null` when the list
* already covers it — nothing to PATCH.
*/
function withPublicSchema(current) {
	const schemas = (current ?? "").split(",").map((s) => s.trim()).filter(Boolean);
	if (schemas.includes("public")) return null;
	return [...schemas, REQUIRED_EXPOSED_SCHEMA].join(", ");
}
//#endregion
//#region src/electron/services/SupabaseSiteSetupService.ts
var SERVICE$2 = "supabase-site";
/**
* The tail end of the Supabase setup: what has to be true of the project *after*
* the deployment has migrated the database — privileges, the exposed schema,
* Realtime on the announcements table, email confirmation off, RLS everywhere.
*
* Each step is written to be re-runnable: it reads the current state first and
* only changes what is not already right, so pressing "Lancer" twice is a no-op
* rather than a second, differently-broken configuration.
*/
var SupabaseSiteSetupService = class {
	controller = null;
	redactor = new Redactor();
	createClient;
	constructor(createClient = (opts) => new SupabaseApiClient(opts)) {
		this.createClient = createClient;
	}
	isRunning() {
		return this.controller !== null;
	}
	cancel() {
		this.controller?.abort();
		this.controller = null;
	}
	log(win, message, level = "info") {
		win.webContents.send("provision:log", {
			service: SERVICE$2,
			message: this.redactor.redact(message),
			level
		});
	}
	progress(win, value) {
		win.webContents.send("provision:progress", {
			service: SERVICE$2,
			value
		});
	}
	wasCancelled() {
		return this.controller?.signal.aborted ?? false;
	}
	/** Between two steps — a cancel in flight must not start the next one. */
	checkpoint() {
		if (this.wasCancelled()) throw new DOMException("Aborted", "AbortError");
	}
	async start(win, req) {
		this.cancel();
		this.controller = new AbortController();
		this.redactor = new Redactor().add(req.accessToken);
		const client = this.createClient({
			accessToken: req.accessToken,
			signal: this.controller.signal
		});
		try {
			if (!req.ref) throw new Error("Aucun projet Supabase sélectionné — renseignez la référence du projet à l'étape 1.");
			this.progress(win, 5);
			const project = await client.getProject(req.ref);
			this.log(win, `Projet ${project.name} (${project.ref}) — configuration finale…`);
			const pending = [];
			this.checkpoint();
			await this.applyGrants(win, client, req.ref);
			this.checkpoint();
			await this.exposePublicSchema(win, client, req.ref);
			this.checkpoint();
			await this.enableRealtime(win, client, req.ref, pending);
			this.checkpoint();
			await this.disableEmailConfirmation(win, client, req.ref);
			this.checkpoint();
			await this.enableRowLevelSecurity(win, client, req.ref);
			this.checkpoint();
			const panelServiceKey = await this.resolvePanelServiceKey(win, client, req.ref);
			if (pending.length > 0) throw new Error(`Configuration appliquée, sauf : ${pending.join(" ; ")}. Voir « Configuration manuelle » pour terminer.`);
			this.progress(win, 100);
			this.log(win, "Configuration du site Supabase terminée.", "done");
			win.webContents.send("provision:done", {
				service: SERVICE$2,
				patch: {
					SUPABASE_SITE_SETUP_AT: (/* @__PURE__ */ new Date()).toISOString(),
					...panelServiceKey ? { SUPABASE_PANEL_SERVICE_KEY: panelServiceKey } : {}
				}
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE$2 });
			} else {
				const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
				this.log(win, message, "error");
				win.webContents.send("provision:error", {
					service: SERVICE$2,
					message: this.redactor.redact(message)
				});
			}
		} finally {
			this.controller = null;
		}
	}
	async applyGrants(win, client, ref) {
		this.log(win, "Application des privilèges sur le schéma public…");
		await client.runQuery(ref, GRANTS_SQL);
		this.log(win, "Privilèges appliqués (anon, authenticated, service_role).", "done");
		this.progress(win, 25);
	}
	async exposePublicSchema(win, client, ref) {
		this.log(win, "Vérification des schémas exposés par la Data API…");
		const current = await client.getPostgrestConfig(ref);
		const updated = withPublicSchema(current.db_schema);
		if (!updated) this.log(win, `Schéma public déjà exposé (${current.db_schema}).`, "done");
		else {
			await client.updatePostgrestConfig(ref, { db_schema: updated });
			this.log(win, `Schémas exposés mis à jour : ${updated}.`, "done");
		}
		this.progress(win, 45);
	}
	async enableRealtime(win, client, ref, pending) {
		this.log(win, `Réplication Realtime de la table ${REALTIME_TABLE}…`);
		const [check] = await client.runQuery(ref, REALTIME_CHECK_SQL);
		if (!check?.matched_table) {
			const reason = !check || check.public_tables === 0 ? `le schéma public est vide — le déploiement (étape 4) n'a pas encore créé les tables. Relancez cette configuration ensuite.` : `table ${REALTIME_TABLE} absente parmi les ${check.public_tables} tables du schéma public (${await this.listPublicTables(client, ref)}). Vérifiez que le projet sélectionné est bien celui du déploiement.`;
			this.log(win, `Realtime : ${reason}`, "error");
			pending.push(`Realtime sur ${REALTIME_TABLE} — ${reason}`);
			this.progress(win, 60);
			return;
		}
		if (!check.publication_exists) {
			const reason = `publication ${REALTIME_PUBLICATION} absente de ce projet — activez le Realtime depuis le dashboard.`;
			this.log(win, `Realtime : ${reason}`, "error");
			pending.push(`Realtime sur ${REALTIME_TABLE} — ${reason}`);
			this.progress(win, 60);
			return;
		}
		if (check.already_published) this.log(win, `${check.matched_table} est déjà dans ${REALTIME_PUBLICATION}.`, "done");
		else {
			await client.runQuery(ref, realtimeAddSql(check.matched_table));
			this.log(win, `${check.matched_table} ajoutée à ${REALTIME_PUBLICATION}.`, "done");
		}
		this.progress(win, 60);
	}
	/** The public tables, named in the order Postgres lists them. */
	async listPublicTables(client, ref) {
		return (await client.runQuery(ref, PUBLIC_TABLES_SQL)).map((r) => r.tablename).join(", ");
	}
	async disableEmailConfirmation(win, client, ref) {
		this.log(win, "Désactivation de la confirmation d'email…");
		if ((await client.getAuthConfig(ref)).mailer_autoconfirm) this.log(win, "Confirmation d'email déjà désactivée.", "done");
		else {
			await client.updateAuthConfig(ref, { mailer_autoconfirm: true });
			this.log(win, "Confirmation d'email désactivée — le compte organisateur pourra se connecter.", "done");
		}
		this.progress(win, 80);
	}
	async enableRowLevelSecurity(win, client, ref) {
		this.log(win, "Activation de la RLS sur les tables publiques…");
		const before = await client.runQuery(ref, RLS_PENDING_SQL);
		if (before.length === 0) {
			this.log(win, "RLS déjà active sur toutes les tables publiques.", "done");
			this.progress(win, 95);
			return;
		}
		await client.runQuery(ref, RLS_ENABLE_SQL);
		const after = await client.runQuery(ref, RLS_PENDING_SQL);
		if (after.length > 0) throw new Error(`RLS toujours inactive sur : ${after.map((r) => r.tablename).join(", ")}`);
		this.log(win, `RLS activée sur ${before.length} table(s) : ${before.map((r) => r.tablename).join(", ")}.`, "done");
		this.progress(win, 95);
	}
	/**
	* `config.<domain>` reads the Data API from the browser with the service key
	* it is given, and Supabase rejects a `sb_secret_…` key on any request that
	* carries an Origin. So the panel needs the JWT legacy `service_role` key,
	* even though the deployed stack rightly keeps the secret one in its .env.
	* Reading it here is what lets the card offer it ready to copy instead of
	* walking the reader through the dashboard.
	*
	* A project with the legacy keys switched off gets them switched back on —
	* the same cheap repair the provisioning step performs. Anything that goes
	* wrong here is reported and swallowed: none of the five settings above
	* depend on it, and the card's manual instructions still name the dashboard
	* page. Turning a successful configuration into a failed run over an
	* auxiliary lookup would be the worse trade.
	*/
	async resolvePanelServiceKey(win, client, ref) {
		try {
			this.log(win, "Récupération de la clé service_role legacy (pour le panneau de configuration)…");
			let key = findLegacyServiceKey(await client.listApiKeys(ref));
			if (!key) {
				const legacy = await client.getLegacyKeysEnabled(ref);
				if (legacy && !legacy.enabled) {
					this.log(win, "Clés JWT legacy désactivées — réactivation…");
					await client.setLegacyKeysEnabled(ref, true);
					key = findLegacyServiceKey(await client.listApiKeys(ref));
				}
			}
			if (!key) {
				this.log(win, "Aucune clé service_role legacy sur ce projet — le panneau de configuration indiquera comment la récupérer depuis le dashboard.", "error");
				return null;
			}
			this.redactor.add(key);
			this.log(win, "Clé service_role legacy récupérée — elle sera proposée à la copie.", "done");
			this.progress(win, 98);
			return key;
		} catch (err) {
			if (this.wasCancelled()) throw err;
			const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
			this.log(win, `Clé service_role legacy indisponible : ${this.redactor.redact(message)}`, "error");
			return null;
		}
	}
};
//#endregion
//#region src/shared/dnsRecords.ts
var DNS_TTL = 3600;
/**
* Spaceship's Host field takes the name *without* the domain — `@` for the
* apex, `config` for the admin panel — which is also what its API documents
* ("name of resource record excluding domain name part"). Pasting the full
* hostname there creates `config.domain.fr.domain.fr`, a record that resolves
* for nobody and looks right in the table.
*
* Also applied to what Resend hands back, which is relative to the registered
* domain already — running it through here costs nothing and covers the case
* where it answers with a fully qualified name instead.
*/
function hostPart(hostname, domain) {
	const name = hostname.trim().replace(/\.$/, "");
	if (!name || !domain || name === domain) return "@";
	return name.endsWith(`.${domain}`) ? name.slice(0, -(domain.length + 1)) : name;
}
/**
* The records that belong to the deployment itself: the site, the admin panel
* and the DMARC policy for the sending subdomain. Resend's own records are not
* in here — they only exist once its API has been asked for them.
*/
function buildInfraDnsRecords(domain, ipv4, mailSubdomain) {
	return [
		{
			type: "TXT",
			host: `_dmarc.${hostPart(mailSubdomain, domain)}`,
			answer: "v=DMARC1;p=none;",
			ttl: DNS_TTL
		},
		{
			type: "A",
			host: "@",
			answer: ipv4,
			ttl: DNS_TTL
		},
		{
			type: "A",
			host: "config",
			answer: ipv4,
			ttl: DNS_TTL
		}
	];
}
//#endregion
//#region src/electron/services/spaceship/SpaceshipApiClient.ts
var SPACESHIP_BASE = "https://spaceship.dev/api";
var MAX_ATTEMPTS$1 = 4;
var BASE_BACKOFF_MS$1 = 1e3;
var PAGE_SIZE = 500;
/** Same reasoning as the Supabase client: only these are worth retrying. */
var RETRYABLE_STATUS$1 = new Set([
	429,
	500,
	502,
	503,
	504
]);
function explainStatus$1(status) {
	switch (status) {
		case 401: return "Clé API Spaceship refusée. Vérifiez la clé et le secret copiés depuis l'API Manager de Spaceship (étape 1) — un secret n'est affiché qu'à sa création.";
		case 403: return "Accès refusé par Spaceship — la clé API n'a pas les permissions nécessaires. Activez `dnsrecords:read` et `dnsrecords:write` sur la clé, et vérifiez que le domaine appartient bien à ce compte.";
		case 404: return "Domaine introuvable chez Spaceship. Vérifiez le nom de domaine de l'étape 1 : il doit être enregistré sur ce compte.";
		case 429: return "Trop de requêtes envoyées à Spaceship. Patientez quelques minutes avant de relancer.";
		default: return null;
	}
}
var SpaceshipApiError = class extends Error {
	status;
	constructor(status, url, detail) {
		const explanation = explainStatus$1(status);
		super(explanation ? detail ? `${explanation} (${detail})` : explanation : detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`);
		this.name = "SpaceshipApiError";
		this.status = status;
	}
};
function extractMessage$1(raw) {
	if (!raw) return "";
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "string") return parsed;
		const msg = parsed?.detail ?? parsed?.message ?? parsed?.error;
		if (typeof msg === "string") return msg;
		if (Array.isArray(parsed?.data)) {
			const details = parsed.data.map((d) => [d.field, d.details].filter(Boolean).join(": ")).filter(Boolean);
			if (details.length > 0) return details.join(" ; ");
		}
	} catch {}
	return raw.slice(0, 300);
}
function sleep$1(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
/** Our shape onto the one the API takes, with the value under the right key. */
function toSpaceshipItem(record) {
	const item = {
		type: record.type,
		name: record.host,
		ttl: record.ttl
	};
	switch (record.type) {
		case "A":
		case "AAAA":
			item.address = record.answer;
			break;
		case "CNAME":
			item.cname = record.answer;
			break;
		case "MX":
			item.exchange = record.answer;
			item.preference = record.priority ?? 10;
			break;
		default: item.value = record.answer;
	}
	return item;
}
var SpaceshipApiClient = class {
	apiKey;
	apiSecret;
	signal;
	fetchImpl;
	sleepImpl;
	constructor(opts) {
		this.apiKey = opts.apiKey.trim();
		this.apiSecret = opts.apiSecret.trim();
		this.signal = opts.signal;
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.sleepImpl = opts.sleepImpl ?? sleep$1;
	}
	async request(method, path, body) {
		const url = `${SPACESHIP_BASE}${path}`;
		let lastError = null;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS$1; attempt++) {
			const response = await this.fetchImpl(url, {
				method,
				headers: {
					"X-API-Key": this.apiKey,
					"X-API-Secret": this.apiSecret,
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: body === void 0 ? void 0 : JSON.stringify(body),
				signal: this.signal
			});
			if (response.ok || response.status === 204) {
				if (response.status === 204) return null;
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			}
			const detail = extractMessage$1(await response.text().catch(() => ""));
			lastError = new SpaceshipApiError(response.status, url, detail);
			if (!RETRYABLE_STATUS$1.has(response.status) || attempt === MAX_ATTEMPTS$1) throw lastError;
			const retryAfter = Number(response.headers.get("retry-after"));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : BASE_BACKOFF_MS$1 * 2 ** (attempt - 1);
			await this.sleepImpl(waitMs, this.signal);
		}
		throw lastError ?? new SpaceshipApiError(0, url, "Échec inconnu");
	}
	/** Cheap authenticated read — used to tell a bad key from a bad domain. */
	async listDomains() {
		return (await this.request("GET", "/v1/domains?take=1&skip=0"))?.items ?? [];
	}
	async listRecords(domain) {
		const all = [];
		let skip = 0;
		let total = Number.POSITIVE_INFINITY;
		while (skip < total) {
			const page = await this.request("GET", `/v1/dns/records/${encodeURIComponent(domain)}?take=${PAGE_SIZE}&skip=${skip}`);
			const items = page?.items ?? [];
			all.push(...items);
			total = page?.total ?? all.length;
			skip += items.length;
			if (items.length === 0) break;
		}
		return all;
	}
	/**
	* Writes the records, replacing whatever occupies the same name and type.
	*
	* The PUT alone does not do that: sending an A record for a name that
	* already has one leaves both in the zone, and a second run would have the
	* apex pointing at two addresses — the old instance and the new one. So the
	* conflicting records are deleted first, which is also what makes a re-run
	* after the IPv4 changes land on the right answer.
	*
	* Only the names this run is writing are touched; anything else the reader
	* keeps on the domain is left alone.
	*/
	async saveRecords(domain, records) {
		const items = records.map(toSpaceshipItem);
		const wanted = new Set(items.map((item) => `${item.name.toLowerCase()}|${item.type.toUpperCase()}`));
		const conflicting = (await this.listRecords(domain)).filter((item) => wanted.has(`${item.name.toLowerCase()}|${item.type.toUpperCase()}`));
		if (conflicting.length > 0) await this.request("DELETE", `/v1/dns/records/${encodeURIComponent(domain)}`, conflicting);
		await this.request("PUT", `/v1/dns/records/${encodeURIComponent(domain)}`, {
			force: true,
			items
		});
	}
};
//#endregion
//#region src/electron/services/SpaceshipProvisionService.ts
var SERVICE$1 = "spaceship";
/**
* Publishes the deployment's own DNS records on the domain: the site, the
* admin panel and the DMARC policy. What Resend needs is not built here —
* those records only exist once its API has been asked for them, and the
* Resend run publishes them itself — but they are checked over on the way
* past, and put back if the zone has lost them.
*/
var SpaceshipProvisionService = class {
	controller = null;
	redactor = new Redactor();
	isRunning() {
		return this.controller !== null;
	}
	cancel() {
		this.controller?.abort();
		this.controller = null;
	}
	log(win, message, level = "info") {
		win.webContents.send("provision:log", {
			service: SERVICE$1,
			message: this.redactor.redact(message),
			level
		});
	}
	progress(win, value) {
		win.webContents.send("provision:progress", {
			service: SERVICE$1,
			value
		});
	}
	wasCancelled() {
		return this.controller?.signal.aborted ?? false;
	}
	async start(win, req) {
		this.cancel();
		this.controller = new AbortController();
		this.redactor = new Redactor().add(req.apiKey, req.apiSecret);
		const client = new SpaceshipApiClient({
			apiKey: req.apiKey,
			apiSecret: req.apiSecret,
			signal: this.controller.signal
		});
		try {
			if (!req.domain) throw new Error("Nom de domaine non renseigné.");
			if (!req.ipv4) throw new Error("IPv4 de l'instance inconnue — lancez l'étape Scaleway avant de publier les enregistrements DNS.");
			const records = buildInfraDnsRecords(req.domain, req.ipv4, req.mailSubdomain);
			this.progress(win, 10);
			this.log(win, `Enregistrements à publier sur ${req.domain} :`);
			for (const record of records) this.log(win, `  ${record.type}  ${record.host}  ➔  ${record.answer}`);
			this.progress(win, 35);
			this.log(win, "Écriture chez Spaceship (les enregistrements de même nom sont remplacés)…");
			await client.saveRecords(req.domain, records);
			this.progress(win, 75);
			await this.verifyWritten(win, client, req.domain, records);
			await this.restoreResendRecords(win, client, req.domain, req.resendRecords ?? []);
			this.progress(win, 100);
			this.log(win, "Enregistrements DNS publiés.", "done");
			win.webContents.send("provision:done", {
				service: SERVICE$1,
				patch: {}
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE$1 });
			} else {
				const message = err instanceof SpaceshipApiError || err instanceof Error ? err.message : String(err);
				this.log(win, message, "error");
				win.webContents.send("provision:error", {
					service: SERVICE$1,
					message: this.redactor.redact(message)
				});
			}
		} finally {
			this.controller = null;
		}
	}
	/**
	* A second look at what Resend asked for, while the zone is already open.
	*
	* Those records are published by the Resend run, not this one, so they are
	* normally here already and this does nothing but say so. It exists for the
	* cases where they are not: a run that failed midway, a record deleted by
	* hand at the registrar, a zone restored from an older state. The symptom is
	* always the same and always distant — mail that silently stops being
	* delivered — so the cheapest moment to catch it is the one where the zone is
	* being read anyway.
	*
	* Never the source of truth for their *content*: what is republished is what
	* Resend last handed back, which the step above keeps current.
	*/
	async restoreResendRecords(win, client, domain, resendRecords) {
		if (resendRecords.length === 0) return;
		this.log(win, "Contrôle des enregistrements demandés par Resend…");
		const existing = await client.listRecords(domain);
		const present = new Set(existing.map((item) => `${item.name.toLowerCase().replace(/\.$/, "")}|${item.type.toUpperCase()}`));
		const missing = resendRecords.filter((record) => !present.has(`${record.host.toLowerCase()}|${record.type}`));
		if (missing.length === 0) {
			this.log(win, `Enregistrements Resend en place (${resendRecords.length}).`, "done");
			return;
		}
		this.log(win, `Enregistrements Resend absents de la zone (${missing.length}) — republication :`);
		for (const record of missing) this.log(win, `  ${record.type}  ${record.host}`);
		await client.saveRecords(domain, missing);
		await this.verifyWritten(win, client, domain, missing);
	}
	/**
	* Reads the zone back. A write that returns 2xx and leaves nothing behind is
	* the failure worth catching here — half-configured DNS that reads as done
	* would send the reader on to Resend, which then cannot verify anything.
	*
	* The check is on name and type, not on the value: what a zone hands back is
	* normalised (a TXT comes back quoted, a name may be fully qualified), and a
	* comparison that trips over punctuation would fail runs that worked. The
	* values are logged instead, so they can be read at a glance.
	*/
	async verifyWritten(win, client, domain, records) {
		this.log(win, "Relecture de la zone…");
		const existing = await client.listRecords(domain);
		const present = new Set(existing.map((item) => `${item.name.toLowerCase().replace(/\.$/, "")}|${item.type.toUpperCase()}`));
		const missing = records.filter((record) => !present.has(`${record.host.toLowerCase()}|${record.type}`));
		if (missing.length > 0) throw new Error(`Enregistrements absents de la zone après écriture : ${missing.map((r) => `${r.type} ${r.host}`).join(", ")}. Ajoutez-les à la main depuis « Configuration manuelle ».`);
		this.progress(win, 90);
		this.log(win, `Zone relue — ${records.length} enregistrement(s) en place.`, "done");
	}
};
//#endregion
//#region src/electron/services/resend/ResendApiClient.ts
var RESEND_BASE = "https://api.resend.com";
var MAX_ATTEMPTS = 4;
var BASE_BACKOFF_MS = 1e3;
var RETRYABLE_STATUS = new Set([
	429,
	500,
	502,
	503,
	504
]);
function explainStatus(status) {
	switch (status) {
		case 401: return "Clé API Resend refusée. Vérifiez la clé copiée depuis resend.com/api-keys (étape 1) — elle n'est affichée qu'à sa création.";
		case 403: return "Accès refusé par Resend — la clé API est en lecture seule ou restreinte. Il en faut une avec les droits « Full access » pour créer et vérifier un domaine.";
		case 404: return "Domaine introuvable chez Resend.";
		case 422: return "Resend a refusé le domaine. Un sous-domaine déjà enregistré sur un autre compte Resend, ou un nom mal formé, sont les deux causes habituelles.";
		case 429: return "Trop de requêtes envoyées à Resend. Patientez une minute avant de relancer.";
		default: return null;
	}
}
var ResendApiError = class extends Error {
	status;
	constructor(status, url, detail) {
		const explanation = explainStatus(status);
		super(explanation ? detail ? `${explanation} (${detail})` : explanation : detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`);
		this.name = "ResendApiError";
		this.status = status;
	}
};
function extractMessage(raw) {
	if (!raw) return "";
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "string") return parsed;
		const msg = parsed?.message ?? parsed?.error?.message ?? parsed?.name;
		if (typeof msg === "string") return msg;
	} catch {}
	return raw.slice(0, 300);
}
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
var ResendApiClient = class {
	apiKey;
	signal;
	fetchImpl;
	sleepImpl;
	constructor(opts) {
		this.apiKey = opts.apiKey.trim();
		this.signal = opts.signal;
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.sleepImpl = opts.sleepImpl ?? sleep;
	}
	async request(method, path, body) {
		const url = `${RESEND_BASE}${path}`;
		let lastError = null;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			const response = await this.fetchImpl(url, {
				method,
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: body === void 0 ? void 0 : JSON.stringify(body),
				signal: this.signal
			});
			if (response.ok) {
				if (response.status === 204) return null;
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			}
			const detail = extractMessage(await response.text().catch(() => ""));
			lastError = new ResendApiError(response.status, url, detail);
			if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw lastError;
			const retryAfter = Number(response.headers.get("retry-after"));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : BASE_BACKOFF_MS * 2 ** (attempt - 1);
			await this.sleepImpl(waitMs, this.signal);
		}
		throw lastError ?? new ResendApiError(0, url, "Échec inconnu");
	}
	async listDomains() {
		return (await this.request("GET", "/domains"))?.data ?? [];
	}
	/** The creation response is the only one that carries the records straight away. */
	async createDomain(name, region) {
		const created = await this.request("POST", "/domains", {
			name,
			...region ? { region } : {}
		});
		if (!created) throw new ResendApiError(0, "/domains", "Réponse vide");
		return created;
	}
	async getDomain(id) {
		const domain = await this.request("GET", `/domains/${id}`);
		if (!domain) throw new ResendApiError(0, `/domains/${id}`, "Réponse vide");
		return domain;
	}
	/** Asks Resend to look at the DNS now; the check itself runs asynchronously. */
	async verifyDomain(id) {
		await this.request("POST", `/domains/${id}/verify`);
	}
};
//#endregion
//#region src/electron/services/ResendProvisionService.ts
var SERVICE = "resend";
/**
* The standalone check answers a button pressed by someone watching, so it is
* held to seconds. The run itself no longer waits at all: Resend puts DNS
* propagation at up to fifteen minutes, which is nothing a card held open can
* shorten.
*/
var CHECK_POLL_INTERVAL_MS = 5e3;
var CHECK_TIMEOUT_MS = 25e3;
/**
* Creates the sending subdomain on Resend, publishes the records it asks for,
* and asks it to verify them.
*
* The records are the reason this run exists: they are not knowable in
* advance — the DKIM key is minted with the domain — so nothing can publish
* them until Resend has been asked. When the domain lives at Spaceship this
* run publishes them itself; at any other registrar it stops once they are
* known and leaves them on screen to be copied.
*/
var ResendProvisionService = class {
	controller = null;
	redactor = new Redactor();
	isRunning() {
		return this.controller !== null;
	}
	cancel() {
		this.controller?.abort();
		this.controller = null;
	}
	log(win, message, level = "info") {
		win.webContents.send("provision:log", {
			service: SERVICE,
			message: this.redactor.redact(message),
			level
		});
	}
	progress(win, value) {
		win.webContents.send("provision:progress", {
			service: SERVICE,
			value
		});
	}
	wasCancelled() {
		return this.controller?.signal.aborted ?? false;
	}
	async start(win, req) {
		this.cancel();
		this.controller = new AbortController();
		this.redactor = new Redactor().add(req.apiKey, req.spaceshipApiKey, req.spaceshipApiSecret);
		const client = new ResendApiClient({
			apiKey: req.apiKey,
			signal: this.controller.signal
		});
		try {
			if (!req.mailSubdomain) throw new Error("Sous-domaine d'envoi non renseigné (étape 1).");
			const domain = await this.resolveDomain(win, client, req);
			const records = this.normaliseRecords(domain.records ?? [], req.domain);
			if (records.length === 0) throw new Error("Resend n'a renvoyé aucun enregistrement DNS pour ce domaine. Ouvrez resend.com/domains pour les relever à la main.");
			this.progress(win, 40);
			this.log(win, `Enregistrements demandés par Resend (${records.length}) :`);
			for (const record of records) this.log(win, `  ${record.type}  ${record.host}  ➔  ${this.shorten(record.answer)}`);
			const patch = {
				RESEND_DOMAIN_ID: domain.id,
				RESEND_DNS_RECORDS: JSON.stringify(records)
			};
			if (!req.spaceshipApiKey || !req.spaceshipApiSecret) {
				this.progress(win, 100);
				this.log(win, "Domaine créé chez Resend. Publiez les enregistrements ci-dessus chez votre registrar, puis relancez pour lancer la vérification.", "done");
				win.webContents.send("provision:done", {
					service: SERVICE,
					patch
				});
				return;
			}
			await this.publishRecords(win, req, records);
			/**
			* The run ends here, at the moment the waiting would start.
			*
			* Everything an automation can do is done: the domain exists, the
			* records are published, and Resend has been asked to look. What
			* remains is DNS propagation, which its own documentation puts at up to
			* fifteen minutes and which no amount of holding the card open makes
			* faster. Reported as pending instead, so the reader moves on to the
			* next step and comes back to a card that confirms itself.
			*/
			if (domain.status === "verified") {
				this.log(win, "Domaine déjà vérifié par Resend — les envois sont possibles.", "done");
				patch.RESEND_DOMAIN_VERIFIED_AT = (/* @__PURE__ */ new Date()).toISOString();
				patch.RESEND_VERIFICATION_PENDING_SINCE = "";
			} else {
				this.log(win, "Demande de vérification à Resend…");
				await client.verifyDomain(domain.id);
				patch.RESEND_VERIFICATION_PENDING_SINCE = (/* @__PURE__ */ new Date()).toISOString();
				this.log(win, "Vérification demandée. La propagation DNS peut prendre jusqu'à 15 minutes : cette étape est terminée, Resend confirmera de son côté. Inutile d'attendre ici — « Relancer la vérification Resend » redemandera le contrôle.", "done");
			}
			this.progress(win, 100);
			win.webContents.send("provision:done", {
				service: SERVICE,
				patch
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE });
			} else {
				const message = err instanceof ResendApiError || err instanceof SpaceshipApiError || err instanceof Error ? err.message : String(err);
				this.log(win, message, "error");
				win.webContents.send("provision:error", {
					service: SERVICE,
					message: this.redactor.redact(message)
				});
			}
		} finally {
			this.controller = null;
		}
	}
	/**
	* The sending domain as Resend holds it now — read-only, and deliberately
	* not a verification: this runs when the step is merely opened, and asking
	* for a check on every visit would be a request the reader never made.
	*
	* Resolved by name rather than by the saved id, because the id is the very
	* thing that goes stale: a domain deleted from the dashboard and added again
	* has a new one, and a domain simply deleted has none. The account's own
	* listing is the only thing that can settle either.
	*/
	async readDomain(req) {
		const client = new ResendApiClient({ apiKey: req.apiKey });
		const listed = (await client.listDomains()).find((d) => d.name === req.mailSubdomain);
		if (!listed) return { exists: false };
		const domain = await client.getDomain(listed.id);
		return {
			exists: true,
			domainId: domain.id,
			status: domain.status,
			records: this.normaliseRecords(domain.records ?? [], req.domain)
		};
	}
	/**
	* Asks Resend to look at the DNS now, and reports what it sees.
	*
	* Nothing is created and nothing is published: this is the button pressed
	* once the records are in place at the registrar, which the dashboard itself
	* offers no equivalent of — Resend's own check runs on its schedule, and a
	* domain can sit at `pending` for hours waiting for it. Separate from
	* `start` so re-checking never risks a second domain or a re-publish.
	*/
	async verifyOnly(req) {
		const client = new ResendApiClient({ apiKey: req.apiKey });
		const id = await this.findDomainId(client, req);
		await client.verifyDomain(id);
		const deadline = Date.now() + CHECK_TIMEOUT_MS;
		let status = (await client.getDomain(id)).status;
		while (status !== "verified" && status !== "failed" && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, CHECK_POLL_INTERVAL_MS));
			status = (await client.getDomain(id)).status;
		}
		return {
			domainId: id,
			status,
			...status === "verified" ? { verifiedAt: (/* @__PURE__ */ new Date()).toISOString() } : {}
		};
	}
	/**
	* The domain to check. An id saved by an earlier run is the direct route,
	* but it names a domain that may have been deleted from the dashboard since
	* — and a domain added there by hand has no id here at all — so both fall
	* back to resolving it by name.
	*/
	async findDomainId(client, req) {
		if (req.domainId) try {
			return (await client.getDomain(req.domainId)).id;
		} catch {}
		const known = (await client.listDomains()).find((d) => d.name === req.mailSubdomain);
		if (!known) throw new Error(`${req.mailSubdomain} n'est pas (ou plus) enregistré sur ce compte Resend. Lancez l'étape pour le créer, ou ajoutez-le depuis resend.com/domains.`);
		return known.id;
	}
	async resolveDomain(win, client, req) {
		this.progress(win, 10);
		if (req.domainId) try {
			const known = await client.getDomain(req.domainId);
			this.log(win, `Domaine ${known.name} déjà créé — réutilisation.`);
			return known;
		} catch (err) {
			if (this.wasCancelled()) throw err;
			this.log(win, "Le domaine enregistré précédemment est introuvable — nouvelle recherche.");
		}
		this.log(win, `Recherche de ${req.mailSubdomain} sur le compte Resend…`);
		const existing = (await client.listDomains()).find((d) => d.name === req.mailSubdomain);
		if (existing) {
			this.log(win, `Domaine trouvé (${existing.status}) — récupération des enregistrements.`);
			return client.getDomain(existing.id);
		}
		this.log(win, `Création du domaine ${req.mailSubdomain}…`);
		const created = await client.createDomain(req.mailSubdomain);
		this.log(win, "Domaine créé.", "done");
		return created;
	}
	/**
	* Resend's records onto the shape the rest of the wizard uses. Its `name` is
	* relative to the registered domain already, but is run through `hostPart`
	* anyway so a fully qualified one would not produce `x.domain.fr.domain.fr`.
	* Its `ttl` is the string "Auto", so ours is used instead.
	*/
	normaliseRecords(records, domain) {
		return records.map((record) => ({
			type: record.type.toUpperCase(),
			host: hostPart(record.name, domain),
			answer: record.value,
			ttl: DNS_TTL,
			...record.priority !== void 0 ? { priority: record.priority } : {}
		}));
	}
	/** A DKIM value runs to a few hundred characters — unreadable in a log pane. */
	shorten(value) {
		return value.length > 60 ? `${value.slice(0, 57)}…` : value;
	}
	async publishRecords(win, req, records) {
		this.log(win, `Publication des enregistrements chez Spaceship sur ${req.domain}…`);
		await new SpaceshipApiClient({
			apiKey: req.spaceshipApiKey,
			apiSecret: req.spaceshipApiSecret,
			signal: this.controller?.signal
		}).saveRecords(req.domain, records);
		this.progress(win, 60);
		this.log(win, "Enregistrements publiés.", "done");
	}
};
//#endregion
//#region src/electron/services/CredentialCheckService.ts
/**
* A key is checked on every edit, so the probe has to be the cheapest
* authenticated read each provider offers, and it must not retry: a key being
* typed is wrong most of the way through, and hammering four APIs with
* backoff for every keystroke would earn the reader a rate limit for their
* trouble. The debounce lives in the renderer; this just answers once.
*/
var TIMEOUT_MS = 8e3;
/** What refusing a key looks like nearly everywhere. */
var REFUSED = [401, 403];
/** Only a refusal is conclusive. Anything else leaves the key unjudged. */
function classify(status, refused) {
	if (status >= 200 && status < 300) return { state: "valid" };
	if (refused.includes(status)) return { state: "invalid" };
	return { state: "unknown" };
}
/**
* Which statuses mean "refused" is the provider's business, hence the
* parameter: the probe is a bare GET carrying nothing but the credentials, so
* whatever a provider rejects about it, it is rejecting the key.
*/
async function probe(url, headers, refused = REFUSED) {
	try {
		return classify((await fetch(url, {
			method: "GET",
			headers: {
				Accept: "application/json",
				...headers
			},
			signal: AbortSignal.timeout(TIMEOUT_MS)
		})).status, refused);
	} catch {
		return { state: "unknown" };
	}
}
function checkCredentials(req) {
	switch (req.service) {
		case "supabase": return probe("https://api.supabase.com/v1/organizations", { Authorization: `Bearer ${req.accessToken.trim()}` });
		/**
		* The IAM listing rather than a project lookup: this answers for the
		* secret key alone, which is what the reader is being warned about. A
		* wrong project ID is a different mistake, and the Scaleway run reports it
		* with the context that makes it fixable.
		*/
		case "scaleway": return probe("https://api.scaleway.com/iam/v1alpha1/ssh-keys?page_size=1", { "X-Auth-Token": req.secretKey.trim() });
		case "spaceship": return probe("https://spaceship.dev/api/v1/domains?take=1&skip=0", {
			"X-API-Key": req.apiKey.trim(),
			"X-API-Secret": req.apiSecret.trim()
		});
		/**
		* 400 as well as the usual pair: Resend answers a key it does not accept
		* with `400 {"message":"API key is invalid"}`, not the 401 every other
		* provider here sends. Left out, its refusal read as "nothing learned" and
		* the card stayed silent on a key that could never work.
		*/
		case "resend": return probe("https://api.resend.com/domains", { Authorization: `Bearer ${req.apiKey.trim()}` }, [400, ...REFUSED]);
	}
}
//#endregion
//#region src/electron/ipc/provisionHandlers.ts
/**
* IPC surface for the "Configuration par API" automations.
*
* Same shape as the deploy handlers: the renderer starts and cancels, the main
* process streams progress back over `provision:*` events. Every call is
* wrapped so a provider error reaches the card as a message instead of an
* unhandled rejection in the main process.
*/
function registerProvisionHandlers(getWin) {
	const supabase = new SupabaseProvisionService();
	const supabaseSite = new SupabaseSiteSetupService();
	const spaceship = new SpaceshipProvisionService();
	const resend = new ResendProvisionService();
	const requireWin = () => {
		const win = getWin();
		if (!win) throw new Error("No active window");
		return win;
	};
	ipcMain.handle("provision:supabase:start", (_event, req) => {
		supabase.start(requireWin(), req);
	});
	ipcMain.handle("provision:supabase:site-setup", (_event, req) => {
		supabaseSite.start(requireWin(), req);
	});
	ipcMain.handle("provision:supabase:organizations", async (_event, accessToken) => {
		try {
			return {
				success: true,
				data: await supabase.listOrganizations(accessToken)
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err)
			};
		}
	});
	ipcMain.handle("provision:supabase:projects", async (_event, accessToken) => {
		try {
			return {
				success: true,
				data: await supabase.listProjects(accessToken)
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err)
			};
		}
	});
	ipcMain.handle("provision:supabase:verify-project", async (_event, accessToken, ref) => {
		try {
			return {
				success: true,
				data: await supabase.verifyProject(accessToken, ref)
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err)
			};
		}
	});
	ipcMain.handle("provision:spaceship:start", (_event, req) => {
		spaceship.start(requireWin(), req);
	});
	ipcMain.handle("provision:resend:start", (_event, req) => {
		resend.start(requireWin(), req);
	});
	/**
	* A read of the sending domain, for a step being opened. Read-only: it asks
	* Resend nothing but what it already holds.
	*/
	ipcMain.handle("provision:resend:read-domain", async (_event, req) => {
		try {
			return {
				success: true,
				data: await resend.readDomain(req)
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err)
			};
		}
	});
	/**
	* The standalone verification. Answers a promise rather than streaming over
	* `provision:*`: it is a question about one domain, not a run, and the card
	* that asked is waiting on the answer.
	*/
	ipcMain.handle("provision:resend:verify", async (_event, req) => {
		try {
			return {
				success: true,
				data: await resend.verifyOnly(req)
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err)
			};
		}
	});
	/**
	* Answers for one key, on demand. Read-only and retry-free by design — it
	* runs on every edit of the account page, not as part of a run.
	*/
	ipcMain.handle("credentials:check", async (_event, req) => {
		try {
			return await checkCredentials(req);
		} catch {
			return { state: "unknown" };
		}
	});
	ipcMain.handle("provision:cancel", (_event, service) => {
		if (service === "supabase") supabase.cancel();
		if (service === "supabase-site") supabaseSite.cancel();
		if (service === "spaceship") spaceship.cancel();
		if (service === "resend") resend.cancel();
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
registerSshHandlers();
registerScalewayHandlers(() => win);
registerProvisionHandlers(() => win);
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
