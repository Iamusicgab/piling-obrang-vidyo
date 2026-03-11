import fs from "fs";
import path from "path";

// ⚠️ IMPORTANT: Change this to the folder where you save your Markdown files
const MD_DIR = "./src/pages/pov21/films";
const OUT_DIR = "./public/img";

if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadImages() {
	const files = fs.readdirSync(MD_DIR).filter((f) => f.endsWith(".md"));
	const uniqueIds = new Set();

	for (const file of files) {
		const content = fs.readFileSync(path.join(MD_DIR, file), "utf-8");
		const matches = content.matchAll(/(?:\/d\/|id=)([a-zA-Z0-9_-]+)/g);
		for (const match of matches) {
			uniqueIds.add(match[1]);
		}
	}

	console.log(`Found ${uniqueIds.size} unique images to download.`);

	let count = 1;
	for (const id of uniqueIds) {
		const destPath = path.join(OUT_DIR, `${id}.jpg`);

		// Skip already downloaded files so you don't redownload the successful ones!
		if (fs.existsSync(destPath)) {
			console.log(
				`[${count}/${uniqueIds.size}] ${id}.jpg already exists, skipping.`,
			);
			count++;
			continue;
		}

		console.log(`[${count}/${uniqueIds.size}] Downloading ${id}...`);

		let success = false;

		// ATTEMPT 1: Google Drive Thumbnail API (Optimized 1000px)
		try {
			const response = await fetch(
				`https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
			);
			if (response.ok) {
				const buffer = await response.arrayBuffer();
				fs.writeFileSync(destPath, Buffer.from(buffer));
				success = true;
			}
		} catch (err) {
			// Silently catch and move to attempt 2
		}

		// ATTEMPT 2: Google Drive Direct File Download API (Raw file)
		if (!success) {
			console.log(
				`  Thumbnail API failed for ${id}, trying direct download...`,
			);
			try {
				const fallbackResponse = await fetch(
					`https://drive.google.com/uc?export=download&id=${id}`,
				);
				if (fallbackResponse.ok) {
					const buffer = await fallbackResponse.arrayBuffer();
					fs.writeFileSync(destPath, Buffer.from(buffer));
					success = true;
				} else {
					throw new Error(`HTTP ${fallbackResponse.status}`);
				}
			} catch (err) {
				console.error(
					`  ❌ Failed to download ${id} entirely. It might be private or deleted. Error: ${err.message}`,
				);
			}
		}

		if (success) {
			console.log(`  ✅ Success!`);
		}

		await sleep(2500);
		count++;
	}
	console.log("All done!");
}

downloadImages();
