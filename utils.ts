
import { TFile,TFolder, Vault, TAbstractFile } from "obsidian";

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
		const baseName = index.endsWith('.md') ? index.slice(0,-3) : index;
		const link = "[[" + baseName + "]]";
		// Check both possible formats to avoid duplicates
        const linkWithExt = "[[" + baseName + ".md]]";

		if (!existingLinks.includes(link) && !existingLinks.includes(linkWithExt)) {
			await vault.append(indexFile, link + "\n");
		}
	}
	for (const index of childFolderIndex) {
		const folderLink = "![[" + index + "_index]]";
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
	let links: string[] = [];
	if(file instanceof TFile){
		const baseName = file.name.endsWith('.md') ? file.name.slice(0,-3) : file.name;

		//Remove all posibilities
		links.push("[[Untitled]]");
		links.push( "[[" + baseName + "]]");
		links.push( "[[" + baseName + ".md]]");
	}
	else if (file instanceof TFolder){
		links.push("![[" + file.name +"_index]]");  
	}

	//remove the link from the index file
	if(file && indexFile){
		let newContent = existingLinks.filter(line => {
            // Keep the line if it doesn't match any of the links to remove
            return !links.some(link => line.trim() === link);
        });
        
		const content = newContent.join('\n');
		await vault.modify(indexFile, content.endsWith('\n') || indexContent.endsWith('\n') ? content + '\n' : content);
	}
}

export {removeIndexFromFile, addIndexToFile, getParentFolderFromPath}