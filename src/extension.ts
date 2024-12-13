import * as vscode from "vscode";
import { platform } from "os";
import { Clipper, DarwinClipper, LinuxClipper, WindowsClipper } from "./clipper";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Code Clipper" is now active!');

  const os = platform();

  let clipper: Clipper;
  switch (os) {
    case "darwin":
      clipper = new DarwinClipper();
      break;
    case "win32":
      clipper = new WindowsClipper();
      break;
    case "linux":
      clipper = new LinuxClipper();
      break;
    default:
      throw new Error(`Your operating system is not supported`);
  }

  const clipCode = vscode.commands.registerCommand("code-clipper.clip-code", async () => {
    vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction");
    const originalHTML: string = await clipper.getClipboardHTML();

    const withLineNumberHTML: string = clipper.addLineNumberToHTML(originalHTML);

    const fileBaseName = await clipper.outputHTMLStringAsImage(context, withLineNumberHTML);
    clipper.putImageInClipboard(context, fileBaseName);
    console.log("The code clip is ready in your clipboard!!!");

    // vscode.log("image generated success")
  });
  context.subscriptions.push(clipCode);

  const clipCodeAsPlainText = vscode.commands.registerCommand(
    "code-clipper.clip-code-as-plain-text",
    async () => {
      vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction");
      const originalHTML: string = await clipper.getClipboardHTML();
      const originalText: string = await clipper.getClipboardText();

      const withLineNumberHTML: string = clipper.addLineNumberToHTML(originalHTML);
      const onlyLineNumberText: string = clipper.addLineNumberToText(originalText);

      clipper.setClipboard(context, withLineNumberHTML, onlyLineNumberText);
      console.log("The code is ready in your clipboard!!!");
    }
  );
  context.subscriptions.push(clipCodeAsPlainText);

  const clipCodeSaveImageOnly = vscode.commands.registerCommand(
    "code-clipper.clip-code-save-image-only",
    async () => {
      vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction");
      const originalHTML: string = await clipper.getClipboardHTML();

      const withLineNumberHTML: string = clipper.addLineNumberToHTML(originalHTML);

      const fileBaseName = await clipper.outputHTMLStringAsImage(context, withLineNumberHTML);
      const filePath = vscode.Uri.joinPath(context.globalStorageUri, `${fileBaseName}.png`);
      console.log(`The code clip is ready at "${filePath.fsPath}"!!!`);
    }
  );
  context.subscriptions.push(clipCodeSaveImageOnly);
}

// This method is called when your extension is deactivated
export function deactivate() {}
