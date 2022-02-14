import Block from "../../components/base/Block";
import createPanelScreen, { setCurrentWorkspace } from "../../components/panels/panelscreen";
import "./render.scss";

export default () => {
  const container = new Block({
    className: 'sections',
  });

  const elements = createPanelScreen();

  container.append(elements.content);
  container.append(elements.preview);
  container.append(elements.style);

  window.globalEventHandler.on('sync-workspace', (workspace) => {
    setCurrentWorkspace(workspace, false, true);
  });

  return container.element;
}
