import titlebar from '@components/titlebar';
import { debounce } from 'throttle-debounce';
import Block from '../../components/base/Block';
import input from '../../components/forms/input';
import select from '../../components/forms/select';
import { storeWorkspace } from '../../components/panels/panelscreen';
import './properties.scss';

let workspace = {};

const retrieveCurrentWorkspace = async () => await window.workspace.retrieve();

const initProperties = async (container) => {
  workspace = await retrieveCurrentWorkspace();

  const form = new Block({
    className: 'properties-form',
  });
  container.append(form);

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
};

export default () => {
  const container = new Block({
    className: 'sections',
  });

  const title = titlebar({
    title: 'Properties',
    closable: false,
    minimizable: false,
  });
  container.append(title);

  initProperties(container);

  return container.element;
}
