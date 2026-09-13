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
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
