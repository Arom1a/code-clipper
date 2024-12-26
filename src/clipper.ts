import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import puppeteer from "puppeteer-core";

const execAsync = promisify(exec);

const config = vscode.workspace.getConfiguration("code-clipper");
const puppeteerPath = config.get("puppeteerPath");
const clipSavingDirectory = config.get("clipSavingDirectory");

export function formattedLineNumber(num: number, max: number): string {
  return num.toString().padStart(max.toString().length, " ");
}

export class Clipper {
  async revealInFileExplorer(filePath: vscode.Uri) {
    throw new Error(`Method 'revealInFileExplorer()' must be implemented`);
  }

  async getClipboardHTML(): Promise<string> {
    throw new Error(`Method 'getClipboardHTML()' must be implemented`);
  }

  async getClipboardText(): Promise<string> {
    throw new Error(`Method 'getClipboardText()' must be implemented`);
  }

  async setClipboard(plainText: string) {
    await vscode.env.clipboard.writeText(plainText);
  }

  addLineNumberToHTML(originalHTML: string): string {
    let n = 1;
    let result = originalHTML
      .replaceAll("<div><span", '<div><span id="lineNum"> 0 </span><span')
      .replaceAll("<br>", '<span id="lineNum"> 0 </span><br>')
      .replace('<div style="', '<div style="width: fit-content; padding: 1em 2em 1em 0; ');

    const maxLineNumber =
      result.match(new RegExp('<span id="lineNum"> 0 </span>', "g"))?.length ?? 0;
    if (maxLineNumber === 0) {
      throw new Error("Incorrect HTML: No line number found");
    }

    while (result.includes('<span id="lineNum"> 0 </span>')) {
      result = result.replace(
        '<span id="lineNum"> 0 </span>',
        `<span id="lineNum" style="opacity: 0.5"> ${formattedLineNumber(n, maxLineNumber)} </span>`
      );
      n++;
    }

    return result.trim();
  }

  addLineNumberToText(originalText: string): string {
    let result: string = "";

    const maxLineNumber = (originalText.match(new RegExp("\n", "g"))?.length ?? 0) + 1;

    originalText.split("\n").forEach((line, i) => {
      result += formattedLineNumber(i + 1, maxLineNumber).replaceAll(" ", "0") + ": " + line + "\n";
    });

    return result.trim();
  }

  async outputHTMLStringAsImage(
    context: vscode.ExtensionContext,
    HTMLString: string
  ): Promise<vscode.Uri> {
    let date = new Date()
      .toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "numeric" })
      .split("/");
    let fileBaseName =
      date[2] +
      "-" +
      date[0] +
      "-" +
      date[1] +
      "_" +
      new Date()
        .toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replaceAll(":", "-");
    const HTMLUri = vscode.Uri.joinPath(context.globalStorageUri, `${fileBaseName}.html`);

    const fileSystem = vscode.workspace.fs;
    try {
      await fileSystem.writeFile(HTMLUri, Buffer.from(HTMLString));
    } catch (err) {
      throw new Error(`Error when writing to file: ${err}`);
    }

    const browser = await puppeteer.launch({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      args: ["--headless"],
    });
    const page = await browser.newPage();
    // set th screen to be high resolution to get better screenshots
    await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });
    const selector = "body > div:nth-child(1)";
    try {
      await page.goto(`file://${HTMLUri.fsPath}`);
    } catch (err) {
      throw new Error(`Error when opening the file: ${err}`);
    }
    await page.waitForSelector(selector);

    let imageUri = clipSavingDirectory
      ? vscode.Uri.parse(clipSavingDirectory + `${fileBaseName}.png`)
      : vscode.Uri.joinPath(context.globalStorageUri, `clips/${fileBaseName}.png`);
    try {
      await fileSystem.stat(vscode.Uri.joinPath(imageUri, "../"));
    } catch {
      fileSystem.createDirectory(vscode.Uri.joinPath(imageUri, "../"));
    }

    const element = await page.$(selector);
    try {
      await element?.screenshot({
        path: imageUri.fsPath,
      });
    } catch (err) {
      throw new Error(`Error when taking the screenshot: ${err}`);
    }
    await browser.close();

    return imageUri;
  }
}

export class DarwinClipper extends Clipper {
  async revealInFileExplorer(filePath: vscode.Uri): Promise<void> {
    await execAsync(`open -R "${filePath.fsPath}"`);
  }

  async getClipboardHTML(): Promise<string> {
    try {
      const stdout = (
        await execAsync('osascript -e "get «class HTML» of (the clipboard as record)"')
      ).stdout.trim();
      const hexResult = stdout.substring(10, stdout.length - 1);
      const buffer = Buffer.from(hexResult, "hex");
      const originalResult = buffer.toString();
      return originalResult;
    } catch (err) {
      throw new Error(`Error fetching clipboard data: ${err}`);
    }
  }

  async getClipboardText(): Promise<string> {
    try {
      const stdout = (
        await execAsync('osascript -e "get «class utf8» of (the clipboard as record)"')
      ).stdout.trim();
      return stdout;
    } catch (err) {
      throw new Error(`Error fetching clipboard data: ${err}`);
    }
  }
}

export class LinuxClipper extends Clipper {}

export class WindowsClipper extends Clipper {
  async revealInFileExplorer(filePath: vscode.Uri): Promise<void> {
    // IDK why this returns an exit code of 1
    // Just catch it for convenience
    try {
      await execAsync(`explorer.exe /select,"${filePath.fsPath}"`);
    } catch {}
  }

  async getClipboardHTML(): Promise<string> {
    try {
      const stdout = (
        await execAsync(
          'powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; $clipboard = [System.Windows.Forms.Clipboard]::GetDataObject(); if ($clipboard.GetFormats() -contains \\"HTML Format\\") { $htmlData = $clipboard.GetData(\\"HTML Format\\"); Write-Output $htmlData; } else { Write-Output \\"-1\\" };"'
        )
      ).stdout.trim();
      if (stdout === "-1") {
        throw new Error(`Error fetching clipboard data: no HTML date founded in the clipboard`);
      }
      const start: number = stdout.search("<!--StartFragment-->") + "<!--StartFragment-->".length;
      const end: number = stdout.search("<!--EndFragment-->");
      const result = stdout.slice(start, end);
      return result;
    } catch (err) {
      throw new Error(`Error fetching clipboard data: ${err}`);
    }
  }

  async getClipboardText(): Promise<string> {
    try {
      const stdout = (await execAsync('powershell.exe -Command "get-Clipboard"')).stdout.trim();
      return stdout;
    } catch (err) {
      throw new Error(`Error fetching clipboard data: ${err}`);
    }
  }
}
