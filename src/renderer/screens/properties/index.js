import { debounce } from "throttle-debounce";
import titlebar from '@components/titlebar';
import { storeWorkspace } from "../../components/panels/panelscreen";
import Block from '../../components/base/Block';
import Button from '../../components/base/Button';
import './properties.scss';
import initWorkspaceProperties from './workspace';
import initRosterProperties from './roster';
import initEntityProperties from './entity';
import initExporterProperties from './exporter';
import initSettingsProperties from './settings';

const properties = {
  workspace: {},
  eventTarget: new EventTarget(),
  doUpdate: debounce(250, () => {
    storeWorkspace(properties.workspace);
  }),
  temporaryRoster: {},
  currentEntity: null,
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
    entity: '',
    exporter: 'Export',
    settings: 'Settings',
  };
  const entityTypes = {
    characters: 'Character',
    stages: 'Stage',
    items: 'Item',
  };
  let currentTab = null;
  let lastTab = null;

  const tabContent = {
    workspace: await initWorkspaceProperties(properties),
    roster: await initRosterProperties(properties),
    entity: await initEntityProperties(properties),
    exporter: await initExporterProperties(properties),
    settings: await initSettingsProperties(properties),
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
    if (panel === 'entity') {
      if (currentTab !== 'entity') {
        lastTab = currentTab;
      }
    } else {
      lastTab = null;
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

    if (label) {
      tabs.append(btn);
    }
  });

  tabPanels.switch('workspace');

  window.globalEventHandler.on('set-selection', (index) => {
    const currentRoster = properties.workspace.rosters[properties.workspace.displayRoster];
    if (index > -1 && currentRoster.roster[index] !== null) {
      properties.eventTarget.dispatchEvent(new CustomEvent('sync-entity', {
        detail: index,
      }));
      const type = currentRoster.type;
      tabButtons.entity.prop('textContent', entityTypes[type]);
      tabButtons.exporter.insertBefore(tabButtons.entity);
      tabPanels.switch('entity');
    } else {
      tabButtons.entity.detach();
      if (currentTab === 'entity') {
        if (lastTab === 'entity') {
          lastTab = null;
        }
        tabPanels.switch(lastTab ?? 'workspace');
      }
    }
  });

  window.globalEventHandler.on('darkmode-switched', () => {
    properties.eventTarget.dispatchEvent(new Event('darkmode-switched'));
  });
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
