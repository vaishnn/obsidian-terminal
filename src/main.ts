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
      const leaf = workspace.getLeaf('split', 'horizontal');
      await leaf.setViewState({ type: VIEW_TYPE_TERMINAL, active: true });
      workspace.setActiveLeaf(leaf, { focus: true });
      this.terminalHidden = false;
      return;
    }

    const leaf = leaves[0];
    if (this.terminalHidden) {
      this.showTerminal(leaf);
    } else {
      this.hideTerminal(leaf);
    }
  }

  private leafEl(leaf: WorkspaceLeaf): HTMLElement {
    // Obsidian's workspace-leaf is the flex-child that controls panel sizing.
    // leaf.containerEl might be an inner element; walk up to find .workspace-leaf.
    return (leaf.containerEl.closest('.workspace-leaf') as HTMLElement) ?? leaf.containerEl;
  }

  private hideTerminal(leaf: WorkspaceLeaf) {
    const el = this.leafEl(leaf);
    // Use setProperty with 'important' so we override Obsidian's own inline sizing
    el.style.setProperty('flex', '0 0 0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    this.terminalHidden = true;

    const fallback = this.app.workspace.getMostRecentLeaf();
    if (fallback && fallback !== leaf) {
      this.app.workspace.setActiveLeaf(fallback, { focus: true });
    }
  }

  private showTerminal(leaf: WorkspaceLeaf) {
    const el = this.leafEl(leaf);
    el.style.removeProperty('flex');
    el.style.removeProperty('height');
    el.style.removeProperty('max-height');
    el.style.removeProperty('min-height');
    el.style.removeProperty('overflow');
    this.terminalHidden = false;

    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    (leaf.view as TerminalView).refit();
  }
}
