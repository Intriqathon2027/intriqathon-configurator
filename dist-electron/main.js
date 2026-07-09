import { BrowserWindow as e, app as t, dialog as n, ipcMain as r, shell as i } from "electron";
import { fileURLToPath as a } from "node:url";
import o from "node:path";
import s from "node:fs";
//#region electron/main.ts
var c = o.dirname(a(import.meta.url));
process.env.APP_ROOT = o.join(c, "..");
var l = process.env.VITE_DEV_SERVER_URL, u = o.join(process.env.APP_ROOT, "dist-electron"), d = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? o.join(process.env.APP_ROOT, "public") : d;
var f;
function p() {
	f = new e({
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
			preload: o.join(c, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		},
		icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg")
	}), f.webContents.on("did-finish-load", () => {
		f?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
	}), l ? f.loadURL(l) : f.loadFile(o.join(d, "index.html"));
}
r.handle("open-external-url", async (e, t) => {
	await i.openExternal(t);
}), r.handle("open-folder-dialog", async () => {
	let e = await n.showOpenDialog(f, {
		properties: ["openDirectory"],
		title: "Sélectionner le dossier de déploiement"
	});
	return !e.canceled && e.filePaths.length > 0 ? e.filePaths[0] : null;
}), r.handle("save-env-file", async (e, t) => {
	let r = await n.showSaveDialog(f, {
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
	let r = await n.showSaveDialog(f, {
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
	let e = await n.showOpenDialog(f, {
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
			return JSON.parse(t);
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
	process.platform !== "darwin" && (t.quit(), f = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && p();
}), t.whenReady().then(p);
//#endregion
export { u as MAIN_DIST, d as RENDERER_DIST, l as VITE_DEV_SERVER_URL };
