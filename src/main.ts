import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TerminalView, VIEW_TYPE_TERMINAL } from './terminal-view';

const HIDDEN_ATTR = 'data-ot-hidden';
const HANDLE_ATTR = 'data-ot-handle';

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
      return;
    }

    const leaf = leaves[0];
    const isHidden = !!this.findHiddenEl(leaf);

    if (isHidden) {
      this.showTerminal(leaf);
    } else if (workspace.activeLeaf === leaf) {
      this.hideTerminal(leaf);
    } else {
      workspace.revealLeaf(leaf);
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  // Find the element that was previously hidden (leaf or its parent split)
  private findHiddenEl(leaf: WorkspaceLeaf): HTMLElement | null {
    if (leaf.containerEl.hasAttribute(HIDDEN_ATTR)) return leaf.containerEl;
    const parent = leaf.containerEl.parentElement;
    if (parent?.hasAttribute(HIDDEN_ATTR)) return parent;
    return null;
  }

  private hideTerminal(leaf: WorkspaceLeaf) {
    // Walk up to the first workspace-split/tabs ancestor — that's the full panel chrome
    const parent = leaf.containerEl.parentElement;
    const target: HTMLElement = (parent && (
      parent.classList.contains('workspace-split') ||
      parent.classList.contains('workspace-tabs')
    )) ? parent : leaf.containerEl;

    target.style.display = 'none';
    target.setAttribute(HIDDEN_ATTR, 'true');

    // Hide the resize handle that sits just before this panel
    const prev = target.previousElementSibling as HTMLElement | null;
    if (prev?.classList.contains('workspace-leaf-resize-handle')) {
      prev.style.display = 'none';
      prev.setAttribute(HANDLE_ATTR, 'true');
    }

    const fallback = this.app.workspace.getMostRecentLeaf();
    if (fallback && fallback !== leaf) {
      this.app.workspace.setActiveLeaf(fallback, { focus: true });
    }
  }

  private showTerminal(leaf: WorkspaceLeaf) {
    const target = this.findHiddenEl(leaf);
    if (!target) return;

    target.style.display = '';
    target.removeAttribute(HIDDEN_ATTR);

    const prev = target.previousElementSibling as HTMLElement | null;
    if (prev?.hasAttribute(HANDLE_ATTR)) {
      prev.style.display = '';
      prev.removeAttribute(HANDLE_ATTR);
    }

    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    (leaf.view as TerminalView).refit();
  }
}
