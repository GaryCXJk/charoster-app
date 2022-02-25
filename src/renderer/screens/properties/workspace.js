import { debounce } from "throttle-debounce";
import Block from "../../components/base/Block";
import { storeWorkspace } from "../../components/panels/panelscreen";
import input from '../../components/forms/input';
import select from '../../components/forms/select';

export default async () => {
  const workspacePanel = new Block({
    className: 'tab-panel tab-panel-workspace',
  });

  const form = new Block({
    className: 'properties-form',
  });
  workspacePanel.append(form);

  const doUpdate = debounce(250, () => {
    storeWorkspace(workspace);
  });

  const titleInput = input({
    id: 'title',
    label: 'Title',
    value: workspace.title,
  });
  form.append(titleInput);
  titleInput.onInput(() => {
    workspace.title = titleInput.value;
    doUpdate();
  });

  const themeSelect = select({
    id: 'theme',
    label: 'Theme',
    value: workspace.theme,
    options: await window.designs.getDropdown(),
  });
  form.append(themeSelect);
  themeSelect.onInput(() => {
    workspace.theme = themeSelect.value;
    doUpdate();
  });

  window.globalEventHandler.on('sync-workspace', (newWorkspace) => {
    workspace = newWorkspace;

    titleInput.value = workspace.title;
    themeSelect.value = workspace.theme ?? '';
  });

  return workspacePanel;
}
