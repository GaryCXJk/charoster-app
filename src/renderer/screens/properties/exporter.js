import Block from "../../components/base/Block";
import Button from "../../components/base/Button";
import input from "../../components/forms/input";
import select from "../../components/forms/select";
import switchEl from "../../components/forms/switch";

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

export default async () => {
  const options = {
    size: {
      width: 1920,
      height: 1080,
    },
    includeCredits: false,
  };

  const exporterPanel = new Block({
    className: 'tab-panel tab-panel-exporter',
  });

  const sizeOptions = {
    '1920x1080': 'Full HD (1920x1080)',
    '3840x2160': 'Ultra HD (3840x2160)',
    '4096x2160': '4k (4096x2160)',
    '7680x4320': '8k (7680x4320)',
    'custom': 'Custom',
  };

  const sizeSelect = select({
    id: 'size',
    label: 'Size',
    value: sizeOptions[`${options.size.width}x${options.size.height}`] ?? 'custom',
    options: Object.keys(sizeOptions).map((option) => ({
      id: option,
      label: sizeOptions[option],
    })),
  });
  exporterPanel.append(sizeSelect);

  const widthInput = input({
    id: 'width',
    label: 'Width',
    value: options.size.width ?? 1920,
    disabled: sizeSelect.value !== 'custom',
  });
  widthInput.onInput(() => {
    options.size.width = +widthInput.value;
  });

  const heightInput = input({
    id: 'height',
    label: 'Height',
    value: options.size.height ?? 1080,
    disabled: sizeSelect.value !== 'custom',
  });
  heightInput.onInput(() => {
    options.size.height = +heightInput.value;
  });

  const sizeBlock = createRowCols({
    label: 'Size',
    cols: [widthInput, heightInput],
  });
  exporterPanel.append(sizeBlock);

  sizeSelect.onInput(() => {
    if (sizeSelect.value === 'custom') {
      widthInput.disabled = false;
      heightInput.disabled = false;
    } else {
      widthInput.disabled = true;
      heightInput.disabled = true;
      const [ newWidth, newHeight ] = sizeSelect.value.split('x').map((val) => +val);
      options.size.width = newWidth;
      options.size.height = newHeight;
      widthInput.value = newWidth;
      heightInput.value = newHeight;
    }
  });

  const creditsBlock = new Block({
    className: 'row',
  });
  exporterPanel.append(creditsBlock);

  const creditsToggleCol = new Block();
  creditsBlock.append(creditsToggleCol);

  const creditsColumnCol = new Block({
    className: 'col',
  });
  creditsBlock.append(creditsColumnCol);

  const creditsColumns = input({
    id: 'credits-column',
    label: 'Columns',
    type: 'number',
    value: options.creditsColumns ?? 3,
    disabled: !(options.includeCredits ?? false),
    inputProps: {
      min: 1,
    },
  });
  creditsColumnCol.append(creditsColumns);
  creditsColumns.on('input', () => {
    options.creditsColumns = +creditsColumns.value;
  });

  const includeCredits = switchEl({
    id: 'include-credits',
    label: 'Include credits',
    checked: options.includeCredits ?? false,
  });
  creditsToggleCol.append(includeCredits);
  includeCredits.on('input', () => {
    options.includeCredits = includeCredits.checked;
    creditsColumns.disabled = !includeCredits.checked;
  });

  const btnGroup = new Block({
    className: 'form-element button-group',
  });
  exporterPanel.append(btnGroup);

  const exportButton = new Button({
    textContent: 'Export',
  });

  btnGroup.append(exportButton);

  exportButton.on('click', async () => {
    await window.workspace.exportImage(options);
  });

  return exporterPanel;
};
