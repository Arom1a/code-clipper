import * as vscode from "vscode";
import { platform } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { Clipper, DarwinClipper, LinuxClipper, WindowsClipper } from "./clipper";

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Code Clipper" is now active!');

  const OS = platform();

  const config = vscode.workspace.getConfiguration("code-clipper");
  const openDirectoryAfterClipping: boolean = config.get("openDirectoryAfterClipping") ?? true;

  let clipper: Clipper;
  switch (OS) {
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
    const filePath = await clipper.outputHTMLStringAsImage(context, withLineNumberHTML);
    if (openDirectoryAfterClipping) {
      switch (OS) {
        case "darwin":
          await execAsync(`open -R "${filePath.fsPath}"`);
          break;
        case "win32":
          break;
        case "linux":
          break;
        default:
          await vscode.window.showErrorMessage(
            "Can not open the file explorer on your OS. " +
              "Please open it yourself. " +
              "(disable this message by setting openDirectoryAfterClipping to false)"
          );
          throw new Error("Can not open the file explorer");
      }
    }
    await vscode.window.showInformationMessage(`The code clip is ready at "${filePath.fsPath}"!`);
  });
  context.subscriptions.push(clipCode);

  const clipCodeAsPlainText = vscode.commands.registerCommand(
    "code-clipper.clip-code-as-plain-text",
    async () => {
      vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction");
      const originalText: string = await clipper.getClipboardText();
      const onlyLineNumberText: string = clipper.addLineNumberToText(originalText);
      clipper.setClipboard(onlyLineNumberText);
      await vscode.window.showInformationMessage("The code is ready in your clipboard!");
    }
  );
  context.subscriptions.push(clipCodeAsPlainText);
}

// This method is called when your extension is deactivated
export function deactivate() {}
