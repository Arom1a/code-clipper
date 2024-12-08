import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import puppeteer from "puppeteer-core";
import { exit } from "process";

const execAsync = promisify(exec);

async function getClipboardHTML(): Promise<string> {
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
    console.error(`Error fetching clipboard data: ${err}`);
    exit(1);
  }
}

async function getClipboardText(): Promise<string> {
  try {
    const stdout = (
      await execAsync('osascript -e "get «class utf8» of (the clipboard as record)"')
    ).stdout.trim();
    return stdout;
  } catch (err) {
    console.error(`Error fetching clipboard data: ${err}`);
    exit(1);
  }
  return "";
}

export function formattedLineNumber(num: number, max: number): string {
  return num.toString().padStart(max.toString().length, " ");
}

function addLineNumberToHTML(originalHTML: string): string {
  let n = 1;
  let result = originalHTML
    .replaceAll("<div><span", '<div><span id="lineNum"> 0 </span><span')
    .replaceAll("<br>", '<span id="lineNum"> 0 </span><br>')
    .replace('<div style="', '<div style="width: fit-content; padding: 1em 2em 1em 0; ');
  // console.log(result);

  const maxLineNumber = result.match(new RegExp('<span id="lineNum"> 0 </span>', "g"))?.length ?? 0;
  // console.log(`maxLineNumber in ToHTML: ${maxLineNumber}`);
  if (maxLineNumber === 0) {
    console.error("Incorrect HTML: No line number found");
    exit(1);
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

function addLineNumberToText(originalText: string): string {
  let result: string = "";

  const maxLineNumber = (originalText.match(new RegExp("\n", "g"))?.length ?? 0) + 1;
  // console.log(`maxLineNumber in ToText: ${maxLineNumber}`);

  originalText.split("\n").forEach((line, i) => {
    result += formattedLineNumber(i + 1, maxLineNumber).replaceAll(" ", "0") + ": " + line + "\n";
  });

  return result.trim();
}

async function setClipboard(
  context: vscode.ExtensionContext,
  formattedHTML: string,
  plainText: string
) {
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
    console.log("succeed setting the clipboard");
  } catch (err) {
    console.error(`Error setting the clipboard: ${err}`);
    exit(1);
  }
}

async function outputHTMLStringAsImage(context: vscode.ExtensionContext, HTMLString: string) {
  try {
    const fileSystem = vscode.workspace.fs;
    await fileSystem.writeFile(
      vscode.Uri.joinPath(context.globalStorageUri, `test.html`),
      Buffer.from(HTMLString)
    );
  } catch (err) {
    console.error(`Error when writing to file: ${err}`);
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
    await page.goto(`file://${vscode.Uri.joinPath(context.globalStorageUri, `test.html`).fsPath}`);
  } catch (err) {
    console.error(`Error when opening the file: ${err}`);
    return;
  }
  await page.waitForSelector(selector);

  const element = await page.$(selector);

  try {
    await element?.screenshot({
      path: vscode.Uri.joinPath(context.globalStorageUri, `test.png`).fsPath,
    });
  } catch (err) {
    console.error(`Error when taking the screenshot: ${err}`);
  }
  await browser.close();

  console.log("screenshot saved");
}

function putImageInClipboard() {}

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "copy-with-line-number-and-syntax-highlighting" is now active!'
  );

  const copyWithLineNumAndHighliting = vscode.commands.registerCommand(
    "copy-with-filename.copy-with-line-number-and-syntax-highlighting",
    async () => {
      vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction");
      const originalHTML: string = await getClipboardHTML();
      // console.log(`originalHTML: ${originalHTML}`);
      const originalText: string = await getClipboardText();
      // console.log(`originalText: ${originalText}`);

      const withLineNumberHTML: string = addLineNumberToHTML(originalHTML);
      // console.log(`withLineNumberHTML: ${withLineNumberHTML}`);
      const onlyLineNumberText: string = addLineNumberToText(originalText);
      // console.log(`onlyLineNumberText: ${onlyLineNumberText}`);

      setClipboard(context, withLineNumberHTML, onlyLineNumberText);

      outputHTMLStringAsImage(context, withLineNumberHTML);
    }
  );
  context.subscriptions.push(copyWithLineNumAndHighliting);
}

// This method is called when your extension is deactivated
export function deactivate() {}
