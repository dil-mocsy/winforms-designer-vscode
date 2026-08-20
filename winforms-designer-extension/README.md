# Modern WinForms Designer for VS Code

A powerful Windows Forms visual designer extension for Visual Studio Code. Design your WinForms UI with drag-and-drop ease, right from VS Code!

![Visual Studio Code](https://img.shields.io/badge/VS%20Code-1.80%2B-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![.NET](https://img.shields.io/badge/.NET-10.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🎨 Visual Designer**: Drag and drop controls just like in Visual Studio
- **🔄 Two-way Synchronization**: Changes in the designer automatically update your `.Designer.cs` code
- **🌙 Modern Dark UI**: Seamlessly matches VS Code's dark theme
- **⚙️ Property Grid**: Edit control properties with an intuitive interface
- **🧰 Toolbox**: Quick access to all common Windows Forms controls
- **🚀 Context Menu Integration**: Right-click any `.cs` file to open the designer

## 📦 Installation

### Option 1: Install from VSIX (Recommended)

1. Download the latest `.vsix` file from the [Releases](../../releases) page
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the **`...`** menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file
6. Reload VS Code when prompted

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/winforms-designer-vscode.git
cd winforms-designer-vscode

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension (optional)
npx vsce package
```

## 🚀 Usage

1. Open any C# Windows Forms file (`.cs`) in VS Code
2. **Right-click** the file in:
   - **Explorer** sidebar, or
   - **Editor tab** at the top
3. Select **"Open WinForms Designer"**
   
   *Alternatively*, use the Command Palette (`Ctrl+Shift+P`) and run:
   ```
   WinForms: Open WinForms Designer
   ```

4. The visual designer will launch in a separate window
5. Design your form visually—changes sync back to your `.Designer.cs` file!

## 📋 Requirements

- **VS Code**: Version 1.80.0 or higher
- **Windows**: .NET 10 Desktop Runtime (or use a self-contained build, which needs nothing)
- **macOS / Linux**: [Wine](#-macos-and-linux) plus a self-contained designer build

## 🍷 macOS and Linux

WinForms is a wrapper over Win32, so the designer itself is a Windows binary and cannot be built
natively for macOS or Linux. The extension therefore runs it through **Wine**, while your source
files stay where they are — the same working tree VS Code has open, no VM and no file sharing.

**1. Install Wine**

```bash
# macOS
brew install --cask --no-quarantine wine-stable   # or CrossOver, or Whisky

# Debian / Ubuntu
sudo apt install wine64
```

**2. Build the designer as a self-contained Windows binary**

A self-contained build bundles the .NET runtime, so nothing has to be installed *inside* the Wine
prefix — which is the most fragile step otherwise. This works from macOS and Linux:

```bash
cd SWD4CS
dotnet publish -c Release -r win-x64 --self-contained true
```

The build copies its output into `winforms-designer-extension/bin/` automatically.

**3. Open a form.** Right-click any `.cs` file → **Open WinForms Designer**. The notification
reads "(via Wine)" when the Wine path is being used.

### Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `winformsDesigner.winePath` | *(empty)* | Wine binary to use. Empty auto-detects `wine64`/`wine` on `PATH`, then the standard Wine, CrossOver and Whisky locations. |
| `winformsDesigner.winePrefix` | *(empty)* | `WINEPREFIX` (bottle) to run in. Empty uses Wine's default, normally `~/.wine`. |
| `winformsDesigner.wineDebug` | `-all` | `WINEDEBUG` value. Defaults to silencing Wine's `fixme:` chatter; set `+relay` to diagnose a launch failure. |

All three are ignored on Windows, where the designer is launched directly.

### Notes and caveats

- File paths are translated with `winepath -w`, falling back to Wine's default `Z:` drive mapping.
  The **first** launch in a fresh prefix is slow, because Wine has to create the prefix.
- Font metrics under Wine are not identical to Windows, so control sizes on the design surface can
  differ slightly from a real Windows run. Verify layouts on Windows before shipping.
- On Apple Silicon the designer runs as x86-64 under Rosetta. Apple supports Rosetta as a
  general-purpose translator only through macOS 27; longer term, use a Wine build with x86-on-ARM
  emulation (for example CrossOver's FEX-based support).

## 🛠️ Development

### Project Structure

```
winforms-designer-extension/
├── src/
│   └── extension.ts       # VS Code extension entry point
├── bin/
│   └── SWD4CS.exe        # Bundled WinForms designer executable
├── out/                   # Compiled TypeScript output
├── package.json          # Extension manifest
└── tsconfig.json         # TypeScript configuration
```

### Running in Development Mode

1. Open the project folder in VS Code
2. Press **F5** to launch the Extension Development Host
3. Test the extension in the new window

### Building the VSIX Package

```bash
npm install -g @vscode/vsce
vsce package
```

## 🙏 Credits

This extension wraps the excellent [SWD4CS](https://github.com/hry2566/SWD4CS) designer by **hry2566**, making it accessible directly from VS Code.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🐛 Issues & Contributions

Found a bug or have a feature request? Please [open an issue](../../issues)!

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

**Enjoy designing WinForms in VS Code!** 🎉
