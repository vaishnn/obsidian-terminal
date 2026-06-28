import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import * as os from 'os';

export const VIEW_TYPE_TERMINAL = 'integrated-terminal';

// Read an Obsidian CSS variable and return its resolved value (rgb/hex string)
function cssVar(prop: string, fallback: string): string {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;visibility:hidden;background:var(${prop})`;
  document.body.appendChild(el);
  const val = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
  // If the variable resolves, val is an rgb() string; otherwise it's 'rgba(0,0,0,0)'
  return val && val !== 'rgba(0, 0, 0, 0)' ? val : fallback;
}

function cssTextVar(prop: string, fallback: string): string {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;visibility:hidden;color:var(${prop})`;
  document.body.appendChild(el);
  const val = getComputedStyle(el).color;
  document.body.removeChild(el);
  return val && val !== 'rgba(0, 0, 0, 0)' ? val : fallback;
}

export class TerminalView extends ItemView {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private pty: any;
  private resizeObserver: ResizeObserver;

  constructor(leaf: WorkspaceLeaf, private pluginDir: string) {
    super(leaf);
  }

  getViewType() { return VIEW_TYPE_TERMINAL; }
  getDisplayText() { return 'Terminal'; }
  getIcon() { return 'terminal-square'; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass('ot-container');

    const termEl = container.createDiv({ cls: 'ot-inner' });

    // Use Obsidian theme colors so the terminal matches the current theme
    const bg  = cssVar('--background-primary',    '#1e1e1e');
    const fg  = cssTextVar('--text-normal',        '#d4d4d4');
    const sel = cssVar('--text-selection',         '#264f78');
    const cur = cssTextVar('--text-accent',        '#569cd6');

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.2,
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: bg,
        foreground: fg,
        cursor: cur,
        selectionBackground: sel,
      },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.open(termEl);

    requestAnimationFrame(() => this.fitAddon.fit());

    this.spawnShell();

    this.resizeObserver = new ResizeObserver(() => this.fitAddon?.fit());
    this.resizeObserver.observe(container);
  }

  private spawnShell() {
    try {
      const ptyPath = `${this.pluginDir}/node_modules/node-pty`;
      const nodePty = (window as any).require(ptyPath);
      const shell = process.env.SHELL || '/bin/zsh';

      this.pty = nodePty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: this.terminal.cols,
        rows: this.terminal.rows,
        cwd: os.homedir(),
        env: { ...(process.env as Record<string, string>), TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      });

      this.pty.onData((data: string) => this.terminal.write(data));
      this.terminal.onData((data: string) => this.pty?.write(data));
      this.terminal.onResize(({ cols, rows }) => this.pty?.resize(cols, rows));
      this.pty.onExit(({ exitCode }: { exitCode: number }) => {
        this.terminal.writeln(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m`);
      });
    } catch (err) {
      this.terminal.writeln('\x1b[31mFailed to load node-pty.\x1b[0m');
      this.terminal.writeln('\x1b[33mRun install.sh to build the plugin, then reload Obsidian.\x1b[0m');
      console.error('[Integrated Terminal] node-pty load error:', err);
    }
  }

  refit() {
    requestAnimationFrame(() => this.fitAddon?.fit());
  }

  async onClose() {
    this.resizeObserver?.disconnect();
    this.pty?.kill();
    this.terminal?.dispose();
  }
}
