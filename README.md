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

- use "Clip Code" to copy the clipped image to clipboard
- use "Clip Code as Plain Text" to copy plain code with line number to clipboard
- use "Clip Code Save Image Only" to save the clipped image and open the directory (you can set to open or not in settings)

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

- `myExtension.enable`: Enable/disable this extension.
- `myExtension.thing`: Set to `blah` to do something.

may config output png or webp or jpg

## How is This Achieved?

VSCode's buitlin command `Copy With Syntax Highlighting`
modify the html
use puppeteer to generate a picture

## Release Notes

...
