import titlebar from '@components/titlebar';
import Block from '../../components/base/Block';
import './properties.scss';
import initWorkspaceProperties from './workspace';

let workspace = {};

const retrieveCurrentWorkspace = async () => await window.workspace.retrieve();

const initProperties = async (container) => {
  workspace = await retrieveCurrentWorkspace();

  const panelWorkspace = await initWorkspaceProperties();
  container.append(panelWorkspace);
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
