import Block from './base/Block';
import Button from './base/Button';
import './titlebar.scss';
import mdiMinimize from '@material-design-icons/svg/two-tone/minimize.svg';
import mdiClose from '@material-design-icons/svg/two-tone/close.svg';
import mdi from '../../helpers/mdi';

export default (options = {}) => {
  const {
    title = 'ChaRoster',
    hasIcon = false,
    buttons = [],
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

  buttons.forEach((button) => {
    if (button === 'divider') {
      const divider = new Block({
        element: 'span',
        className: 'divider',
      });
      titlebar.append(divider);
    } else {
      const {
        on = {},
        content = null,
      } = button;
      const btn = new Button({
        on,
      });
      btn.append(content);
      titlebar.append(btn);
    }
  });

  if (minimizable) {
    const minBtn = new Button({
      on: {
        click: () => {
          window.curWin.minimize();
        },
      }
    });
    minBtn.append(mdi(mdiMinimize));
    titlebar.append(minBtn);
  }

  if (closable) {
    const closeBtn = new Button({
      on: {
        click: () => {
          window.curWin.close();
        },
      },
    });
    closeBtn.append(mdi(mdiClose));
    titlebar.append(closeBtn);
  }

  function toggleVisibility() {
    titlebar.element.style.display = titlebar.element.style.display === 'none' ? null : 'none';
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' && e.ctrlKey) {
      toggleVisibility();
    }
  });

  return titlebar;
};
