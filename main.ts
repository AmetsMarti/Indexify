import {
	App,
	TFolder,
	TFile,
	TAbstractFile,
	Editor,
	Vault,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { removeIndexFromFile, addIndexToFile, getParentFolderFromPath } from "utils";

interface IndexifySettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: IndexifySettings = {
	mySetting: "default",
};

export default class Indexify extends Plugin {
	settings: IndexifySettings;
	indexes = false; // If indexes are enabled or not
	private isUpdatingIndexes = false; // If the plugin is currently updating indexes
	private ribbonIcon : HTMLElement;

	async onload() {
		await this.loadSettings();
		console.log("loading indexify plugin...");
		this.updateIndexes(this.app.vault);
		this.attachFileListeners();

		this.ribbonIcon = this.addRibbonIcon("eclipse", "Toggle Indexing", (evt: MouseEvent) => {
			if (this.indexes == false) {
				this.updateIndexes(this.app.vault);
				new Notice("Indexes enabled");
				this.indexes = true;
			} else {
				new Notice("Indexes disabled");
				this.deleteIndexes(this.app.vault.getRoot());
				this.indexes = false;
			}
		});
	}

	onunload() {
		console.log("unloading indexify plugin...");
		console.log("deleting all files...");
		this.deleteIndexes(this.app.vault.getRoot());
	}

	async attachFileListeners() {
		// Register events for file creation
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (this.indexes) {
					console.log(`File created: ${file.path}`);
					this.handleCreateFile(file);
				}
			}),
		);

		// Register events for file deletion
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (this.indexes) {
					console.log(`File deleted: ${file.path}`);
					this.handleDeleteFile(file);
				}
			}),
		);

		// Register events for file renaming
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (this.indexes) {
					console.log(`File renamed from ${oldPath} to ${file.path}`);
					this.updateIndexes(this.app.vault);
				}
			}),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async isIndexFile(file: TAbstractFile): Promise<boolean> {
		return (
			file instanceof TFile &&
			file.extension === "md" &&
			file.basename.endsWith("_index")
		);
	}

	async updateIndexes(vault: Vault) {
		this.isUpdatingIndexes = true;
		const mainFolder = vault.getRoot();
		console.log("starting from: " + mainFolder.name);
		//this.printFolderTree(vault,mainFolder);
		if (mainFolder != null) {
			this.updateFolderIndex(mainFolder, mainFolder);
		}
		this.isUpdatingIndexes = false;
	}

	async updateFolderIndex(folder: TFolder, mainFolder: TFolder) {
		let indexFilePath = folder.name + "_index.md";
		if (folder.path !== mainFolder.path) {
			indexFilePath = `${folder.path}/${folder.name}_index.md`;
		}

		const existingIndex = this.app.vault.getFileByPath(indexFilePath);
		const indexHeader = "";

		let indexFile = await this.app.vault.getFileByPath(indexFilePath);
		if (!(indexFile instanceof TFile)) {
			await this.app.vault.create(indexFilePath, indexHeader);
			indexFile = await this.app.vault.getFileByPath(indexFilePath);
		}
		const childIndex = [];
		const childFolderIndex = [];

		for (const child of folder.children) {
			if (child instanceof TFile && indexFile) {
				if (
					child.name == "index.md" ||
					child.name == folder.name + "_index.md"
				) {
					continue;
				}
				childIndex.push(child.name);
				//console.log(child.name);
			} else if (child instanceof TFolder) {
				childFolderIndex.push(child.name);
				await this.updateFolderIndex(child, mainFolder);
			}
		}

		if (indexFile) {
			try {
				await this.app.vault.append(indexFile, "\n");
				await addIndexToFile(
					indexFile,
					childIndex,
					childFolderIndex,
					this.app.vault,
				);
				//console.log(
				// 	"Index file path of " +
				// 		folder.name +
				// 		" folder: " +
				// 		indexFilePath,
				// );
			} catch (error) {
				console.error(`Error reading file '${indexFile.path}':`, error);
			}
		} else {
			console.log(`File ${indexFilePath} not found`);
		}
	}

	async deleteIndexes(mainFolder: TFolder) {
		for (const file of this.app.vault.getFiles()) {
			if (file.name.includes("_index.md")) {
				this.app.vault.delete(file);
			}
		}
	}

	//when creating a new file, adds its respective index to the parent folder's index file
	async handleCreateFile(file: TAbstractFile) {
		const parentFolder = file.parent;
		if (parentFolder && !this.isUpdatingIndexes) {
			try {
				const indexFilePath = `${parentFolder.path}/${parentFolder.name}_index.md`;
				console.log("Retrieving Index file from path: " + indexFilePath);
				const indexFile = await this.app.vault.getFileByPath(indexFilePath);
				try {
					if (indexFile != null) {
						console.log("Adding index for " + file.name + " in " + indexFile.name);
						await addIndexToFile(
							indexFile,
							[file.name],
							[],
							this.app.vault,
						);
					} else {
						throw new Error("Index file not found for " + file.name);
					}
				} catch(error) {
					console.log("ERROR: IndexFile was null when adding");
				}
			} catch(error) {
				console.log("ERROR: IndexFile was not found when adding - Restart the Indexes");
				return;
			}
		}
	}

	async handleDeleteFile(file: TAbstractFile) {
		const parentFolderPath = getParentFolderFromPath(file.path);
		const parentFolder = this.app.vault.getFolderByPath(parentFolderPath);

		if (!parentFolder) {
			console.log("ERROR: Parent folder not found for " + file.path);
			return;
		}
		console.log("Parent folder: " + parentFolder.path);
		if (parentFolder && !this.isUpdatingIndexes) {
			try{
				const indexFilePath = `${parentFolder.path}/${parentFolder.name}_index.md`;
				console.log("Retrieving Index file from path: " + indexFilePath);
				const indexFile = await this.app.vault.getFileByPath(indexFilePath);
				try{
					if (indexFile != null)  {
						console.log("Removing index for " + file.name +" in " + indexFile.name);
						await removeIndexFromFile(file, indexFile, this.app.vault);
					}
					else{
						throw new Error("Index file not found for " + file.name);
					}
				} catch(error){
					console.log("ERROR: IndexFile was null when removing");
				}
					
			} catch(error){
				console.log("ERROR: IndexFile was not found when removing - Restart the Indexes");
				return;
			}
		}
	}
}


