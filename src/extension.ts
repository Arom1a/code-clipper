// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function getClipboardHTML(): Promise<string> {
  try {
    const stdout = (
      await execAsync("osascript -e 'get «class HTML» of (the clipboard as record)'")
    ).stdout.trim();
    const hexResult = stdout.substring(10, stdout.length - 1);
    console.log(`hexResult: ${hexResult}`);
    const buffer = Buffer.from(hexResult, "hex");
    const originalResult = buffer.toString();
    return originalResult;
  } catch (error) {
    console.error(`Error fetching clipboard data: ${error}`);
    return "";
  }
}

async function getClipboardText(): Promise<string> {
  return "";
}

function addLineNumberToHTML(originalHTML: string): string {
  let n = 1;
  let result = originalHTML
    .replaceAll("<div><span", '<div><span id="lineNum"> 0 </span><span')
    .replaceAll("<br>", '<span id="lineNum"> 0 </span><br>');
  // console.log(process);

  while (result.includes('<span id="lineNum"> 0 </span>')) {
    result = result.replace(
      '<span id="lineNum"> 0 </span>',
      `<span id="lineNum" style="opacity: 0.5"> ${
        n < 10 ? ` ${n.toString()}` : n.toString()
      } </span>`
    );
    n++;
  }

  return result;
}

function addLineNumberToText(originalText: string): string {
  return "";
}

async function setClipboard(formattedHTML: string, plainText: string) {
  let hexHTML = "";
  for (let i = 0; i < formattedHTML.length; i++) {
    hexHTML += formattedHTML.charCodeAt(i).toString(16);
  }
  console.log(hexHTML);

  try {
    await execAsync(`osascript -e 'set the clipboard to {«class HTML»:«data HTML${hexHTML}»}'`);
    console.log("succeed");
  } catch (error) {
    console.error(`Error setting the clipboard: ${error}`);
    return;
  }
}

function outputAsPng(context: vscode.ExtensionContext) {
  console.log(context.storageUri);
}

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
      console.log(`withLineNumberHTML: ${withLineNumberHTML}`);
      const onlyLineNumberText: string = addLineNumberToText(originalText);
      console.log(`onlyLineNumberText: ${onlyLineNumberText}`);

      setClipboard(withLineNumberHTML, onlyLineNumberText);

      outputAsPng(context);
    }
  );
  context.subscriptions.push(copyWithLineNumAndHighliting)
}

// This method is called when your extension is deactivated
export function deactivate() {}
