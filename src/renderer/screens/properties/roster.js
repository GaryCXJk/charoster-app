import Block from "../../components/base/Block";
import input from "../../components/forms/input";
import select from "../../components/forms/select";

const getCurrentRoster = (properties) => properties.workspace.rosters[properties.workspace.displayRoster];

const createRowCols = ({
  label,
  cols,
}) => {
  const block = new Block();

  const blockLabel = new Block({
    className: 'form-sublabel',
    textContent: label,
  });
  block.append(blockLabel);

  const blockRow = new Block({
    className: 'row',
  });
  block.append(blockRow);

  cols.forEach((col) => {
    const blockCol = new Block({
      className: 'col',
    });
    blockRow.append(blockCol);

    blockCol.append(col);
  })

  return block;
};

export default async (properties) => {
  let currentRoster = getCurrentRoster(properties);
  const { doUpdate } = properties;

  const rosterPanel = new Block({
    className: 'tab-panel tab-panel-roster',
  });

  const typeSelect = select({
    id: 'type',
    label: 'Type',
    value: currentRoster.type,
    options: [
      { id: 'characters', label: 'Characters' },
      { id: 'stages', label: 'Stages' },
      { id: 'items', label: 'Items' },
    ],
  });
  rosterPanel.append(typeSelect);
  typeSelect.onInput(() => {
    properties.temporaryRoster[properties.workspace.displayRoster] = properties.temporaryRoster[properties.workspace.displayRoster] ?? {};
    properties.temporaryRoster[properties.workspace.displayRoster][currentRoster.type] = currentRoster.roster;
    currentRoster.type = typeSelect.value;
    currentRoster.roster = properties.temporaryRoster[properties.workspace.displayRoster][typeSelect.value] ?? [];
    doUpdate();
  });

  const typeDescription = new Block({
    element: 'p',
    className: 'small',
    textContent: 'Switching the type will remove all entities from the roster. They will be stored in a temporary place until you switch workspaces.',
  });
  rosterPanel.append(typeDescription);

  const modeSelect = select({
    id: 'mode',
    label: 'Roster mode',
    value: currentRoster.mode,
    options: [
      { id: 'dynamic', label: 'Dynamic' },
    ],
  });
  rosterPanel.append(modeSelect);
  typeSelect.onInput(() => {
    currentRoster.mode = modeSelect.value;
    doUpdate();
  });

  const widthInput = input({
    id: 'width',
    label: 'Width',
    value: currentRoster.width ?? 8,
  });
  widthInput.onInput(() => {
    currentRoster.width = widthInput.value;
    doUpdate();
  });

  const heightInput = input({
    id: 'height',
    label: 'Height',
    value: currentRoster.height ?? 5,
  });
  heightInput.onInput(() => {
    currentRoster.height = heightInput.value;
    doUpdate();
  });

  const sizeBlock = createRowCols({
    label: 'Size',
    cols: [widthInput, heightInput],
  });
  rosterPanel.append(sizeBlock);

  const horizontalSelect = select({
    id: 'align-horizontal',
    label: 'Horizontal',
    value: currentRoster.alignment?.horizontal ?? 'center',
    options: [
      { id: 'left', label: 'Left' },
      { id: 'center', label: 'Center' },
      { id: 'right', label: 'Right' },
    ],
  });
  horizontalSelect.onInput(() => {
    currentRoster.alignment = currentRoster.alignment ?? {};
    currentRoster.alignment.horizontal = horizontalSelect.value;
    doUpdate();
  });

  const verticalSelect = select({
    id: 'align-vertical',
    label: 'Vertical',
    value: currentRoster.alignment?.vertical ?? 'center',
    options: [
      { id: 'top', label: 'Top' },
      { id: 'center', label: 'Center' },
      { id: 'bottom', label: 'Bottom' },
    ],
  });
  verticalSelect.onInput(() => {
    currentRoster.alignment = currentRoster.alignment ?? {};
    currentRoster.alignment.vertical = verticalSelect.value;
    doUpdate();
  });

  const alignmentBlock = createRowCols({
    label: 'Alignment',
    cols: [horizontalSelect, verticalSelect],
  });
  rosterPanel.append(alignmentBlock);

  properties.eventTarget.addEventListener('sync-workspace', () => {
    currentRoster = getCurrentRoster(properties);

    typeSelect.value = currentRoster.type;
    modeSelect.value = currentRoster.mode;
    widthInput.value = currentRoster.width;
    heightInput.value = currentRoster.height;
    horizontalSelect.value = currentRoster.alignment?.horizontal;
    verticalSelect.value = currentRoster.alignment?.vertical;
  });

  return rosterPanel;
};
