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
    const isHidden = leaf.containerEl.hasAttribute(HIDDEN_ATTR);

    if (isHidden) {
      this.showTerminal(leaf);
    } else if (workspace.activeLeaf === leaf) {
      this.hideTerminal(leaf);
    } else {
      workspace.revealLeaf(leaf);
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  private panelEl(leaf: WorkspaceLeaf): HTMLElement {
    // Walk up from the leaf's container to find the workspace-split or workspace-tabs
    // that is the direct child of the root split — that's the whole "panel" row.
    let el: HTMLElement = leaf.containerEl;
    while (el.parentElement) {
      const p = el.parentElement;
      if (p.classList.contains('mod-root') || p.classList.contains('workspace')) break;
      el = p;
    }
    return el;
  }

  private hideTerminal(leaf: WorkspaceLeaf) {
    const el = this.panelEl(leaf);

    // Move off-screen using fixed positioning — takes element out of layout flow
    // so no gap is left, but the DOM (and shell process) stays fully alive.
    el.style.cssText += ';position:fixed!important;transform:translateX(-99999px)!important;pointer-events:none!important;';
    leaf.containerEl.setAttribute(HIDDEN_ATTR, 'true');

    // Hide the resize handle that was between the notes area and this panel
    const prev = el.previousElementSibling as HTMLElement | null;
    if (prev?.classList.contains('workspace-leaf-resize-handle')) {
      prev.setAttribute(HANDLE_ATTR, 'true');
      prev.style.cssText += ';display:none!important;';
    }

    const fallback = this.app.workspace.getMostRecentLeaf();
    if (fallback && fallback !== leaf) {
      this.app.workspace.setActiveLeaf(fallback, { focus: true });
    }
  }

  private showTerminal(leaf: WorkspaceLeaf) {
    const el = this.panelEl(leaf);

    // Strip the three properties we added; leave everything else untouched
    el.style.position   = '';
    el.style.transform  = '';
    el.style.pointerEvents = '';
    leaf.containerEl.removeAttribute(HIDDEN_ATTR);

    const prev = el.previousElementSibling as HTMLElement | null;
    if (prev?.hasAttribute(HANDLE_ATTR)) {
      prev.style.display = '';
      prev.removeAttribute(HANDLE_ATTR);
    }

    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    (leaf.view as TerminalView).refit();
  }
}
