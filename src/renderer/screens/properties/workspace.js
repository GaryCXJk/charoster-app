import Block from "../../components/base/Block";
import input from '../../components/forms/input';
import select from '../../components/forms/select';

export default async (properties) => {
  const workspacePanel = new Block({
    className: 'tab-panel tab-panel-workspace',
  });

  const form = new Block({
    className: 'properties-form',
  });
  workspacePanel.append(form);

  const { doUpdate } = properties;

  const titleInput = input({
    id: 'title',
    label: 'Title',
    value: properties.workspace.title,
  });
  form.append(titleInput);
  titleInput.onInput(() => {
    properties.workspace.title = titleInput.value;
    doUpdate();
  });

  const themeSelect = select({
    id: 'theme',
    label: 'Theme',
    value: properties.workspace.theme,
    options: await window.designs.getDropdown(),
  });
  form.append(themeSelect);
  themeSelect.onInput(() => {
    properties.workspace.theme = themeSelect.value;
    doUpdate();
  });

  properties.eventTarget.addEventListener('sync-workspace', () => {
    titleInput.value = properties.workspace.title;
    themeSelect.value = properties.workspace.theme ?? '';
  });

  return workspacePanel;
}
