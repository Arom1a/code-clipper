import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import puppeteer from "puppeteer-core";

const execAsync = promisify(exec);

export function formattedLineNumber(num: number, max: number): string {
  return num.toString().padStart(max.toString().length, " ");
}

export class Clipper {
  async getClipboardHTML(): Promise<string> {
    throw new Error(`Method 'getClipboardHTML()' must be implemented`);
  }

  async getClipboardText(): Promise<string> {
    throw new Error(`Method 'getClipboardText()' must be implemented`);
  }

  async setClipboard(context: vscode.ExtensionContext, formattedHTML: string, plainText: string) {
    context; // to prevent 'no-unused-vars'
    formattedHTML; // to prevent 'no-unused-vars'
    plainText; // to prevent 'no-unused-vars'
    throw new Error(`Method 'setClipboard()' must be implemented`);
  }

  async putImageInClipboard(context: vscode.ExtensionContext, fileBaseName: string) {
    context; // to prevent 'no-unused-vars'
    fileBaseName; // to prevent 'no-unused-vars'
    throw new Error(`Method 'putImageInClipboard()' must be implemented`);
  }

  addLineNumberToHTML(originalHTML: string): string {
    let n = 1;
    let result = originalHTML
      .replaceAll("<div><span", '<div><span id="lineNum"> 0 </span><span')
      .replaceAll("<br>", '<span id="lineNum"> 0 </span><br>')
      .replace('<div style="', '<div style="width: fit-content; padding: 1em 2em 1em 0; ');
    // console.log(result);

    const maxLineNumber =
      result.match(new RegExp('<span id="lineNum"> 0 </span>', "g"))?.length ?? 0;
    // console.log(`maxLineNumber in ToHTML: ${maxLineNumber}`);
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

    return result;
  }

  addLineNumberToText(originalText: string): string {
    let result: string = "";

    const maxLineNumber = (originalText.match(new RegExp("\n", "g"))?.length ?? 0) + 1;
    // console.log(`maxLineNumber in ToText: ${maxLineNumber}`);

    originalText.split("\n").forEach((line, i) => {
      result += formattedLineNumber(i + 1, maxLineNumber).replaceAll(" ", "0") + ": " + line + "\n";
    });

    return result.trim();
  }

  async outputHTMLStringAsImage(
    context: vscode.ExtensionContext,
    HTMLString: string
  ): Promise<string> {
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
    // console.log(`baseName: ${baseName}`);
    const fileUri = vscode.Uri.joinPath(context.globalStorageUri, `${fileBaseName}.html`);

    try {
      const fileSystem = vscode.workspace.fs;

      await fileSystem.writeFile(fileUri, Buffer.from(HTMLString));
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
      await page.goto(`file://${fileUri.fsPath}`);
    } catch (err) {
      throw new Error(`Error when opening the file: ${err}`);
    }
    await page.waitForSelector(selector);

    const element = await page.$(selector);

    try {
      await element?.screenshot({
        path: vscode.Uri.joinPath(context.globalStorageUri, `${fileBaseName}.png`).fsPath,
      });
    } catch (err) {
      throw new Error(`Error when taking the screenshot: ${err}`);
    }
    await browser.close();

    return fileBaseName;
  }
}

export class DarwinClipper extends Clipper {
  async getClipboardHTML(): Promise<string> {
    try {
      const stdout = (
        await execAsync('osascript -e "get «class HTML» of (the clipboard as record)"')
      ).stdout.trim();
      const hexResult = stdout.substring(10, stdout.length - 1);
      // console.log(`hexResult: ${hexResult}`);
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

  async setClipboard(context: vscode.ExtensionContext, formattedHTML: string, plainText: string) {
    let hexHTML = "";
    for (let i = 0; i < formattedHTML.length; i++) {
      hexHTML += formattedHTML.charCodeAt(i).toString(16);
    }
    // console.log(hexHTML);

    const fileSystem = vscode.workspace.fs;
    let scriptUir: vscode.Uri = vscode.Uri.joinPath(context.globalStorageUri, "setClipboard.scpt");
    await fileSystem.writeFile(
      scriptUir,
      Buffer.from(
        `set the clipboard to {«class HTML»:«data HTML${hexHTML}», Unicode text:"${plainText.replaceAll(
          '"',
          '\\"'
        )}"}`
      )
    );

    try {
      await execAsync(`osascript '${scriptUir.fsPath}'`);
    } catch (err) {
      throw new Error(`Error setting the clipboard: ${err}`);
    }
  }

  async putImageInClipboard(context: vscode.ExtensionContext, fileBaseName: string) {
    try {
      execAsync(
        `osascript -e "set the clipboard to {«class PNGf»:«data PNGf$(xxd -ps "${
          vscode.Uri.joinPath(context.globalStorageUri, `${fileBaseName}.png`).fsPath
        }" | tr -d '\n')»}"`
      );
    } catch (err) {
      throw new Error(`Error putting image in clipboard: ${err}`);
    }
  }
}

export class LinuxClipper extends Clipper {}

export class WindowsClipper extends Clipper {}
