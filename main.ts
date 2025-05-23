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

		console.log("Parent folder: " + parentFolder.path);
		console.log("handling deletion of " + file.name);
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
/**
 * Having the path of a file or folder, return the path of its parent folder
 * @param filePath 
 *
 * @returns the path of his parent folder
 */
function getParentFolderFromPath(filePath: string): string | null {
		const lastSlashIndex = filePath.lastIndexOf('/');
		if (lastSlashIndex === -1) {
			return null; // The file is in root
		}
		 return filePath.substring(0, lastSlashIndex);
}
/**
 * This function adds an index given an index file and links to other files, if some link is not found it will throw an error
 * 
 * @param indexFile 
 * @param childIndex 
 * @param childFolderIndex 
 * @param vault 
 */

async function addIndexToFile(
	indexFile: TFile,
	childIndex: any[],
	childFolderIndex: any[] ,
	vault: Vault,
) {
	const indexContent = await vault.read(indexFile);
	const existingLinks = indexContent.split("\n");

	for (const index of childIndex) {
		const linkName = index.slice(0,-3)
		const link = "[[" + linkName + "]]";
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

/**
 * Removes a link to a file from an index file.
 * 
 * This function checks if the index file contains a link to the specified file
 * and removes it if found. It handles both regular files and folders differently,
 * generating the appropriate link format for each type.
 * 
 * @param file - The file or folder to be removed from the index
 * @param indexFile - The index file from which to remove the link
 * @param vault - The Obsidian vault containing the files
 * @returns A Promise that resolves when the operation is complete
 * 
 * @throws Will throw an error if reading or modifying the vault files fails
 */
async function removeIndexFromFile(file : TAbstractFile, indexFile: TFile,vault: Vault){
	const indexContent = await vault.read(indexFile);
	const existingLinks = indexContent.split("\n");
	let link = "";
	if(file instanceof TFile){
		link = "[[" + file.name.slice(0,-3) + "]]";  // Fixed: removed 'let' keyword
	}
	else if(file instanceof TFolder){
		link = "[[" + file.name +"_index.md]]";  // Fixed: removed 'let' keyword
	}
	//remove the link from the index file
	if(file && indexFile){
		if(existingLinks.includes(link)){
			const newContent = existingLinks.filter(line => line !== link).join('\n');
			await vault.modify(indexFile, newContent);
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
