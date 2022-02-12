import Block from './base/Block';
import Button from './base/Button';
import './titlebar.scss';

export default (options = {}) => {
  const {
    title = 'ChaRoster',
    hasIcon = false,
    minimizable = true,
    closable = true,
  } = options;

  const titlebar = new Block({
    className: 'titlebar',
  });

  const dragHandle = new Block({
    className: 'handle',
  });
  titlebar.append(dragHandle);

  if (hasIcon) {
    const icon = new Block({
      className: 'icon',
    });
    dragHandle.append(icon);
  }

  const label = new Block({
    element: 'h1',
    className: 'label',
    textContent: title,
  });
  dragHandle.append(label);

  if (minimizable) {
    const minBtn = new Button({
      innerHTML: '_',
      on: {
        click: () => {
          window.curWin.minimize();
        },
      }
    });
    titlebar.append(minBtn);
  }

  if (closable) {
    const closeBtn = new Button({
      innerHTML: '&times;',
      on: {
        click: () => {
          window.curWin.close();
        },
      },
    });
    titlebar.append(closeBtn);
  }

  return titlebar;
};
