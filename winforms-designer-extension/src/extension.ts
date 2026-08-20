import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';

const CONFIG_SECTION = 'winformsDesigner';

/** How the designer gets started on this platform. */
interface Launcher {
    cmd: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    /** True when we go through Wine, i.e. everywhere except Windows. */
    usesWine: boolean;
}

const isWindows = process.platform === 'win32';

/** Wine locations we check when 'winformsDesigner.winePath' is not set. */
function wineCandidates(): string[] {
    const home = process.env.HOME ?? '';
    if (process.platform === 'darwin') {
        return [
            '/opt/homebrew/bin/wine',
            '/usr/local/bin/wine',
            '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',
            '/Applications/Wine Staging.app/Contents/Resources/wine/bin/wine',
            '/Applications/Wine Devel.app/Contents/Resources/wine/bin/wine',
            '/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine',
            path.join(home, 'Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin/wine')
        ];
    }
    return [
        '/usr/bin/wine',
        '/usr/local/bin/wine',
        '/opt/wine-stable/bin/wine',
        '/opt/wine-staging/bin/wine'
    ];
}

/** Look up a bare executable name on PATH, without shelling out. */
function findOnPath(name: string): string | undefined {
    const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
    for (const dir of dirs) {
        const candidate = path.join(dir, name);
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        } catch {
            // unreadable PATH entry, keep looking
        }
    }
    return undefined;
}

function resolveWine(): string | undefined {
    const configured = vscode.workspace
        .getConfiguration(CONFIG_SECTION)
        .get<string>('winePath', '')
        .trim();

    if (configured) {
        // An explicit setting is authoritative: if it is wrong, say so rather than
        // silently falling back to some other Wine.
        if (configured.includes(path.sep) || configured.includes('/')) {
            return fs.existsSync(configured) ? configured : undefined;
        }
        return findOnPath(configured);
    }

    for (const name of ['wine64', 'wine']) {
        const found = findOnPath(name);
        if (found) {
            return found;
        }
    }
    return wineCandidates().find(candidate => fs.existsSync(candidate));
}

function wineEnv(): NodeJS.ProcessEnv {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const env: NodeJS.ProcessEnv = { ...process.env };

    const prefix = config.get<string>('winePrefix', '').trim();
    if (prefix) {
        env.WINEPREFIX = prefix;
    }
    // Wine is extremely chatty on stderr; keep it quiet unless asked otherwise.
    const debug = config.get<string>('wineDebug', '-all').trim();
    if (debug) {
        env.WINEDEBUG = debug;
    }
    return env;
}

/**
 * Translate a host path into one the designer will see from inside Wine.
 * Prefers `winepath -w`; falls back to the default Z: drive mapping, which is
 * what Wine maps to '/' in a stock prefix.
 */
function toWinePath(wine: string, hostPath: string, env: NodeJS.ProcessEnv): string {
    try {
        const result = child_process.execFileSync(wine, ['winepath', '-w', hostPath], {
            env,
            encoding: 'utf8',
            // A cold prefix has to be created first, which is slow.
            timeout: 120_000,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const converted = result.trim();
        if (converted) {
            return converted;
        }
    } catch (error) {
        console.warn('winepath failed, falling back to Z: mapping:', error);
    }
    return 'Z:' + hostPath.replace(/\//g, '\\');
}

/** Wine writes fixme/err/warn chatter to stderr even on success. */
function stripWineNoise(output: string): string {
    return output
        .split('\n')
        .filter(line => !/^\s*(fixme|err|warn|trace|wine):/i.test(line))
        .join('\n')
        .trim();
}

function installHint(): string {
    switch (process.platform) {
        case 'darwin':
            return 'Install Wine (for example `brew install --cask --no-quarantine wine-stable`, or CrossOver) ' +
                'or set `winformsDesigner.winePath`.';
        case 'linux':
            return 'Install Wine (for example `sudo apt install wine64` or your distro equivalent) ' +
                'or set `winformsDesigner.winePath`.';
        default:
            return 'Set `winformsDesigner.winePath` to your Wine binary.';
    }
}

function buildLauncher(extensionPath: string, filePath: string): Launcher | undefined {
    const designerExe = path.join(extensionPath, 'bin', 'SWD4CS.exe');
    const designerDll = path.join(extensionPath, 'bin', 'SWD4CS.dll');

    if (isWindows) {
        if (fs.existsSync(designerExe)) {
            return { cmd: designerExe, args: [filePath], env: { ...process.env }, usesWine: false };
        }
        if (fs.existsSync(designerDll)) {
            return { cmd: 'dotnet', args: [designerDll, filePath], env: { ...process.env }, usesWine: false };
        }
        vscode.window.showErrorMessage(`Designer executable not found at: ${designerExe}`);
        return undefined;
    }

    // macOS / Linux: the designer is a Windows binary, so it runs through Wine.
    // The `dotnet SWD4CS.dll` path is deliberately not offered here - that dll
    // targets a Windows TFM and the host dotnet cannot load it.
    if (!fs.existsSync(designerExe)) {
        vscode.window.showErrorMessage(
            `Designer executable not found at: ${designerExe}. On ${process.platform} it must be a ` +
            'self-contained Windows build: `dotnet publish -c Release -r win-x64 --self-contained true`.'
        );
        return undefined;
    }

    const wine = resolveWine();
    if (!wine) {
        vscode.window.showErrorMessage(`Wine was not found, so the designer cannot be started. ${installHint()}`);
        return undefined;
    }

    const env = wineEnv();
    return {
        cmd: wine,
        args: [designerExe, toWinePath(wine, filePath, env)],
        env,
        usesWine: true
    };
}

export function activate(context: vscode.ExtensionContext) {
    console.log('WinForms Designer extension is now active!');

    let disposable = vscode.commands.registerCommand('winforms.openDesigner', (uri: vscode.Uri) => {
        if (!uri && vscode.window.activeTextEditor) {
            uri = vscode.window.activeTextEditor.document.uri;
        }

        if (!uri) {
            vscode.window.showErrorMessage('No file selected to open in Designer.');
            return;
        }

        const filePath = uri.fsPath;

        // Check if it's a .cs file
        if (!filePath.endsWith('.cs')) {
            vscode.window.showErrorMessage('Please select a C# (.cs) file.');
            return;
        }

        const launcher = buildLauncher(context.extensionPath, filePath);
        if (!launcher) {
            return;
        }

        vscode.window.showInformationMessage(
            `Opening Designer for: ${path.basename(filePath)}${launcher.usesWine ? ' (via Wine)' : ''}...`
        );

        try {
            const child = child_process.spawn(launcher.cmd, launcher.args, {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: launcher.env
            });

            let errorOutput = '';

            child.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('error', (error) => {
                vscode.window.showErrorMessage(`Failed to launch designer: ${error.message}`);
                console.error('Designer launch error:', error);
            });

            child.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    const reported = launcher.usesWine ? stripWineNoise(errorOutput) : errorOutput;
                    vscode.window.showErrorMessage(
                        `Designer exited with code ${code}. ${reported ? 'Error: ' + reported : ''}`
                    );
                    console.error('Designer error output:', errorOutput);
                }
            });

            // Give it a moment to start, then detach
            setTimeout(() => {
                if (!child.killed) {
                    child.unref();
                }
            }, 1000);

        } catch (error) {
            vscode.window.showErrorMessage(`Error spawning designer: ${error}`);
            console.error('Spawn error:', error);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
