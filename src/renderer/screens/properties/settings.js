import Block from "../../components/base/Block";
import input from '../../components/forms/input';
import select from '../../components/forms/select';

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
  const config = await window.config.get();
  console.log(config);

  const settingsPanel = new Block({
    className: 'tab-panel tab-panel-settings',
  });

  const form = new Block({
    className: 'properties-form',
  });
  settingsPanel.append(form);

  const colorSchemeSelect = select({
    id: 'darkMode',
    label: 'Color scheme',
    value: config.darkMode,
    options: [
      { id: 'system', label: 'System' },
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark' },
    ]
  });
  settingsPanel.append(colorSchemeSelect);

  colorSchemeSelect.onInput(() => {
    window.config.setDarkMode(colorSchemeSelect.value);
  });

  const sizeOptions = {
    '800x600': '800x600',
    '1024x768': '1024x768',
    '1280x720': 'HD (1280x1080)',
    '1920x1080': 'Full HD (1920x1080)',
    '3840x2160': 'Ultra HD (3840x2160)',
    '4096x2160': '4k (4096x2160)',
    '7680x4320': '8k (7680x4320)',
    'custom': 'Custom',
  };

  const sizeSelect = select({
    id: 'size',
    label: 'Window size',
    value: sizeOptions[`${config.windowSize.width}x${config.windowSize.height}`] ? `${config.windowSize.width}x${config.windowSize.height}` : 'custom',
    options: Object.keys(sizeOptions).map((option) => ({
      id: option,
      label: sizeOptions[option],
    })),
  });
  settingsPanel.append(sizeSelect);

  function setWindowSizeOnEnter(event) {
    if (event.key.toLowerCase() === 'enter') {
      setWindowSize();
    }
  }

  function setWindowSize() {
    window.config.setWindowSize(widthInput.value, heightInput.value);
  }

  const widthInput = input({
    id: 'width',
    label: 'Width',
    value: config.windowSize.width,
    disabled: sizeSelect.value !== 'custom',
  });
  widthInput.onKeydown(setWindowSizeOnEnter);
  widthInput.onBlur(setWindowSize);

  const heightInput = input({
    id: 'height',
    label: 'Height',
    value: config.windowSize.height,
    disabled: sizeSelect.value !== 'custom',
  });
  heightInput.onKeydown(setWindowSizeOnEnter);
  heightInput.onBlur(setWindowSize);

  const sizeBlock = createRowCols({
    cols: [widthInput, heightInput],
  });
  settingsPanel.append(sizeBlock);

  sizeSelect.onInput(() => {
    if (sizeSelect.value === 'custom') {
      widthInput.disabled = false;
      heightInput.disabled = false;
    } else {
      widthInput.disabled = true;
      heightInput.disabled = true;
      const [ newWidth, newHeight ] = sizeSelect.value.split('x').map((val) => +val);
      widthInput.value = newWidth;
      heightInput.value = newHeight;
      setWindowSize();
    }
  });

  function syncWindowSize(width, height, isCustom = false) {
    if ((sizeOptions[`${width}x${height}`] ?? null) && !isCustom) {
      sizeSelect.value = `${width}x${height}`;
      widthInput.disabled = true;
      heightInput.disabled = true;
    } else {
      sizeSelect.value = 'custom';
      widthInput.disabled = false;
      heightInput.disabled = false;
      widthInput.value = width;
      heightInput.value = height;
    }
  }

  const { windowSize } = config;

  syncWindowSize(windowSize.width, windowSize.height);

  window.globalEventHandler.on('window-resized', ({ width, height }) => {
    syncWindowSize(width, height, true);
  });

  return settingsPanel;
}
