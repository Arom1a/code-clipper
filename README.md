# Code Clipper

Clip your code with your IDE's theme and line numbers!

## Features

- No Internet needed
- Use your VSCode's theme and syntax highlighting
- Mark line numbers
- Copy the screenshot to your clipboard
- Copy the plain text with line numbers to your clipboard

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

puppeteer is required

installation:

<!-- Special for Linux:
`xclip` (maybe) should be installed -->

## Usage

Shift + Command + p to open the command palate.

Then,

- use "Clip Code" to generate the code clip image and open the directory (behavior can be adjusted in settings)
- use "Clip Code as Plain Text" to copy plain-text code with line number to clipboard

Example:

```rust
fn main() {
    let x = 1;
}
```

Using "Clip Code":

Using "Clip Code as Plain Text":

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- puppeteer path: must have
  common for MacOS: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  common for Windows:
  common for Linux:
- openDirectoryAfterClipping: True (default) / False

may config output png or webp or jpg

## How is This Achieved?

VSCode's buitlin command `Copy With Syntax Highlighting`
modify the html
use puppeteer to generate a picture

## Release Notes

...
