import mdi from "../../../helpers/mdi";
import Block from "../../components/base/Block";
import Button from "../../components/base/Button";
import input from "../../components/forms/input";
import select from "../../components/forms/select";
import mdiAdd from '@material-design-icons/svg/two-tone/add.svg';
import mdiRemove from '@material-design-icons/svg/two-tone/remove.svg';

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

  const rosterSelect = select({
    id: 'roster',
    label: 'Roster',
    options: properties.workspace.rosters.map((roster, index) => {
      return {
        id: index,
        label: roster.name ?? `Roster ${index + 1}`,
      }
    }),
  });
  rosterPanel.append(rosterSelect);
  rosterSelect.value = properties.workspace.displayRoster;

  const btnGroup = new Block({
    className: 'button-group',
  });
  rosterSelect.append(btnGroup);

  const addBtn = new Button();
  addBtn.append(mdi(mdiAdd));

  const rmvBtn = new Button();
  rmvBtn.append(mdi(mdiRemove));
  if (properties.workspace.rosters.length <= 1) {
    rmvBtn.prop('disabled', true);
  }

  btnGroup.append(addBtn);
  btnGroup.append(rmvBtn);

  const nameInput = input({
    id: 'name',
    label: 'Name',
    value: currentRoster.name ?? '',
  });
  rosterPanel.append(nameInput);
  nameInput.onInput(() => {
    currentRoster.name = nameInput.value;
    rosterSelect.element.querySelector(`option[value="${properties.workspace.displayRoster}"]`).textContent = currentRoster.name ?? `Roster ${properties.workspace.displayRoster + 1}`;
    doUpdate();
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

  const resetRosterProperties = (resetRosterSelect = true) => {
    if (resetRosterSelect) {
      rosterSelect.setOptions(properties.workspace.rosters.map((roster, index) => {
        return {
          id: index,
          label: roster.name ?? `Roster ${index + 1}`,
        }
      }));
    }

    rosterSelect.value = properties.workspace.displayRoster;
    rmvBtn.prop('disabled', properties.workspace.rosters.length <= 1);

    currentRoster = getCurrentRoster(properties);

    nameInput.value = currentRoster.name ?? '';
    typeSelect.value = currentRoster.type;
    modeSelect.value = currentRoster.mode;
    widthInput.value = currentRoster.width;
    heightInput.value = currentRoster.height;
    horizontalSelect.value = currentRoster.alignment?.horizontal;
    verticalSelect.value = currentRoster.alignment?.vertical;
  };

  properties.eventTarget.addEventListener('sync-workspace', resetRosterProperties);

  addBtn.on('click', () => {
    properties.workspace.displayRoster = properties.workspace.rosters.length;
    properties.workspace.rosters.push({
      type: 'characters',
      mode: 'dynamic',
      width: 8,
      height: 5,
      alignment: {
        horizontal: 'center',
        vertical: 'center',
      },
      roster: [],
      meta: {
        rowColRatio: [3, 8],
      },
    });
    resetRosterProperties();
    doUpdate();
  });

  rmvBtn.on('click', () => {
    properties.workspace.rosters.splice(properties.workspace.displayRoster, 1);
    properties.workspace.displayRoster = Math.max(0, properties.workspace.displayRoster - 1);
    resetRosterProperties();
    doUpdate();
  });

  rosterSelect.onInput(() => {
    properties.workspace.displayRoster = rosterSelect.value;
    resetRosterProperties(false);
    doUpdate();
  });

  return rosterPanel;
};
