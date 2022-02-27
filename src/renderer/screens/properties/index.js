import { debounce } from "throttle-debounce";
import titlebar from '@components/titlebar';
import { storeWorkspace } from "../../components/panels/panelscreen";
import Block from '../../components/base/Block';
import Button from '../../components/base/Button';
import './properties.scss';
import initWorkspaceProperties from './workspace';
import initRosterProperties from './roster';

const properties = {
  workspace: {},
  eventTarget: new EventTarget(),
  doUpdate: debounce(250, () => {
    storeWorkspace(properties.workspace);
  }),
  temporaryRoster: {},
};

const retrieveCurrentWorkspace = async () => await window.workspace.retrieve();

const initProperties = async (container) => {
  properties.workspace = await retrieveCurrentWorkspace();

  const tabs = new Block({
    className: 'tabs',
  });
  container.append(tabs);

  const tabButtons = {
    workspace: 'Workspace',
    roster: 'Roster',
  };
  let currentTab = null;

  const tabContent = {
    workspace: await initWorkspaceProperties(properties),
    roster: await initRosterProperties(properties),
  };

  const tabPanels = new Block({
    className: 'tab-panel-container',
  });
  container.append(tabPanels);
  tabPanels.switch = (panel) => {
    tabPanels.empty();
    tabPanels.append(tabContent[panel]);
    if (currentTab) {
      tabButtons[currentTab].element.classList.remove('active');
    }
    currentTab = panel;
    tabButtons[panel].element.classList.add('active');
  };

  Object.keys(tabButtons).forEach((id) => {
    const label = tabButtons[id];
    const btn = new Button({
      className: 'tab',
      textContent: label,
    });
    tabButtons[id] = btn;

    btn.on('click', () => {
      tabPanels.switch(id);
    });

    tabs.append(btn);
  });

  tabPanels.switch('workspace');;
};

export default () => {
  window.globalEventHandler.on('sync-workspace', (newWorkspace) => {
    properties.workspace = newWorkspace;
    properties.eventTarget.dispatchEvent(new Event('sync-workspace'));
  });

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
