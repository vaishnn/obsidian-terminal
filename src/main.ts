import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TerminalView, VIEW_TYPE_TERMINAL } from './terminal-view';

export default class IntegratedTerminalPlugin extends Plugin {
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
    } else {
      leaves[0].detach();
    }
  }
}
