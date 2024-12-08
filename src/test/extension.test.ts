import * as assert from "assert";

import * as vscode from "vscode";
import * as myExtension from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("formattedLineNumber test", () => {
    assert.strictEqual(myExtension.formattedLineNumber(1, 1), "1");
    assert.strictEqual(myExtension.formattedLineNumber(1, 10), " 1");
    assert.strictEqual(myExtension.formattedLineNumber(1, 38), " 1");
    assert.strictEqual(myExtension.formattedLineNumber(12, 38), "12");
    assert.strictEqual(myExtension.formattedLineNumber(1, 99), " 1");
    assert.strictEqual(myExtension.formattedLineNumber(34, 99), "34");
    assert.strictEqual(myExtension.formattedLineNumber(1, 100), "  1");
    assert.strictEqual(myExtension.formattedLineNumber(43, 100), " 43");
    assert.strictEqual(myExtension.formattedLineNumber(1, 542), "  1");
    assert.strictEqual(myExtension.formattedLineNumber(422, 542), "422");
    assert.strictEqual(myExtension.formattedLineNumber(1, 999), "  1");
    assert.strictEqual(myExtension.formattedLineNumber(60, 999), " 60");
    assert.strictEqual(myExtension.formattedLineNumber(547, 999), "547");
  });
});
