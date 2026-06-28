import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TerminalView, VIEW_TYPE_TERMINAL } from './terminal-view';

export default class IntegratedTerminalPlugin extends Plugin {
  private terminalHidden = false;

  async onload() {
    const adapter = this.app.vault.adapter as any;
    const pluginDir: string = `${adapter.basePath}/.obsidian/plugins/${this.manifest.id}`;
    this.registerView(VIEW_TYPE_TERMINAL, (leaf) => new TerminalView(leaf, pluginDir));

    this.addCommand({
      id: 'toggle-terminal',
      name: 'Toggle terminal panel',
      hotkeys: [{ modifiers: ['Mod'], key: 'j' }],
      callback: () => this.toggleTerminal(),
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TERMINAL);
  }

  async toggleTerminal() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);

    if (leaves.length === 0) {
      // First open — create the leaf
      const leaf = workspace.getLeaf('split', 'horizontal');
      await leaf.setViewState({ type: VIEW_TYPE_TERMINAL, active: true });
      workspace.setActiveLeaf(leaf, { focus: true });
      this.terminalHidden = false;
      return;
    }

    const leaf = leaves[0];

    if (this.terminalHidden) {
      this.showTerminal(leaf);
    } else if (workspace.activeLeaf === leaf) {
      // Focused and visible → collapse
      this.hideTerminal(leaf);
    } else {
      // Visible but not focused → just focus it
      workspace.revealLeaf(leaf);
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  private hideTerminal(leaf: WorkspaceLeaf) {
    const el = leaf.containerEl;
    el.style.flex       = '0 0 0';
    el.style.minHeight  = '0';
    el.style.overflow   = 'hidden';
    this.terminalHidden = true;

    const fallback = this.app.workspace.getMostRecentLeaf();
    if (fallback && fallback !== leaf) {
      this.app.workspace.setActiveLeaf(fallback, { focus: true });
    }
  }

  private showTerminal(leaf: WorkspaceLeaf) {
    const el = leaf.containerEl;
    el.style.flex      = '';
    el.style.minHeight = '';
    el.style.overflow  = '';
    this.terminalHidden = false;

    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    (leaf.view as TerminalView).refit();
  }
}
