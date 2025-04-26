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

// Remember to rename these classes and interfaces!

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

	async onload() {
		await this.loadSettings();
		console.log("loading indexify plugin...");
		this.updateIndexes(this.app.vault);
		this.attachFileListeners();

		this.addRibbonIcon("dice", "Toggle Indexing", (evt: MouseEvent) => {
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
					this.updateIndexes(this.app.vault);
				}
			}),
		);

		// Register events for file deletion
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (this.indexes) {
					console.log(`File deleted: ${file.path}`);
					this.updateIndexes(this.app.vault);
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

		if (existingIndex instanceof TFile == false) {
			await this.app.vault.create(indexFilePath, indexHeader);
		}

		const indexFile = await this.app.vault.getFileByPath(indexFilePath);
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
				console.log(child.name);
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
				console.log(
					"Index file path of " +
						folder.name +
						" folder: " +
						indexFilePath,
				);
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
	async handleCreateFile(file: TFile) {
		const parentFolder = file.parent;
		if (parentFolder) {
			const indexFile = await this.app.vault.getFileByPath(
				parentFolder.path + "/_index.md",
			);
			if (indexFile && indexFile instanceof TFile) {
				await addIndexToFile(
					indexFile,
					[TFile.name],
					[],
					this.app.vault,
				);
			}
		}
	}
}
async function addIndexToFile(
	indexFile: TFile,
	childIndex: any[],
	childFolderIndex: any[],
	vault: Vault,
) {
	const indexContent = await vault.read(indexFile);
	const existingLinks = indexContent.split("\n");

	for (const index of childIndex) {
		const link = "[[" + index + "]]";
		if (!existingLinks.includes(link)) {
			await vault.append(indexFile, link + "\n");
		}
	}
	for (const index of childFolderIndex) {
		const folderLink = "![[" + index + "_index.md]]";
		if (!existingLinks.includes(folderLink)) {
			await vault.append(indexFile, folderLink + "\n");
		}
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
