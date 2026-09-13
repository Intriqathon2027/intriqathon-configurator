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
var MAX_ATTEMPTS = 4;
var BASE_BACKOFF_MS = 1e3;
/** Rate limiting is per user (~60 req/min); `Retry-After` says how long to wait. */
var RETRYABLE_STATUS = new Set([
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
function explainStatus(status) {
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
		const explanation = explainStatus(status);
		const informative = detail && !GENERIC_DETAILS.has(detail.trim().toLowerCase());
		super(explanation ? informative ? `${explanation} (${detail})` : explanation : detail ? `HTTP ${status} — ${detail}` : `HTTP ${status} sur ${url}`);
		this.name = "SupabaseApiError";
		this.status = status;
		this.url = url;
		this.detail = detail;
	}
};
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
/**
* Supabase reports failures as `{ message }` — sometimes `{ error }`, sometimes
* plain text. Pull out whatever is readable so the card shows the provider's
* own wording ("project limit reached") rather than a bare status code.
*/
function extractMessage(raw) {
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
		this.sleepImpl = opts.sleepImpl ?? sleep;
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
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
			const detail = extractMessage(await response.text().catch(() => ""));
			lastError = new SupabaseApiError(response.status, url, detail);
			if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw lastError;
			const retryAfter = Number(response.headers.get("retry-after"));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : BASE_BACKOFF_MS * 2 ** (attempt - 1);
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
	const legacyService = usable.find((k) => k.type === "legacy" && k.name === "service_role");
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
var SERVICE$1 = "supabase";
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
				this.progress(win, 100);
				this.log(win, "Projet prêt. Les clés et les buckets seront récupérés à l'étape 2.", "done");
				win.webContents.send("provision:done", {
					service: SERVICE$1,
					patch: {
						...req.mode === "create" ? { SUPABASE_CREATED_PROJECT_REF: ref } : { SUPABASE_SELECTED_PROJECT_REF: ref },
						SUPABASE_URL: projectUrl(ref)
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
				...urls
			};
			this.progress(win, 100);
			this.log(win, "Configuration Supabase terminée.", "done");
			win.webContents.send("provision:done", {
				service: SERVICE$1,
				patch
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE$1 });
			} else {
				const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
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
		return {
			anon: pair.anon.value,
			service: pair.service.value
		};
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
* What the realtime step is up against, before it changes anything: the table
* only exists once the deployment has migrated the database, and the row may
* already be in the publication from an earlier run.
*/
var REALTIME_CHECK_SQL = `SELECT
  to_regclass('public."${REALTIME_TABLE}"') IS NOT NULL AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = '${REALTIME_PUBLICATION}'
  ) AS publication_exists,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = '${REALTIME_PUBLICATION}'
      AND schemaname = 'public'
      AND tablename = '${REALTIME_TABLE}'
  ) AS already_published;`;
var REALTIME_ADD_SQL = `ALTER PUBLICATION ${REALTIME_PUBLICATION} ADD TABLE public."${REALTIME_TABLE}";`;
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
var SERVICE = "supabase-site";
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
			if (pending.length > 0) throw new Error(`Configuration appliquée, sauf : ${pending.join(" ; ")}. Voir « Configuration manuelle » pour terminer.`);
			this.progress(win, 100);
			this.log(win, "Configuration du site Supabase terminée.", "done");
			win.webContents.send("provision:done", {
				service: SERVICE,
				patch: { SUPABASE_SITE_SETUP_AT: (/* @__PURE__ */ new Date()).toISOString() }
			});
		} catch (err) {
			if (this.wasCancelled()) {
				this.log(win, "Configuration annulée.", "info");
				win.webContents.send("provision:cancelled", { service: SERVICE });
			} else {
				const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err);
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
		if (!check?.table_exists) {
			this.log(win, `Table ${REALTIME_TABLE} absente — lancez d'abord le déploiement (étape 4), puis relancez cette configuration.`, "error");
			pending.push(`Realtime sur ${REALTIME_TABLE} (table absente)`);
			this.progress(win, 60);
			return;
		}
		if (!check.publication_exists) {
			this.log(win, `Publication ${REALTIME_PUBLICATION} introuvable sur ce projet.`, "error");
			pending.push(`Realtime sur ${REALTIME_TABLE} (publication ${REALTIME_PUBLICATION} absente)`);
			this.progress(win, 60);
			return;
		}
		if (check.already_published) this.log(win, `${REALTIME_TABLE} est déjà dans ${REALTIME_PUBLICATION}.`, "done");
		else {
			await client.runQuery(ref, REALTIME_ADD_SQL);
			this.log(win, `${REALTIME_TABLE} ajoutée à ${REALTIME_PUBLICATION}.`, "done");
		}
		this.progress(win, 60);
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
};
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
	ipcMain.handle("provision:cancel", (_event, service) => {
		if (service === "supabase") supabase.cancel();
		if (service === "supabase-site") supabaseSite.cancel();
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
